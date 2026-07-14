-- Idempotent production catch-up for hosted projects that skipped early
-- security/analytics migrations. This migration preserves existing rows.

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
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
set search_path = public, pg_temp
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

create unique index if not exists user_applications_user_job_uidx
  on public.user_applications (user_id, job_id);

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

alter table public.forum_posts enable row level security;
alter table public.forum_comments enable row level security;

alter table public.forum_posts
  add column if not exists is_pinned boolean not null default false;

create index if not exists forum_posts_pinned_created_at_idx
  on public.forum_posts (is_pinned desc, created_at desc);

create or replace function public.protect_forum_post_pinning()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (
    (tg_op = 'INSERT' and new.is_pinned)
    or (tg_op = 'UPDATE' and new.is_pinned is distinct from old.is_pinned)
  ) and coalesce(auth.role(), '') <> 'service_role'
    and not public.is_admin()
  then
    raise exception 'Only administrators can change forum pinning.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.protect_forum_post_pinning() from public;

drop trigger if exists forum_posts_protect_pinning on public.forum_posts;
create trigger forum_posts_protect_pinning
before insert or update of is_pinned on public.forum_posts
for each row execute function public.protect_forum_post_pinning();

drop policy if exists "forum_posts_select_public" on public.forum_posts;
create policy "forum_posts_select_public" on public.forum_posts
  for select to anon, authenticated using (true);

drop policy if exists "forum_posts_insert_own" on public.forum_posts;
create policy "forum_posts_insert_own" on public.forum_posts
  for insert to authenticated
  with check (user_id = auth.uid() and char_length(content) <= 5000);

drop policy if exists "forum_posts_update_own" on public.forum_posts;
create policy "forum_posts_update_own" on public.forum_posts
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (
    (user_id = auth.uid() or public.is_admin())
    and char_length(content) <= 5000
  );

drop policy if exists "forum_posts_delete_own" on public.forum_posts;
create policy "forum_posts_delete_own" on public.forum_posts
  for delete to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "forum_posts_delete_admin" on public.forum_posts;

drop policy if exists "forum_comments_select_public" on public.forum_comments;
create policy "forum_comments_select_public" on public.forum_comments
  for select to anon, authenticated using (true);

drop policy if exists "forum_comments_insert_own" on public.forum_comments;
create policy "forum_comments_insert_own" on public.forum_comments
  for insert to authenticated
  with check (user_id = auth.uid() and char_length(content) <= 5000);

drop policy if exists "forum_comments_update_own" on public.forum_comments;
create policy "forum_comments_update_own" on public.forum_comments
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (
    (user_id = auth.uid() or public.is_admin())
    and char_length(content) <= 5000
  );

drop policy if exists "forum_comments_delete_own" on public.forum_comments;
create policy "forum_comments_delete_own" on public.forum_comments
  for delete to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "forum_comments_delete_admin" on public.forum_comments;

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

insert into public.status_history (
  application_id,
  user_id,
  from_status,
  to_status,
  changed_at
)
select
  application.id,
  application.user_id,
  null,
  application.status,
  application.updated_at
from public.user_applications application
where not exists (
  select 1
  from public.status_history history
  where history.application_id = application.id
);

create or replace function public.log_user_application_status_history()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
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
create policy "status_history_select_own" on public.status_history
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "status_history_select_admin_all" on public.status_history;
create policy "status_history_select_admin_all" on public.status_history
  for select to authenticated using (public.is_admin());

grant select on public.status_history to authenticated;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now(),
  resolved boolean not null default false,
  constraint reports_reason_length_check check (char_length(reason) <= 500)
);

create index if not exists reports_created_at_idx on public.reports (created_at desc);
create index if not exists reports_resolved_created_at_idx on public.reports (resolved, created_at desc);
alter table public.reports enable row level security;

drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own" on public.reports
  for insert to authenticated with check (reporter_id = auth.uid());

drop policy if exists "reports_select_admin_all" on public.reports;
create policy "reports_select_admin_all" on public.reports
  for select to authenticated using (public.is_admin());

drop policy if exists "reports_update_admin_all" on public.reports;
create policy "reports_update_admin_all" on public.reports
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, insert, update on public.reports to authenticated;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event text not null,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint events_event_length_check check (char_length(event) <= 80)
);

create index if not exists events_user_created_at_idx on public.events (user_id, created_at desc);
create index if not exists events_event_created_at_idx on public.events (event, created_at desc);
alter table public.events enable row level security;

