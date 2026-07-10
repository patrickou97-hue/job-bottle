-- Idempotent repair for existing hosted projects that were deployed before
-- profile preferences and cloud resumes were introduced.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

alter table public.profiles
  add column if not exists phone text,
  add column if not exists city text,
  add column if not exists school text,
  add column if not exists major text,
  add column if not exists graduation_year text,
  add column if not exists preferred_regions text[] not null default '{}',
  add column if not exists target_roles text[] not null default '{}';

create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '未命名简历',
  target_role text,
  job_target text,
  linked_job_id uuid references public.jobs(id) on delete set null,
  template_id text not null default 'compact' check (template_id in ('compact', 'classic', 'modern')),
  content_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.resumes
  alter column template_id set default 'compact';

alter table public.resumes
  drop constraint if exists resumes_template_id_check;

alter table public.resumes
  add constraint resumes_template_id_check
  check (template_id in ('compact', 'classic', 'modern'));

create index if not exists resumes_user_id_updated_at_idx
  on public.resumes (user_id, updated_at desc);

create index if not exists profiles_preferred_regions_idx
  on public.profiles using gin (preferred_regions);

create index if not exists profiles_target_roles_idx
  on public.profiles using gin (target_roles);

alter table public.resumes enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "profiles_insert_own_user" on public.profiles;
create policy "profiles_insert_own_user" on public.profiles
  for insert to authenticated with check (id = auth.uid() and role = 'user');

drop policy if exists "profiles_update_own_display_name" on public.profiles;
create policy "profiles_update_own_display_name" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (
      select role
      from public.profiles current_profile
      where current_profile.id = auth.uid()
    )
  );

grant select, insert, update on public.profiles to authenticated;

drop policy if exists resumes_select_own on public.resumes;
create policy resumes_select_own on public.resumes
  for select using (user_id = auth.uid());

drop policy if exists resumes_insert_own on public.resumes;
create policy resumes_insert_own on public.resumes
  for insert with check (user_id = auth.uid());

drop policy if exists resumes_update_own on public.resumes;
create policy resumes_update_own on public.resumes
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists resumes_delete_own on public.resumes;
create policy resumes_delete_own on public.resumes
  for delete using (user_id = auth.uid());

grant select, insert, update, delete on public.resumes to authenticated;

drop trigger if exists resumes_set_updated_at on public.resumes;
create trigger resumes_set_updated_at
before update on public.resumes
for each row execute function public.set_updated_at();
