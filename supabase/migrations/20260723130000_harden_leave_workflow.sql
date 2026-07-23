create or replace function public.leave_year_for_date(p_date date)
returns integer
language sql
immutable
strict
as $function$
  select case
    when extract(month from p_date)::integer <= 3
      then extract(year from p_date)::integer - 1
    else extract(year from p_date)::integer
  end;
$function$;

create or replace function public.calculate_working_leave_days(
  p_start_date date,
  p_end_date date,
  p_is_half_day boolean default false,
  p_half_day_date date default null
)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $function$
declare
  v_days numeric;
begin
  if p_start_date is null or p_end_date is null or p_end_date < p_start_date then
    raise exception 'A valid leave date range is required.';
  end if;

  if public.leave_year_for_date(p_start_date)
    <> public.leave_year_for_date(p_end_date)
  then
    raise exception 'Leave cannot span March 31. Submit separate requests for each leave year.';
  end if;

  select count(*)::numeric
  into v_days
  from generate_series(p_start_date, p_end_date, interval '1 day') as dates(day)
  where extract(isodow from dates.day) < 6
    and not exists (
      select 1
      from public.holiday_calendar
      where holiday_calendar.holiday_date = dates.day::date
        and holiday_calendar.is_active = true
    );

  if coalesce(p_is_half_day, false) then
    if p_half_day_date is null
      or p_half_day_date < p_start_date
      or p_half_day_date > p_end_date
      or extract(isodow from p_half_day_date) >= 6
      or exists (
        select 1
        from public.holiday_calendar
        where holiday_calendar.holiday_date = p_half_day_date
          and holiday_calendar.is_active = true
      )
    then
      raise exception 'Half-day date must be a working day within the leave period.';
    end if;

    v_days := greatest(v_days - 0.5, 0);
  end if;

  if v_days <= 0 then
    raise exception 'Selected dates do not contain a working leave day.';
  end if;

  return v_days;
end;
$function$;

create or replace function public.validate_employee_leave_request(
  p_employee_id uuid,
  p_leave_type_id uuid,
  p_start_date date,
  p_end_date date,
  p_is_half_day boolean,
  p_half_day_date date,
  p_exclude_request_id uuid default null
)
returns numeric
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_calculated_days numeric;
  v_deducts_balance boolean;
  v_available_balance numeric;
  v_reserved_days numeric;
  v_leave_year integer;
begin
  select leave_types.deducts_balance
  into v_deducts_balance
  from public.leave_types
  where leave_types.id = p_leave_type_id
    and leave_types.is_active = true;

  if not found then
    raise exception 'Selected leave type is not active.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_employee_id::text, 0));

  v_calculated_days := public.calculate_working_leave_days(
    p_start_date,
    p_end_date,
    p_is_half_day,
    p_half_day_date
  );
  v_leave_year := public.leave_year_for_date(p_start_date);

  if v_leave_year <> public.leave_year_for_date(current_date) then
    raise exception 'Leave requests can only be submitted for the current leave year.';
  end if;

  if exists (
    select 1
    from public.leave_requests
    where leave_requests.employee_id = p_employee_id
      and leave_requests.status in ('pending_manager', 'pending_hr', 'approved')
      and leave_requests.id is distinct from p_exclude_request_id
      and p_start_date <= leave_requests.end_date
      and p_end_date >= leave_requests.start_date
  ) then
    raise exception 'The selected dates overlap an existing leave request.';
  end if;

  if coalesce(v_deducts_balance, false) then
    perform public.sync_leave_balances_from_policy(p_employee_id);

    select leave_balances.available_balance
    into v_available_balance
    from public.leave_balances
    join public.leave_types
      on leave_types.id = leave_balances.leave_type_id
    where leave_balances.employee_id = p_employee_id
      and leave_balances.leave_year = v_leave_year
      and leave_types.code = 'paid_leave'
    limit 1;

    select coalesce(sum(leave_requests.calculated_days), 0)
    into v_reserved_days
    from public.leave_requests
    join public.leave_types
      on leave_types.id = leave_requests.leave_type_id
    where leave_requests.employee_id = p_employee_id
      and leave_requests.status in ('pending_manager', 'pending_hr')
      and leave_requests.id is distinct from p_exclude_request_id
      and leave_types.deducts_balance = true;

    if v_calculated_days
      > greatest(coalesce(v_available_balance, 0) - v_reserved_days, 0)
    then
      raise exception 'Insufficient available leave after pending requests are reserved.';
    end if;
  end if;

  return v_calculated_days;
end;
$function$;

