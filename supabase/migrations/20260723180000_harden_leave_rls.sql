revoke all privileges
on table public.leave_adjustments, public.leave_balances, public.leave_settings
from anon;

revoke insert, update, delete
on table public.leave_adjustments, public.leave_balances, public.leave_settings
from authenticated;

revoke insert, update, delete
on table public.leave_requests
from anon, authenticated;

drop policy if exists leave_adjustments_manage_hr_admin
on public.leave_adjustments;

drop policy if exists leave_balances_manage_hr_admin
on public.leave_balances;

drop policy if exists leave_settings_manage_hr_admin
on public.leave_settings;

create index if not exists profiles_manager_id_idx
on public.profiles(manager_id);

drop policy if exists profiles_select_direct_reports
on public.profiles;

create policy profiles_select_direct_reports
on public.profiles
for select
to authenticated
using (manager_id = public.my_profile_id());

drop policy if exists leave_requests_select_self_manager_admin
on public.leave_requests;

create policy leave_requests_select_self_manager_admin
on public.leave_requests
for select
to authenticated
using (
  employee_id = public.my_profile_id()
  or public.is_admin_like()
  or exists (
    select 1
    from public.profiles as employee_profile
    where employee_profile.id = leave_requests.employee_id
      and employee_profile.manager_id = public.my_profile_id()
  )
);
