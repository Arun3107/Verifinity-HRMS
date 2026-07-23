alter table public.profiles
add column if not exists onboarding_submitted_at timestamptz;

alter table public.profiles
add column if not exists onboarding_reviewed_at timestamptz;

alter table public.profiles
add column if not exists onboarding_reviewed_by uuid references public.profiles(id);

alter table public.profiles
add column if not exists onboarding_review_comments text;

do $block$
declare
  v_constraint record;
begin
  for v_constraint in
    select pg_constraint.conname
    from pg_constraint
    join pg_class
      on pg_class.oid = pg_constraint.conrelid
    join pg_namespace
      on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'public'
      and pg_class.relname = 'profiles'
      and pg_constraint.contype = 'c'
      and pg_get_constraintdef(pg_constraint.oid) ilike '%onboarding_status%'
  loop
    execute format(
      'alter table public.profiles drop constraint %I',
      v_constraint.conname
    );
  end loop;
end;
$block$;

alter table public.profiles
add constraint profiles_onboarding_status_check
check (
  onboarding_status in (
    'pending',
    'invited',
    'submitted',
    'changes_requested',
    'approved',
    'rejected'
  )
);

alter table public.employee_documents
add column if not exists is_current boolean not null default true;

alter table public.employee_documents
add column if not exists replaced_at timestamptz;

update public.employee_documents
set document_type = case document_type
  when 'PAN Card' then 'pan_card'
  when 'Aadhaar Card' then 'aadhaar_card'
  when 'Cancelled Cheque' then 'cancelled_cheque'
  when 'UAN / PF Document' then 'uan_pf_document'
  else document_type
end
where document_type in (
  'PAN Card',
  'Aadhaar Card',
  'Cancelled Cheque',
  'UAN / PF Document'
);

with ranked_documents as (
  select
    employee_documents.id,
    row_number() over (
      partition by
        employee_documents.employee_id,
        employee_documents.document_type
      order by
        employee_documents.uploaded_at desc nulls last,
        employee_documents.id desc
    ) as document_rank
  from public.employee_documents
)
update public.employee_documents
set
  is_current = ranked_documents.document_rank = 1,
  replaced_at = case
    when ranked_documents.document_rank = 1 then null
    else coalesce(employee_documents.replaced_at, now())
  end
from ranked_documents
where ranked_documents.id = employee_documents.id;

create unique index if not exists employee_documents_one_current_type_idx
on public.employee_documents(employee_id, document_type)
where is_current = true;

create table if not exists public.onboarding_review_history (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id),
  action text not null check (
    action in ('submitted', 'approved', 'changes_requested')
  ),
  previous_status text,
  new_status text not null,
  comments text,
  acted_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists onboarding_review_history_employee_idx
on public.onboarding_review_history(employee_id, created_at desc);

alter table public.onboarding_review_history enable row level security;
alter table public.employee_documents enable row level security;
alter table public.employee_payroll_details enable row level security;

drop policy if exists onboarding_review_history_select
on public.onboarding_review_history;

create policy onboarding_review_history_select
on public.onboarding_review_history
for select
to authenticated
using (
  employee_id = public.leave_actor_profile_id()
  or public.current_user_role() in ('admin', 'hr')
);

revoke all privileges
on table public.onboarding_review_history
from anon;

grant select
on table public.onboarding_review_history
to authenticated;

revoke insert, update, delete
on table public.onboarding_review_history
from anon, authenticated;

drop policy if exists employee_payroll_details_select_self_admin
on public.employee_payroll_details;

create policy employee_payroll_details_select_self_admin
on public.employee_payroll_details
for select
to authenticated
using (
  employee_id = public.leave_actor_profile_id()
  or public.current_user_role() in ('admin', 'hr')
);

revoke insert, update, delete
on table public.profiles, public.employee_payroll_details, public.employee_documents
from anon, authenticated;