create or replace function public.submit_leave_request(
  p_leave_type_id uuid,
  p_start_date date,
  p_end_date date,
  p_is_half_day boolean,
  p_half_day_date date,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_employee_id uuid;
  v_calculated_days numeric;
  v_request public.leave_requests%rowtype;
begin
  select profiles.id
  into v_employee_id
  from public.profiles
  where profiles.auth_user_id = auth.uid()
    and profiles.is_active = true
  limit 1;

  if v_employee_id is null then
    raise exception 'No active employee profile is linked to this login.';
  end if;

  if nullif(trim(p_reason), '') is null then
    raise exception 'A leave reason is required.';
  end if;

  v_calculated_days := public.validate_employee_leave_request(
    v_employee_id,
    p_leave_type_id,
    p_start_date,
    p_end_date,
    p_is_half_day,
    p_half_day_date,
    null
  );

  insert into public.leave_requests (
    employee_id,
    leave_type_id,
    start_date,
    end_date,
    is_half_day,
    half_day_date,
    calculated_days,
    reason,
    status,
    updated_at
  )
  values (
    v_employee_id,
    p_leave_type_id,
    p_start_date,
    p_end_date,
    coalesce(p_is_half_day, false),
    case when p_is_half_day then p_half_day_date else null end,
    v_calculated_days,
    trim(p_reason),
    'pending_manager',
    now()
  )
  returning * into v_request;

  return to_jsonb(v_request);
end;
$function$;

create or replace function public.update_own_leave_request(
  p_request_id uuid,
  p_leave_type_id uuid,
  p_start_date date,
  p_end_date date,
  p_is_half_day boolean,
  p_half_day_date date,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_employee_id uuid;
  v_calculated_days numeric;
  v_request public.leave_requests%rowtype;
begin
  select profiles.id
  into v_employee_id
  from public.profiles
  where profiles.auth_user_id = auth.uid()
  limit 1;

  select *
  into v_request
  from public.leave_requests
  where leave_requests.id = p_request_id
    and leave_requests.employee_id = v_employee_id
    and leave_requests.status = 'pending_manager'
  for update;

  if not found then
    raise exception 'Only your pending leave request can be edited.';
  end if;

  if nullif(trim(p_reason), '') is null then
    raise exception 'A leave reason is required.';
  end if;

  v_calculated_days := public.validate_employee_leave_request(
    v_employee_id,
    p_leave_type_id,
    p_start_date,
    p_end_date,
    p_is_half_day,
    p_half_day_date,
    p_request_id
  );

  update public.leave_requests
  set
    leave_type_id = p_leave_type_id,
    start_date = p_start_date,
    end_date = p_end_date,
    is_half_day = coalesce(p_is_half_day, false),
    half_day_date = case when p_is_half_day then p_half_day_date else null end,
    calculated_days = v_calculated_days,
    reason = trim(p_reason),
    updated_at = now()
  where leave_requests.id = p_request_id
  returning * into v_request;

  return to_jsonb(v_request);
end;
$function$;

create or replace function public.cancel_own_leave_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_employee_id uuid;
  v_request public.leave_requests%rowtype;
begin
  select profiles.id
  into v_employee_id
  from public.profiles
  where profiles.auth_user_id = auth.uid()
  limit 1;

  update public.leave_requests
  set status = 'cancelled', updated_at = now()
  where leave_requests.id = p_request_id
    and leave_requests.employee_id = v_employee_id
    and leave_requests.status = 'pending_manager'
  returning * into v_request;

  if not found then
    raise exception 'Only your pending leave request can be cancelled.';
  end if;

  return to_jsonb(v_request);
end;
$function$;

create or replace function public.manager_leave_action(
  p_request_id uuid,
  p_action text,
  p_comments text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_actor_id uuid;
  v_actor_role text;
  v_request public.leave_requests%rowtype;
  v_employee_manager_id uuid;
  v_deducts_balance boolean;
  v_available_balance numeric;
begin
  select profiles.id, profiles.role
  into v_actor_id, v_actor_role
  from public.profiles
  where profiles.auth_user_id = auth.uid()
    and profiles.is_active = true
  limit 1;

  if v_actor_id is null or v_actor_role not in ('manager', 'admin', 'hr') then
    raise exception 'Manager, HR, or admin access is required.';
  end if;

  select leave_requests.*
  into v_request
  from public.leave_requests
  where leave_requests.id = p_request_id
  for update;

  if not found then
    raise exception 'Leave request was not found.';
  end if;

  select profiles.manager_id
  into v_employee_manager_id
  from public.profiles
  where profiles.id = v_request.employee_id;

  if v_actor_role = 'manager'
    and v_employee_manager_id is distinct from v_actor_id
  then
    raise exception 'You can only act on leave requests from your direct reports.';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_request.employee_id::text, 0)
  );

  if p_action = 'approve' then
    if v_request.status not in ('pending_manager', 'pending_hr') then
      raise exception 'Only a pending leave request can be approved.';
    end if;

    select leave_types.deducts_balance
    into v_deducts_balance
    from public.leave_types
    where leave_types.id = v_request.leave_type_id;

    if coalesce(v_deducts_balance, false) then
      perform public.sync_leave_balances_from_policy(v_request.employee_id);

      select leave_balances.available_balance
      into v_available_balance
      from public.leave_balances
      join public.leave_types
        on leave_types.id = leave_balances.leave_type_id
      where leave_balances.employee_id = v_request.employee_id
        and leave_balances.leave_year =
          public.leave_year_for_date(v_request.start_date)
        and leave_types.code = 'paid_leave'
      limit 1;

      if v_request.calculated_days > coalesce(v_available_balance, 0) then
        raise exception 'The employee no longer has enough available leave.';
      end if;
    end if;

    update public.leave_requests
    set
      status = 'approved',
      manager_status = 'approved',
      manager_comments = nullif(trim(p_comments), ''),
      manager_action_at = now(),
      current_approval_level = 'completed',
      updated_at = now()
    where leave_requests.id = p_request_id
    returning * into v_request;
  elsif p_action = 'reject' then
    if v_request.status not in ('pending_manager', 'pending_hr') then
      raise exception 'Only a pending leave request can be rejected.';
    end if;

    if nullif(trim(p_comments), '') is null then
      raise exception 'A rejection reason is required.';
    end if;

    update public.leave_requests
    set
      status = 'rejected',
      manager_status = 'rejected',
      manager_comments = trim(p_comments),
      manager_action_at = now(),
      current_approval_level = 'completed',
      updated_at = now()
    where leave_requests.id = p_request_id
    returning * into v_request;
  elsif p_action = 'revoke' then
    if v_request.status <> 'approved' then
      raise exception 'Only an approved leave request can be revoked.';
    end if;

    if nullif(trim(p_comments), '') is null then
      raise exception 'A revocation reason is required.';
    end if;

    update public.leave_requests
    set
      status = 'cancelled',
      manager_status = 'rejected',
      manager_comments = concat('Revoked: ', trim(p_comments)),
      manager_action_at = now(),
      current_approval_level = 'completed',
      updated_at = now()
    where leave_requests.id = p_request_id
    returning * into v_request;
  else
    raise exception 'Unsupported manager leave action.';
  end if;

  return to_jsonb(v_request);
end;
$function$;

create or replace function public.sync_profile_leave_balance()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  perform public.sync_leave_balances_from_policy(new.id);
  return new;
end;
$function$;

drop trigger if exists sync_leave_balance_after_profile_change
on public.profiles;

create trigger sync_leave_balance_after_profile_change
after insert or update of date_of_joining, is_active on public.profiles
for each row execute function public.sync_profile_leave_balance();

create or replace function public.preserve_closed_leave_balance()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  if old.leave_year < public.leave_year_for_date(current_date) then
    return old;
  end if;

  return new;
end;
$function$;

drop trigger if exists preserve_closed_leave_balance_rows
on public.leave_balances;

create trigger preserve_closed_leave_balance_rows
before update on public.leave_balances
for each row execute function public.preserve_closed_leave_balance();

revoke all on function public.calculate_working_leave_days(date, date, boolean, date)
from public;
revoke all on function public.validate_employee_leave_request(
  uuid,
  uuid,
  date,
  date,
  boolean,
  date,
  uuid
) from public;

revoke all on function public.submit_leave_request(
  uuid,
  date,
  date,
  boolean,
  date,
  text
) from public;
grant execute on function public.submit_leave_request(
  uuid,
  date,
  date,
  boolean,
  date,
  text
) to authenticated;

revoke all on function public.update_own_leave_request(
  uuid,
  uuid,
  date,
  date,
  boolean,
  date,
  text
) from public;
grant execute on function public.update_own_leave_request(
  uuid,
  uuid,
  date,
  date,
  boolean,
  date,
  text
) to authenticated;

revoke all on function public.cancel_own_leave_request(uuid) from public;
grant execute on function public.cancel_own_leave_request(uuid) to authenticated;

revoke all on function public.manager_leave_action(uuid, text, text) from public;
grant execute on function public.manager_leave_action(uuid, text, text)
to authenticated;

revoke insert, update, delete on public.leave_requests from anon, authenticated;
