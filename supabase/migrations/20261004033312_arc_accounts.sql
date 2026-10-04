-- Arc has its own product account namespace while sharing the existing Auth
-- identity store. Create membership only after the user explicitly approves
-- the ArcSweep connection. No StarJob profile data is copied into this table.
create table public.arc_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_authorized_at timestamptz not null default now()
);

alter table public.arc_accounts enable row level security;
revoke all on public.arc_accounts from public, anon, authenticated;
grant all on public.arc_accounts to service_role;

comment on table public.arc_accounts is
  'Arc product membership. Auth identity is shared through auth.users; product data and authorization remain separate.';
