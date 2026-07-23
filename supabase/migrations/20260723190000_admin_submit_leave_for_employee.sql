alter table public.leave_requests
add column if not exists submitted_by uuid references public.profiles(id);

alter table public.leave_requests
add column if not exists submitted_on_behalf boolean not null default false;

create index if not exists leave_requests_submitted_by_idx
on public.leave_requests(submitted_by);

create or replace function public.set_leave_request_submission_context()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if new.submitted_by is null then
    new.submitted_by := new.employee_id;
  end if;

  new.submitted_on_behalf := new.submitted_by is distinct from new.employee_id;

  if new.manager_id is null then
    select profiles.manager_id
    into new.manager_id
    from public.profiles
    where profiles.id = new.employee_id;
  end if;

  return new;
end;
$function$;

drop trigger if exists set_leave_request_submission_context
on public.leave_requests;

create trigger set_leave_request_submission_context
before insert on public.leave_requests
for each row execute function public.set_leave_request_submission_context();

create or replace function public.submit_leave_request_for_employee(
  p_employee_id uuid,
  p_leave_type_id uuid,
  p_start_date date,
  p_end_date date,
  p_is_half_day boolean,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_actor_id uuid;
  v_actor_role text;
  v_employee_manager_id uuid;
  v_calculated_days numeric;
  v_request public.leave_requests%rowtype;
begin
  select profiles.id, profiles.role
  into v_actor_id, v_actor_role
  from public.profiles
  where profiles.auth_user_id = auth.uid()
    and profiles.is_active = true
  limit 1;

  if v_actor_id is null or v_actor_role <> 'admin' then
    raise exception 'Admin access is required to submit leave for an employee.';
  end if;

  select profiles.manager_id
  into v_employee_manager_id
  from public.profiles
  where profiles.id = p_employee_id
    and profiles.is_active = true;

  if not found then
    raise exception 'An active employee must be selected.';
  end if;

  if nullif(trim(p_reason), '') is null then
    raise exception 'A leave reason is required.';
  end if;

  v_calculated_days := public.validate_employee_leave_request(
    p_employee_id,
    p_leave_type_id,
    p_start_date,
    p_end_date,
    coalesce(p_is_half_day, false),
    case when p_is_half_day then p_start_date else null end,
    null
  );

  insert into public.leave_requests (
    employee_id,
    manager_id,
    leave_type_id,
    start_date,
    end_date,
    is_half_day,
    half_day_date,
    calculated_days,
    reason,
    status,
    submitted_by,
    submitted_on_behalf,
    updated_at
  )
  values (
    p_employee_id,
    v_employee_manager_id,
    p_leave_type_id,
    p_start_date,
    p_end_date,
    coalesce(p_is_half_day, false),
    case when p_is_half_day then p_start_date else null end,
    v_calculated_days,
    trim(p_reason),
    'pending_manager',
    v_actor_id,
    true,
    now()
  )
  returning * into v_request;

  return to_jsonb(v_request);
end;
$function$;

revoke all on function public.submit_leave_request_for_employee(
  uuid,
  uuid,
  date,
  date,
  boolean,
  text
) from public;

grant execute on function public.submit_leave_request_for_employee(
  uuid,
  uuid,
  date,
  date,
  boolean,
  text
) to authenticated;
