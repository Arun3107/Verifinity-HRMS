create or replace function public.enforce_leave_request_date_rules()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  if coalesce(new.is_half_day, false) then
    new.half_day_date := new.start_date;
  else
    new.half_day_date := null;
  end if;

  return new;
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
  v_date_of_joining date;
begin
  select leave_types.deducts_balance
  into v_deducts_balance
  from public.leave_types
  where leave_types.id = p_leave_type_id
    and leave_types.is_active = true;

  if not found then
    raise exception 'Selected leave type is not active.';
  end if;

  select profiles.date_of_joining
  into v_date_of_joining
  from public.profiles
  where profiles.id = p_employee_id;

  if v_date_of_joining is not null and p_start_date < v_date_of_joining then
    raise exception 'Leave cannot be submitted before the employee joining date.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_employee_id::text, 0));

  v_calculated_days := public.calculate_working_leave_days(
    p_start_date,
    p_end_date,
    p_is_half_day,
    p_half_day_date
  );
  v_leave_year := public.leave_year_for_date(p_start_date);

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
      and leave_types.deducts_balance = true
      and public.leave_year_for_date(leave_requests.start_date) = v_leave_year;

    if v_calculated_days
      > greatest(coalesce(v_available_balance, 0) - v_reserved_days, 0)
    then
      raise exception 'Insufficient available leave after pending requests are reserved.';
    end if;
  end if;

  return v_calculated_days;
end;
$function$;

drop trigger if exists preserve_closed_leave_balance_rows
on public.leave_balances;
