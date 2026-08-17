-- Referral codes are community-provided, anonymous to public readers, and never
-- treated as verified employment information. Existing job/application data is untouched.

create table if not exists public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_name text not null,
  job_id uuid references public.jobs(id) on delete set null,
  applicable_roles text,
  code text not null,
  usage_note text,
  expires_at date,
  is_active boolean not null default true,
  review_status text not null default 'queued',
  review_due_at timestamptz not null default now(),
  review_started_at timestamptz,
  reviewed_at timestamptz,
  review_attempts smallint not null default 0,
  review_category text,
  review_confidence numeric(4, 3),
  review_reason text,
  review_version text,
  deactivated_at timestamptz,
  deactivated_source text,
  deactivated_by uuid references auth.users(id) on delete set null,
  deactivation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint referral_codes_company_length_check check (char_length(btrim(company_name)) between 1 and 80),
  constraint referral_codes_code_format_check check (code ~ '^[A-Za-z0-9_-]{2,64}$'),
  constraint referral_codes_roles_length_check check (applicable_roles is null or char_length(applicable_roles) <= 160),
  constraint referral_codes_note_length_check check (usage_note is null or char_length(usage_note) <= 500),
  constraint referral_codes_review_status_check check (review_status in ('queued', 'reviewing', 'approved', 'rejected', 'error')),
  constraint referral_codes_review_attempts_check check (review_attempts between 0 and 1),
  constraint referral_codes_review_confidence_check check (review_confidence is null or review_confidence between 0 and 1),
  constraint referral_codes_review_reason_length_check check (review_reason is null or char_length(review_reason) <= 240),
  constraint referral_codes_deactivated_source_check check (deactivated_source is null or deactivated_source in ('ai', 'admin')),
  constraint referral_codes_deactivation_reason_length_check check (deactivation_reason is null or char_length(deactivation_reason) <= 240),
  constraint referral_codes_safe_text_check check (
    lower(coalesce(applicable_roles, '') || ' ' || coalesce(usage_note, ''))
      !~ '(https?://|www\\.|微信|v信|qq|收费|付费|转账|红包|验证码|密码|身份证|银行卡)'
  )
);

create unique index if not exists referral_codes_owner_company_code_unique
  on public.referral_codes (user_id, lower(company_name), lower(code));
create index if not exists referral_codes_company_active_created_idx
  on public.referral_codes (lower(company_name), is_active, created_at desc);
create index if not exists referral_codes_job_active_created_idx
  on public.referral_codes (job_id, is_active, created_at desc)
  where job_id is not null;
create index if not exists referral_codes_review_due_idx
  on public.referral_codes (review_due_at, created_at)
  where is_active = true and review_status = 'queued' and review_attempts = 0;

drop trigger if exists referral_codes_set_updated_at on public.referral_codes;
create trigger referral_codes_set_updated_at
before update on public.referral_codes
for each row execute function public.set_updated_at();

alter table public.referral_codes enable row level security;

drop policy if exists "referral_codes_select_active" on public.referral_codes;
create policy "referral_codes_select_active"
on public.referral_codes for select
to anon, authenticated
using (is_active = true);

drop policy if exists "referral_codes_delete_own" on public.referral_codes;
create policy "referral_codes_delete_own"
on public.referral_codes for delete
to authenticated
using (user_id = auth.uid());

revoke all on table public.referral_codes from anon, authenticated;
grant select (id, company_name, job_id, applicable_roles, code, usage_note, expires_at, created_at, updated_at)
  on public.referral_codes to anon, authenticated;
grant delete on table public.referral_codes to authenticated;
grant select, insert, update, delete on table public.referral_codes to service_role;