create or replace function public.register_employee_onboarding_document(
  p_document_type text,
  p_file_name text,
  p_file_path text,
  p_storage_bucket text default 'employee-documents'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_employee_id uuid;
  v_document public.employee_documents%rowtype;
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

  if p_document_type not in (
    'pan_card',
    'aadhaar_card',
    'cancelled_cheque',
    'uan_pf_document'
  ) then
    raise exception 'Unsupported onboarding document type.';
  end if;

  if nullif(trim(p_file_name), '') is null
    or nullif(trim(p_file_path), '') is null
    or p_file_path not like v_employee_id::text || '/%'
    or lower(trim(p_file_name)) !~ '\.(pdf|jpe?g|png)$'
  then
    raise exception 'Invalid document metadata.';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_employee_id::text || ':' || p_document_type, 0)
  );

  update public.employee_documents
  set
    is_current = false,
    replaced_at = now()
  where employee_documents.employee_id = v_employee_id
    and employee_documents.document_type = p_document_type
    and employee_documents.is_current = true;

  insert into public.employee_documents (
    employee_id,
    document_type,
    file_name,
    file_path,
    storage_bucket,
    uploaded_by,
    is_current
  )
  values (
    v_employee_id,
    p_document_type,
    trim(p_file_name),
    trim(p_file_path),
    coalesce(nullif(trim(p_storage_bucket), ''), 'employee-documents'),
    v_employee_id,
    true
  )
  returning * into v_document;

  return to_jsonb(v_document);
end;
$function$;

