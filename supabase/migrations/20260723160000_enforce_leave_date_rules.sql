create or replace function public.enforce_leave_request_date_rules()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  if new.start_date < current_date or new.end_date < current_date then
    raise exception 'Past dates are not allowed for new or edited leave requests.';
  end if;

  if coalesce(new.is_half_day, false) then
    new.half_day_date := new.start_date;
  else
    new.half_day_date := null;
  end if;

  return new;
end;
$function$;

drop trigger if exists enforce_leave_request_date_rules
on public.leave_requests;

create trigger enforce_leave_request_date_rules
before insert or update of start_date, end_date, is_half_day, half_day_date
on public.leave_requests
for each row execute function public.enforce_leave_request_date_rules();
