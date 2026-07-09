create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone text,
  city text,
  school text,
  major text,
  graduation_year text,
  preferred_regions text[] not null default '{}',
  target_roles text[] not null default '{}',
  role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('user', 'admin'))
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  start_date text,
  industry text,
  batch_type text,
  job_titles text,
  locations text,
  apply_url text not null,
  notes text,
  logo_url text,
  tags text[] default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  status text not null default 'opened',
  progress_note text,
  applied_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, job_id),
  constraint user_applications_status_check check (
    status in (
      'opened',
      'applied',
      'written_test',
      'first_round',
      'second_round',
      'final_round',
      'offer',
      'rejected',
      'withdrawn'
    )
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-logos',
  'company-logos',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create index if not exists jobs_is_active_updated_at_idx
  on public.jobs (is_active, updated_at desc);

create index if not exists jobs_tags_idx
  on public.jobs using gin (tags);

create index if not exists user_applications_user_id_updated_at_idx
  on public.user_applications (user_id, updated_at desc);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists jobs_set_updated_at on public.jobs;
create trigger jobs_set_updated_at
before update on public.jobs
for each row execute function public.set_updated_at();

drop trigger if exists user_applications_set_updated_at on public.user_applications;
create trigger user_applications_set_updated_at
before update on public.user_applications
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  );
$$ language sql security definer set search_path = public;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id,
    display_name,
    phone,
    city,
    school,
    major,
    graduation_year,
    preferred_regions,
    target_roles,
    role
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1), '秋招用户'),
    nullif(new.raw_user_meta_data->>'phone', ''),
    nullif(new.raw_user_meta_data->>'city', ''),
    nullif(new.raw_user_meta_data->>'school', ''),
    nullif(new.raw_user_meta_data->>'major', ''),
    nullif(new.raw_user_meta_data->>'graduation_year', ''),
    coalesce(
      array(select jsonb_array_elements_text(coalesce(new.raw_user_meta_data->'preferred_regions', '[]'::jsonb))),
      '{}'
    ),
    coalesce(
      array(select jsonb_array_elements_text(coalesce(new.raw_user_meta_data->'target_roles', '[]'::jsonb))),
      '{}'
    ),
    'user'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