drop policy if exists "events_insert_own" on public.events;
create policy "events_insert_own" on public.events
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "events_select_admin_all" on public.events;
create policy "events_select_admin_all" on public.events
  for select to authenticated using (public.is_admin());

grant select, insert on public.events to authenticated;

-- A durable, per-user rate window shared by every Vercel instance.
create table if not exists public.resume_ai_rate_events (
  id bigint generated by default as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists resume_ai_rate_events_user_created_idx
  on public.resume_ai_rate_events (user_id, created_at desc);

alter table public.resume_ai_rate_events enable row level security;
revoke all on public.resume_ai_rate_events from anon, authenticated;

create or replace function public.take_resume_ai_rate_slot()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  active_count int;
begin
  if current_user_id is null then
    return false;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text, 0));

  delete from public.resume_ai_rate_events
  where user_id = current_user_id
    and created_at < now() - interval '10 minutes';

  select count(*) into active_count
  from public.resume_ai_rate_events
  where user_id = current_user_id
    and created_at >= now() - interval '10 minutes';

  if active_count >= 6 then
    return false;
  end if;

  insert into public.resume_ai_rate_events (user_id) values (current_user_id);
  return true;
end;
$$;

revoke all on function public.take_resume_ai_rate_slot() from public;
grant execute on function public.take_resume_ai_rate_slot() to authenticated;

-- Ensure count columns represent their source rows instead of seeded estimates.
update public.forum_posts post
set comment_count = (
  select count(*)::int from public.forum_comments comment where comment.post_id = post.id
),
like_count = (
  select count(*)::int from public.forum_likes item where item.post_id = post.id
);

update public.forum_comments comment
set like_count = (
  select count(*)::int from public.forum_likes item where item.comment_id = comment.id
);

create or replace function public.forum_comments_count_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    update public.forum_posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.forum_posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists forum_comments_count on public.forum_comments;
create trigger forum_comments_count
after insert or delete on public.forum_comments
for each row execute function public.forum_comments_count_trigger();

create or replace function public.forum_post_likes_count_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' and new.post_id is not null then
    update public.forum_posts set like_count = like_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' and old.post_id is not null then
    update public.forum_posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists forum_post_likes_count on public.forum_likes;
create trigger forum_post_likes_count
after insert or delete on public.forum_likes
for each row execute function public.forum_post_likes_count_trigger();

create or replace function public.forum_comment_likes_count_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' and new.comment_id is not null then
    update public.forum_comments set like_count = like_count + 1 where id = new.comment_id;
  elsif tg_op = 'DELETE' and old.comment_id is not null then
    update public.forum_comments set like_count = greatest(like_count - 1, 0) where id = old.comment_id;
  end if;
  return null;
end;
$$;

drop trigger if exists forum_comment_likes_count on public.forum_likes;
create trigger forum_comment_likes_count
after insert or delete on public.forum_likes
for each row execute function public.forum_comment_likes_count_trigger();

-- Remove click attribution keys from stored application URLs while preserving
-- all other query parameters and fragments.
create or replace function public.strip_application_tracking_params(value text)
returns text
language plpgsql
immutable
strict
set search_path = public, pg_temp
as $$
declare
  base text;
  fragment text := '';
  path text;
  query text;
  pair text;
  kept text[] := '{}';
begin
  if position('#' in value) > 0 then
    fragment := substring(value from position('#' in value));
    base := left(value, position('#' in value) - 1);
  else
    base := value;
  end if;

  if position('?' in base) = 0 then
    return value;
  end if;

  path := left(base, position('?' in base) - 1);
  query := substring(base from position('?' in base) + 1);
  foreach pair in array string_to_array(query, '&') loop
    if lower(split_part(pair, '=', 1)) not in ('cid', 'click_id', 'clickid') then
      kept := array_append(kept, pair);
    end if;
  end loop;

  return path || case when cardinality(kept) > 0 then '?' || array_to_string(kept, '&') else '' end || fragment;
end;
$$;

update public.jobs
set apply_url = public.strip_application_tracking_params(apply_url)
where apply_url is distinct from public.strip_application_tracking_params(apply_url);

create or replace function public.normalize_job_apply_url()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.apply_url := public.strip_application_tracking_params(new.apply_url);
  return new;
end;
$$;

drop trigger if exists jobs_normalize_apply_url on public.jobs;
create trigger jobs_normalize_apply_url
before insert or update of apply_url on public.jobs
for each row execute function public.normalize_job_apply_url();

update public.jobs
set job_categories = array[U&'\5176\4ED6']::text[]
where is_active = true
  and coalesce(array_length(job_categories, 1), 0) = 0;
