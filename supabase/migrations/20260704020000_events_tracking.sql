create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event text not null,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint events_event_length_check check (char_length(event) <= 80)
);

create index if not exists events_user_created_at_idx
  on public.events (user_id, created_at desc);

create index if not exists events_event_created_at_idx
  on public.events (event, created_at desc);

alter table public.events enable row level security;

drop policy if exists "events_insert_own" on public.events;
create policy "events_insert_own"
on public.events
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "events_select_admin_all" on public.events;
create policy "events_select_admin_all"
on public.events
for select
to authenticated
using (public.is_admin());
