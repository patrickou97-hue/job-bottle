create table if not exists public.wechat_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  openid_hash text not null unique check (length(openid_hash) = 64),
  unionid_hash text unique check (unionid_hash is null or length(unionid_hash) = 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz not null default now()
);

create unique index if not exists wechat_identities_user_id_idx
  on public.wechat_identities (user_id);

create table if not exists public.miniprogram_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  refresh_token_hash text not null unique check (length(refresh_token_hash) = 64),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);

create index if not exists miniprogram_sessions_user_id_idx
  on public.miniprogram_sessions (user_id);

create index if not exists miniprogram_sessions_active_expiry_idx
  on public.miniprogram_sessions (expires_at)
  where revoked_at is null;

alter table public.wechat_identities enable row level security;
alter table public.miniprogram_sessions enable row level security;

revoke all on table public.wechat_identities from anon, authenticated;
revoke all on table public.miniprogram_sessions from anon, authenticated;

comment on table public.wechat_identities is
  'Server-only mapping from HMAC-protected WeChat identifiers to Supabase users.';

comment on table public.miniprogram_sessions is
  'Server-only rotating sessions for the StarJob WeChat Mini Program.';