create or replace function public.submit_employee_onboarding(
  p_phone text,
  p_personal_email text,
  p_bank_account_number text,
  p_bank_ifsc text,
  p_bank_name text,
  p_pan_number text,
  p_aadhaar_number text,
  p_uan_number text,
  p_pf_number text,
  p_date_of_birth date,
  p_gender text,
  p_earlier_epf_member text,
  p_earlier_eps_member text,
  p_previous_epf_account_number text,
  p_father_spouse_name text,
  p_marital_status text,
  p_pf_declaration_agreed boolean,
  p_emergency_contact_name text,
  p_emergency_contact_phone text,
  p_address text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_employee_id uuid;
  v_previous_status text;
  v_profile public.profiles%rowtype;
  v_missing_documents text;
begin
  select profiles.id, profiles.onboarding_status
  into v_employee_id, v_previous_status
  from public.profiles
  where profiles.auth_user_id = auth.uid()
    and profiles.is_active = true
  for update;

  if v_employee_id is null then
    raise exception 'No active employee profile is linked to this login.';
  end if;

  if nullif(trim(p_phone), '') is null
    or nullif(trim(p_personal_email), '') is null
    or nullif(trim(p_bank_account_number), '') is null
    or nullif(trim(p_bank_ifsc), '') is null
    or nullif(trim(p_bank_name), '') is null
    or nullif(trim(p_pan_number), '') is null
    or nullif(trim(p_aadhaar_number), '') is null
    or nullif(trim(p_emergency_contact_name), '') is null
    or nullif(trim(p_emergency_contact_phone), '') is null
    or nullif(trim(p_address), '') is null
  then
    raise exception 'Complete all required onboarding fields before submission.';
  end if;

  if lower(trim(p_personal_email))
    !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  then
    raise exception 'Enter a valid personal email address.';
  end if;

  if upper(trim(p_pan_number)) !~ '^[A-Z]{5}[0-9]{4}[A-Z]$' then
    raise exception 'Enter a valid PAN number.';
  end if;

  if regexp_replace(p_aadhaar_number, '[^0-9]', '', 'g') !~ '^[0-9]{12}$' then
    raise exception 'Enter a valid 12-digit Aadhaar number.';
  end if;

  if upper(trim(p_bank_ifsc)) !~ '^[A-Z]{4}0[A-Z0-9]{6}$' then
    raise exception 'Enter a valid bank IFSC code.';
  end if;

  select string_agg(required_document.document_type, ', ')
  into v_missing_documents
  from (
    values
      ('pan_card'),
      ('aadhaar_card'),
      ('cancelled_cheque')
  ) as required_document(document_type)
  where not exists (
    select 1
    from public.employee_documents
    where employee_documents.employee_id = v_employee_id
      and employee_documents.document_type = required_document.document_type
      and employee_documents.is_current = true
  );

  if v_missing_documents is not null then
    raise exception 'Upload all required documents before submission: %.',
      v_missing_documents;
  end if;

  insert into public.employee_payroll_details (
    employee_id,
    bank_account_number,
    bank_ifsc,
    bank_name,
    pan_number,
    aadhaar_number,
    uan_number,
    pf_number,
    date_of_birth,
    gender,
    earlier_epf_member,
    earlier_eps_member,
    previous_epf_account_number,
    father_spouse_name,
    marital_status,
    pf_declaration_agreed,
    personal_email,
    emergency_contact_name,
    emergency_contact_phone,
    address,
    updated_at
  )
  values (
    v_employee_id,
    trim(p_bank_account_number),
    upper(trim(p_bank_ifsc)),
    trim(p_bank_name),
    upper(trim(p_pan_number)),
    regexp_replace(p_aadhaar_number, '[^0-9]', '', 'g'),
    nullif(trim(p_uan_number), ''),
    nullif(trim(p_pf_number), ''),
    p_date_of_birth,
    nullif(trim(p_gender), ''),
    nullif(trim(p_earlier_epf_member), ''),
    nullif(trim(p_earlier_eps_member), ''),
    nullif(trim(p_previous_epf_account_number), ''),
    nullif(trim(p_father_spouse_name), ''),
    nullif(trim(p_marital_status), ''),
    coalesce(p_pf_declaration_agreed, false),
    lower(trim(p_personal_email)),
    trim(p_emergency_contact_name),
    trim(p_emergency_contact_phone),
    trim(p_address),
    now()
  )
  on conflict (employee_id)
  do update set
    bank_account_number = excluded.bank_account_number,
    bank_ifsc = excluded.bank_ifsc,
    bank_name = excluded.bank_name,
    pan_number = excluded.pan_number,
    aadhaar_number = excluded.aadhaar_number,
    uan_number = excluded.uan_number,
    pf_number = excluded.pf_number,
    date_of_birth = excluded.date_of_birth,
    gender = excluded.gender,
    earlier_epf_member = excluded.earlier_epf_member,
    earlier_eps_member = excluded.earlier_eps_member,
    previous_epf_account_number = excluded.previous_epf_account_number,
    father_spouse_name = excluded.father_spouse_name,
    marital_status = excluded.marital_status,
    pf_declaration_agreed = excluded.pf_declaration_agreed,
    personal_email = excluded.personal_email,
    emergency_contact_name = excluded.emergency_contact_name,
    emergency_contact_phone = excluded.emergency_contact_phone,
    address = excluded.address,
    updated_at = now();

  update public.profiles
  set
    phone = trim(p_phone),
    onboarding_status = 'submitted',
    onboarding_submitted_at = now(),
    onboarding_reviewed_at = null,
    onboarding_reviewed_by = null,
    onboarding_review_comments = null,
    updated_at = now()
  where profiles.id = v_employee_id
  returning * into v_profile;

  insert into public.onboarding_review_history (
    employee_id,
    action,
    previous_status,
    new_status,
    acted_by
  )
  values (
    v_employee_id,
    'submitted',
    v_previous_status,
    'submitted',
    v_employee_id
  );

  return to_jsonb(v_profile);
end;
$function$;

create or replace function public.review_employee_onboarding(
  p_employee_id uuid,
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
  v_previous_status text;
  v_new_status text;
  v_profile public.profiles%rowtype;
  v_missing_documents text;
  v_payroll_complete boolean;
begin
  select profiles.id, profiles.role
  into v_actor_id, v_actor_role
  from public.profiles
  where profiles.auth_user_id = auth.uid()
    and profiles.is_active = true
  limit 1;

  if v_actor_id is null or v_actor_role not in ('admin', 'hr') then
    raise exception 'Admin or HR access is required.';
  end if;

  select profiles.onboarding_status
  into v_previous_status
  from public.profiles
  where profiles.id = p_employee_id
  for update;

  if not found then
    raise exception 'Employee profile was not found.';
  end if;

  if v_previous_status <> 'submitted' then
    raise exception 'Only a submitted onboarding profile can be reviewed.';
  end if;

  if p_action = 'approve' then
    select string_agg(required_document.document_type, ', ')
    into v_missing_documents
    from (
      values
        ('pan_card'),
        ('aadhaar_card'),
        ('cancelled_cheque')
    ) as required_document(document_type)
    where not exists (
      select 1
      from public.employee_documents
      where employee_documents.employee_id = p_employee_id
        and employee_documents.document_type = required_document.document_type
        and employee_documents.is_current = true
    );

    select exists (
      select 1
      from public.employee_payroll_details
      where employee_payroll_details.employee_id = p_employee_id
        and nullif(trim(employee_payroll_details.bank_account_number), '') is not null
        and nullif(trim(employee_payroll_details.bank_ifsc), '') is not null
        and nullif(trim(employee_payroll_details.bank_name), '') is not null
        and nullif(trim(employee_payroll_details.pan_number), '') is not null
        and nullif(trim(employee_payroll_details.aadhaar_number), '') is not null
        and nullif(trim(employee_payroll_details.personal_email), '') is not null
        and nullif(trim(employee_payroll_details.emergency_contact_name), '') is not null
        and nullif(trim(employee_payroll_details.emergency_contact_phone), '') is not null
        and nullif(trim(employee_payroll_details.address), '') is not null
    )
    into v_payroll_complete;

    if v_missing_documents is not null or not coalesce(v_payroll_complete, false) then
      raise exception 'Required onboarding information or documents are incomplete.';
    end if;

    v_new_status := 'approved';
  elsif p_action = 'request_changes' then
    if nullif(trim(p_comments), '') is null then
      raise exception 'A reason is required when requesting changes.';
    end if;

    v_new_status := 'changes_requested';
  else
    raise exception 'Unsupported onboarding review action.';
  end if;

  update public.profiles
  set
    onboarding_status = v_new_status,
    onboarding_reviewed_at = now(),
    onboarding_reviewed_by = v_actor_id,
    onboarding_review_comments = nullif(trim(p_comments), ''),
    updated_at = now()
  where profiles.id = p_employee_id
  returning * into v_profile;

  insert into public.onboarding_review_history (
    employee_id,
    action,
    previous_status,
    new_status,
    comments,
    acted_by
  )
  values (
    p_employee_id,
    case
      when p_action = 'approve' then 'approved'
      else 'changes_requested'
    end,
    v_previous_status,
    v_new_status,
    nullif(trim(p_comments), ''),
    v_actor_id
  );

  return to_jsonb(v_profile);
end;
$function$;

create or replace function public.update_employee_employment_info(
  p_employee_id uuid,
  p_employee_code text,
  p_department_id uuid,
  p_designation text,
  p_manager_id uuid,
  p_date_of_joining date,
  p_employment_status text,
  p_role text,
  p_is_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_actor_role text;
  v_profile public.profiles%rowtype;
begin
  select profiles.role
  into v_actor_role
  from public.profiles
  where profiles.auth_user_id = auth.uid()
    and profiles.is_active = true
  limit 1;

  if v_actor_role not in ('admin', 'hr') then
    raise exception 'Admin or HR access is required.';
  end if;

  if p_role not in ('employee', 'manager', 'admin', 'hr', 'payroll') then
    raise exception 'Unsupported employee role.';
  end if;

  update public.profiles
  set
    employee_code = nullif(trim(p_employee_code), ''),
    department_id = p_department_id,
    designation = nullif(trim(p_designation), ''),
    manager_id = p_manager_id,
    date_of_joining = p_date_of_joining,
    employment_status = coalesce(nullif(trim(p_employment_status), ''), 'active'),
    role = p_role,
    is_active = coalesce(p_is_active, false),
    updated_at = now()
  where profiles.id = p_employee_id
  returning * into v_profile;

  if not found then
    raise exception 'Employee profile was not found.';
  end if;

  return to_jsonb(v_profile);
end;
$function$;

revoke all on function public.register_employee_onboarding_document(
  text,
  text,
  text,
  text
) from public;
grant execute on function public.register_employee_onboarding_document(
  text,
  text,
  text,
  text
) to authenticated;

revoke all on function public.submit_employee_onboarding(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  date,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  text,
  text,
  text
) from public;
grant execute on function public.submit_employee_onboarding(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  date,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  text,
  text,
  text
) to authenticated;

revoke all on function public.review_employee_onboarding(uuid, text, text)
from public;
grant execute on function public.review_employee_onboarding(uuid, text, text)
to authenticated;

revoke all on function public.update_employee_employment_info(
  uuid,
  text,
  uuid,
  text,
  uuid,
  date,
  text,
  text,
  boolean
) from public;
grant execute on function public.update_employee_employment_info(
  uuid,
  text,
  uuid,
  text,
  uuid,
  date,
  text,
  text,
  boolean
) to authenticated;
