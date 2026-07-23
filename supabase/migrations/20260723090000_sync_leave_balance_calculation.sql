create or replace function public.sync_leave_balances_from_policy(
  p_employee_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_actor_id uuid;
  v_actor_role text;
  v_paid_leave_type_id uuid;
  v_paid_leave_per_year numeric;
  v_monthly_credit numeric;
  v_carry_forward_enabled boolean;
  v_max_carry_forward numeric;
  v_leave_year integer := case
    when extract(month from current_date)::integer <= 3
      then extract(year from current_date)::integer - 1
    else extract(year from current_date)::integer
  end;
  v_first_leave_year integer;
  v_calculation_year integer;
  v_period_start date;
  v_next_period_start date;
  v_accrual_start date;
  v_accrual_end date;
  v_opening_balance numeric;
  v_credited numeric;
  v_used numeric;
  v_adjusted numeric;
  v_available_balance numeric;
  v_eligible_months integer;
  v_affected_balances integer := 0;
  v_employee record;
begin
  if coalesce(auth.role(), '') not in ('', 'service_role') then
    select profiles.id, profiles.role
    into v_actor_id, v_actor_role
    from public.profiles
    where profiles.auth_user_id = auth.uid()
    limit 1;

    if v_actor_id is null then
      raise exception 'No employee profile is linked to this login.';
    end if;

    if p_employee_id is null then
      if v_actor_role not in ('admin', 'hr') then
        raise exception 'Only HR or admin can recalculate all leave balances.';
      end if;
    elsif p_employee_id <> v_actor_id
      and v_actor_role not in ('admin', 'hr')
      and not exists (
        select 1
        from public.profiles
        where profiles.id = p_employee_id
          and profiles.manager_id = v_actor_id
      )
    then
      raise exception 'You cannot recalculate this employee leave balance.';
    end if;
  end if;

  select leave_types.id
  into v_paid_leave_type_id
  from public.leave_types
  where leave_types.code = 'paid_leave'
    and leave_types.is_active = true
  limit 1;

  if v_paid_leave_type_id is null then
    raise exception 'Active paid_leave leave type is not configured.';
  end if;

  select
    leave_settings.paid_leave_per_year,
    leave_settings.monthly_credit,
    leave_settings.carry_forward_enabled,
    leave_settings.max_carry_forward
  into
    v_paid_leave_per_year,
    v_monthly_credit,
    v_carry_forward_enabled,
    v_max_carry_forward
  from public.leave_settings
  limit 1;

  if not found then
    raise exception 'Leave policy is not configured.';
  end if;

  v_paid_leave_per_year := greatest(coalesce(v_paid_leave_per_year, 0), 0);
  v_monthly_credit := greatest(
    coalesce(v_monthly_credit, v_paid_leave_per_year / 12),
    0
  );
  v_max_carry_forward := greatest(coalesce(v_max_carry_forward, 0), 0);

  for v_employee in
    select profiles.id, profiles.date_of_joining
    from public.profiles
    where (
      p_employee_id is not null
      and profiles.id = p_employee_id
    )
    or (
      p_employee_id is null
      and profiles.is_active = true
    )
  loop
    if v_employee.date_of_joining is null then
      v_first_leave_year := v_leave_year;
    elsif extract(month from v_employee.date_of_joining)::integer <= 3 then
      v_first_leave_year :=
        extract(year from v_employee.date_of_joining)::integer - 1;
    else
      v_first_leave_year :=
        extract(year from v_employee.date_of_joining)::integer;
    end if;

    v_first_leave_year := least(v_first_leave_year, v_leave_year);
    v_opening_balance := 0;

    for v_calculation_year in v_first_leave_year..v_leave_year
    loop
      v_period_start := make_date(v_calculation_year, 4, 1);
      v_next_period_start := make_date(v_calculation_year + 1, 4, 1);
      v_accrual_start := greatest(
        coalesce(v_employee.date_of_joining, v_period_start),
        v_period_start
      );
      v_accrual_end := least(current_date, v_next_period_start - 1);

      if v_employee.date_of_joining is null
        or v_employee.date_of_joining > current_date
        or v_accrual_start > v_accrual_end
      then
        v_eligible_months := 0;
      else
        v_eligible_months :=
          (
            extract(year from v_accrual_end)::integer
            - extract(year from v_accrual_start)::integer
          ) * 12
          + extract(month from v_accrual_end)::integer
          - extract(month from v_accrual_start)::integer
          + 1;
      end if;

      v_credited := round(
        least(
          greatest(v_eligible_months, 0) * v_monthly_credit,
          v_paid_leave_per_year
        ) * 2
      ) / 2;

      select coalesce(sum(leave_requests.calculated_days), 0)
      into v_used
      from public.leave_requests
      where leave_requests.employee_id = v_employee.id
        and leave_requests.leave_type_id = v_paid_leave_type_id
        and leave_requests.status = 'approved'
        and leave_requests.start_date >= v_period_start
        and leave_requests.start_date < v_next_period_start;

      select coalesce(sum(leave_adjustments.adjustment_days), 0)
      into v_adjusted
      from public.leave_adjustments
      where leave_adjustments.employee_id = v_employee.id
        and leave_adjustments.leave_type_id = v_paid_leave_type_id
        and leave_adjustments.created_at >= v_period_start
        and leave_adjustments.created_at < v_next_period_start;

      v_available_balance := greatest(
        v_opening_balance + v_credited + v_adjusted - v_used,
        0
      );

      update public.leave_balances
      set
        opening_balance = v_opening_balance,
        credited = v_credited,
        used = v_used,
        adjusted = v_adjusted,
        updated_at = now()
      where leave_balances.employee_id = v_employee.id
        and leave_balances.leave_type_id = v_paid_leave_type_id
        and leave_balances.leave_year = v_calculation_year;

      if not found then
        insert into public.leave_balances (
          employee_id,
          leave_type_id,
          leave_year,
          opening_balance,
          credited,
          used,
          adjusted
        )
        values (
          v_employee.id,
          v_paid_leave_type_id,
          v_calculation_year,
          v_opening_balance,
          v_credited,
          v_used,
          v_adjusted
        );
      end if;

      select leave_balances.available_balance
      into v_available_balance
      from public.leave_balances
      where leave_balances.employee_id = v_employee.id
        and leave_balances.leave_type_id = v_paid_leave_type_id
        and leave_balances.leave_year = v_calculation_year
      limit 1;

      v_affected_balances := v_affected_balances + 1;
      v_opening_balance := case
        when coalesce(v_carry_forward_enabled, false)
          then least(
            greatest(coalesce(v_available_balance, 0), 0),
            v_max_carry_forward
          )
        else 0
      end;
    end loop;
  end loop;

  return jsonb_build_object('affected_balances', v_affected_balances);
end;
$function$;

update public.leave_settings
set
  paid_leave_per_year = 18,
  monthly_credit = 1.5,
  carry_forward_enabled = true,
  max_carry_forward = 12;

revoke all on function public.sync_leave_balances_from_policy(uuid) from public;
grant execute on function public.sync_leave_balances_from_policy(uuid) to authenticated;
grant execute on function public.sync_leave_balances_from_policy(uuid) to service_role;

create or replace function public.sync_employee_leave_balance()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if tg_op = 'DELETE' then
    perform public.sync_leave_balances_from_policy(old.employee_id);
    return old;
  end if;

  if tg_op = 'UPDATE' and old.employee_id <> new.employee_id then
    perform public.sync_leave_balances_from_policy(old.employee_id);
  end if;

  perform public.sync_leave_balances_from_policy(new.employee_id);
  return new;
end;
$function$;

drop trigger if exists sync_leave_balance_after_request_change
on public.leave_requests;

create trigger sync_leave_balance_after_request_change
after insert or update or delete on public.leave_requests
for each row execute function public.sync_employee_leave_balance();

drop trigger if exists sync_leave_balance_after_adjustment_change
on public.leave_adjustments;

create trigger sync_leave_balance_after_adjustment_change
after insert or update or delete on public.leave_adjustments
for each row execute function public.sync_employee_leave_balance();

create or replace function public.sync_all_leave_balances()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  perform public.sync_leave_balances_from_policy(null);
  return null;
end;
$function$;

drop trigger if exists sync_leave_balances_after_policy_change
on public.leave_settings;

create trigger sync_leave_balances_after_policy_change
after insert or update on public.leave_settings
for each statement execute function public.sync_all_leave_balances();

select public.sync_leave_balances_from_policy(null);
