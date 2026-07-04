create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  );
$$;

create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
    and auth.uid() is not null
    and not public.is_admin()
  then
    raise exception 'profiles.role can only be changed by an admin'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_escalation on public.profiles;
create trigger profiles_prevent_role_escalation
before update of role on public.profiles
for each row execute function public.prevent_profile_role_escalation();

alter table public.user_applications
  add column if not exists interview_round int,
  add column if not exists note text;

alter table public.user_applications
  drop constraint if exists user_applications_note_length_check;

alter table public.user_applications
  add constraint user_applications_note_length_check
  check (note is null or char_length(note) <= 2000);

create table if not exists public.status_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.user_applications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_at timestamptz not null default now()
);

create index if not exists status_history_application_changed_at_idx
  on public.status_history (application_id, changed_at desc);

create index if not exists status_history_user_changed_at_idx
  on public.status_history (user_id, changed_at desc);

create or replace function public.log_user_application_status_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.status_history (application_id, user_id, from_status, to_status)
    values (new.id, new.user_id, null, new.status);
  elsif new.status is distinct from old.status then
    insert into public.status_history (application_id, user_id, from_status, to_status)
    values (new.id, new.user_id, old.status, new.status);
  end if;

  return new;
end;
$$;

drop trigger if exists user_applications_status_history on public.user_applications;
create trigger user_applications_status_history
after insert or update of status on public.user_applications
for each row execute function public.log_user_application_status_history();

alter table public.status_history enable row level security;

drop policy if exists "status_history_select_own" on public.status_history;
create policy "status_history_select_own"
on public.status_history
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "status_history_select_admin_all" on public.status_history;
create policy "status_history_select_admin_all"
on public.status_history
for select
to authenticated
using (public.is_admin());

alter table public.jobs
  add column if not exists opens_at timestamptz,
  add column if not exists closes_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'jobs'
      and column_name = 'search_text'
  ) then
    alter table public.jobs
      add column search_text text generated always as (
        lower(
          coalesce(company_name, '') || ' ' ||
          coalesce(job_titles, '') || ' ' ||
          coalesce(industry, '') || ' ' ||
          coalesce(locations, '')
        )
      ) stored;
  end if;
end $$;

create index if not exists jobs_search_text_trgm_idx
  on public.jobs using gin (search_text gin_trgm_ops);

alter table public.forum_posts
  drop constraint if exists forum_posts_content_length_check;

alter table public.forum_posts
  add constraint forum_posts_content_length_check
  check (char_length(content) <= 5000)
  not valid;

alter table public.forum_comments
  drop constraint if exists forum_comments_content_length_check;

alter table public.forum_comments
  add constraint forum_comments_content_length_check
  check (char_length(content) <= 5000)
  not valid;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now(),
  resolved boolean not null default false,
  constraint reports_reason_length_check check (char_length(reason) <= 500)
);

create index if not exists reports_created_at_idx
  on public.reports (created_at desc);

create index if not exists reports_resolved_created_at_idx
  on public.reports (resolved, created_at desc);

alter table public.reports enable row level security;

drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own"
on public.reports
for insert
to authenticated
with check (reporter_id = auth.uid());

drop policy if exists "reports_select_admin_all" on public.reports;
create policy "reports_select_admin_all"
on public.reports
for select
to authenticated
using (public.is_admin());

drop policy if exists "reports_update_admin_all" on public.reports;
create policy "reports_update_admin_all"
on public.reports
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "forum_posts_delete_admin" on public.forum_posts;
create policy "forum_posts_delete_admin"
on public.forum_posts
for delete
to authenticated
using (public.is_admin());

drop policy if exists "forum_comments_delete_admin" on public.forum_comments;
create policy "forum_comments_delete_admin"
on public.forum_comments
for delete
to authenticated
using (public.is_admin());

