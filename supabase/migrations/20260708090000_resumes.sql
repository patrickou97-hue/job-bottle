create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '未命名简历',
  target_role text,
  job_target text,
  linked_job_id uuid references public.jobs(id) on delete set null,
  template_id text not null default 'classic' check (template_id in ('classic', 'modern')),
  content_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists resumes_user_id_updated_at_idx
  on public.resumes (user_id, updated_at desc);

create index if not exists resumes_linked_job_id_idx
  on public.resumes (linked_job_id);

alter table public.resumes enable row level security;

drop policy if exists resumes_select_own on public.resumes;
create policy resumes_select_own
  on public.resumes for select
  using (user_id = auth.uid());

drop policy if exists resumes_insert_own on public.resumes;
create policy resumes_insert_own
  on public.resumes for insert
  with check (user_id = auth.uid());

drop policy if exists resumes_update_own on public.resumes;
create policy resumes_update_own
  on public.resumes for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists resumes_delete_own on public.resumes;
create policy resumes_delete_own
  on public.resumes for delete
  using (user_id = auth.uid());

drop trigger if exists resumes_set_updated_at on public.resumes;
create trigger resumes_set_updated_at
before update on public.resumes
for each row execute function public.set_updated_at();
