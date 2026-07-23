create or replace function public.leave_actor_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $function$
  select profiles.id
  from public.profiles
  where profiles.auth_user_id = auth.uid()
  limit 1;
$function$;

revoke all on function public.leave_actor_profile_id() from public;
grant execute on function public.leave_actor_profile_id() to authenticated;

drop policy if exists profiles_select_direct_reports
on public.profiles;

create policy profiles_select_direct_reports
on public.profiles
for select
to authenticated
using (manager_id = public.leave_actor_profile_id());

drop policy if exists leave_requests_select_self_manager_admin
on public.leave_requests;

create policy leave_requests_select_self_manager_admin
on public.leave_requests
for select
to authenticated
using (
  employee_id = public.leave_actor_profile_id()
  or public.is_admin_like()
  or exists (
    select 1
    from public.profiles as employee_profile
    where employee_profile.id = leave_requests.employee_id
      and employee_profile.manager_id = public.leave_actor_profile_id()
  )
);