create or replace function public.create_referral_code_for_review(
  p_user_id uuid,
  p_company_name text,
  p_job_id uuid,
  p_applicable_roles text,
  p_code text,
  p_usage_note text,
  p_expires_at date
)
returns table (
  id uuid,
  company_name text,
  job_id uuid,
  applicable_roles text,
  code text,
  usage_note text,
  expires_at date,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role required';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('referral-upload:' || p_user_id::text, 0));
  if (select count(*) from public.referral_codes recent where recent.user_id = p_user_id and recent.created_at >= now() - interval '10 minutes') >= 5 then
    raise exception 'referral_upload_rate_limit';
  end if;
  if not exists (
    select 1
    from public.jobs job
    where job.is_active = true
      and job.company_name = btrim(p_company_name)
      and (p_job_id is null or job.id = p_job_id)
  ) then
    raise exception 'referral_company_not_found';
  end if;

  return query
  insert into public.referral_codes (
    user_id, company_name, job_id, applicable_roles, code, usage_note, expires_at, is_active
  ) values (
    p_user_id, btrim(p_company_name), p_job_id, nullif(btrim(p_applicable_roles), ''), upper(btrim(p_code)),
    nullif(btrim(p_usage_note), ''), p_expires_at, true
  )
  returning referral_codes.id,
            referral_codes.company_name,
            referral_codes.job_id,
            referral_codes.applicable_roles,
            referral_codes.code,
            referral_codes.usage_note,
            referral_codes.expires_at,
            referral_codes.created_at,
            referral_codes.updated_at;
end;
$$;

create or replace function public.claim_referral_code_for_review(p_id uuid)
returns table (
  id uuid,
  company_name text,
  applicable_roles text,
  code text,
  usage_note text,
  expires_at date
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role required';
  end if;

  return query
  update public.referral_codes target
  set review_status = 'reviewing',
      review_started_at = now(),
      review_attempts = 1,
      review_version = 'referral-mimo-v1'
  where target.id = p_id
    and target.is_active = true
    and target.review_status = 'queued'
    and target.review_attempts = 0
  returning target.id,
            target.company_name,
            target.applicable_roles,
            target.code,
            target.usage_note,
            target.expires_at;
end;
$$;

create or replace function public.claim_referral_codes_for_review(p_limit integer default 50)
returns table (
  id uuid,
  company_name text,
  applicable_roles text,
  code text,
  usage_note text,
  expires_at date
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role required';
  end if;

  -- A claimed row has already consumed its single allowed review attempt. If a
  -- worker disappears, a later run sends it to manual review without calling
  -- the model again.
  update public.referral_codes
  set review_status = 'error',
      reviewed_at = now(),
      review_reason = '智能审核任务未完成，已转人工复核'
  where review_status = 'reviewing'
    and review_attempts = 1
    and review_started_at < now() - interval '1 hour';

  return query
  with due as (
    select candidate.id
    from public.referral_codes candidate
    where candidate.is_active = true
      and candidate.review_status = 'queued'
      and candidate.review_attempts = 0
      and candidate.review_due_at <= now()
    order by candidate.review_due_at, candidate.created_at
    limit greatest(1, least(coalesce(p_limit, 50), 100))
    for update skip locked
  ), claimed as (
    update public.referral_codes target
    set review_status = 'reviewing',
        review_started_at = now(),
        review_attempts = 1,
        review_version = 'referral-mimo-v1'
    from due
    where target.id = due.id
    returning target.*
  )
  select claimed.id,
         claimed.company_name,
         claimed.applicable_roles,
         claimed.code,
         claimed.usage_note,
         claimed.expires_at
  from claimed;
end;
$$;

create or replace function public.complete_referral_code_review(
  p_id uuid,
  p_outcome text,
  p_category text,
  p_confidence numeric,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  changed_count integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role required';
  end if;
  if p_outcome not in ('approved', 'rejected', 'error') then
    raise exception 'invalid review outcome';
  end if;

  update public.referral_codes
  set review_status = p_outcome,
      reviewed_at = now(),
      review_category = left(nullif(btrim(p_category), ''), 80),
      review_confidence = case when p_confidence between 0 and 1 then p_confidence else null end,
      review_reason = left(nullif(btrim(p_reason), ''), 240),
      is_active = case when p_outcome = 'rejected' then false else is_active end,
      deactivated_at = case when p_outcome = 'rejected' then now() else deactivated_at end,
      deactivated_source = case when p_outcome = 'rejected' then 'ai' else deactivated_source end,
      deactivation_reason = case when p_outcome = 'rejected' then '智能审核判定为求职服务或引流内容' else deactivation_reason end
  where referral_codes.id = p_id
    and review_status = 'reviewing'
    and review_attempts = 1;

  get diagnostics changed_count = row_count;
  return changed_count = 1;
end;
$$;

revoke all on function public.claim_referral_codes_for_review(integer) from public, anon, authenticated;
revoke all on function public.create_referral_code_for_review(uuid, text, uuid, text, text, text, date) from public, anon, authenticated;
revoke all on function public.claim_referral_code_for_review(uuid) from public, anon, authenticated;
revoke all on function public.complete_referral_code_review(uuid, text, text, numeric, text) from public, anon, authenticated;
grant execute on function public.claim_referral_codes_for_review(integer) to service_role;
grant execute on function public.create_referral_code_for_review(uuid, text, uuid, text, text, text, date) to service_role;
grant execute on function public.claim_referral_code_for_review(uuid) to service_role;
grant execute on function public.complete_referral_code_review(uuid, text, text, numeric, text) to service_role;

create table if not exists public.referral_code_reports (
  id uuid primary key default gen_random_uuid(),
  referral_code_id uuid not null references public.referral_codes(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint referral_code_reports_reason_length_check check (char_length(btrim(reason)) between 2 and 300),
  constraint referral_code_reports_reporter_unique unique (referral_code_id, reporter_id)
);

create index if not exists referral_code_reports_unresolved_created_idx
  on public.referral_code_reports (created_at desc)
  where resolved_at is null;

alter table public.referral_code_reports enable row level security;

drop policy if exists "referral_code_reports_insert_own" on public.referral_code_reports;
create policy "referral_code_reports_insert_own"
on public.referral_code_reports for insert
to authenticated
with check (reporter_id = auth.uid());

revoke all on table public.referral_code_reports from anon, authenticated;
grant insert (referral_code_id, reporter_id, reason)
  on public.referral_code_reports to authenticated;

create or replace function public.list_referral_codes_for_admin()
returns table (
  id uuid,
  company_name text,
  applicable_roles text,
  code text,
  usage_note text,
  expires_at date,
  is_active boolean,
  review_status text,
  review_due_at timestamptz,
  reviewed_at timestamptz,
  review_category text,
  review_confidence numeric,
  review_reason text,
  deactivated_source text,
  deactivation_reason text,
  report_count bigint,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'admin required';
  end if;

  return query
  select code_row.id,
         code_row.company_name,
         code_row.applicable_roles,
         code_row.code,
         code_row.usage_note,
         code_row.expires_at,
         code_row.is_active,
         code_row.review_status,
         code_row.review_due_at,
         code_row.reviewed_at,
         code_row.review_category,
         code_row.review_confidence,
         code_row.review_reason,
         code_row.deactivated_source,
         code_row.deactivation_reason,
         (select count(*) from public.referral_code_reports report where report.referral_code_id = code_row.id),
         code_row.created_at
  from public.referral_codes code_row
  order by code_row.created_at desc
  limit 1000;
end;
$$;

create or replace function public.deactivate_referral_code_as_admin(p_id uuid, p_reason text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  changed_count integer;
  clean_reason text := btrim(coalesce(p_reason, ''));
begin
  if not public.is_admin() then
    raise exception 'admin required';
  end if;
  if char_length(clean_reason) < 2 or char_length(clean_reason) > 240 then
    raise exception 'invalid deactivation reason';
  end if;

  update public.referral_codes
  set is_active = false,
      deactivated_at = now(),
      deactivated_source = 'admin',
      deactivated_by = auth.uid(),
      deactivation_reason = clean_reason
  where referral_codes.id = p_id
    and is_active = true;

  get diagnostics changed_count = row_count;
  return changed_count = 1;
end;
$$;

revoke all on function public.list_referral_codes_for_admin() from public, anon;
revoke all on function public.deactivate_referral_code_as_admin(uuid, text) from public, anon;
grant execute on function public.list_referral_codes_for_admin() to authenticated;
grant execute on function public.deactivate_referral_code_as_admin(uuid, text) to authenticated;
