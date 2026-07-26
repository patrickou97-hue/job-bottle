create table if not exists public.star_interview_auth_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  install_id_hash text not null,
  pkce_challenge text not null,
  state_hash text not null,
  scopes text[] not null default array['profile:read', 'resumes:read']::text[],
  selected_resume_ids uuid[] not null default '{}'::uuid[],
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists star_interview_auth_codes_expiry_idx
  on public.star_interview_auth_codes (expires_at)
  where consumed_at is null;

create table if not exists public.star_interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  install_id_hash text not null,
  refresh_token_hash text not null unique,
  scopes text[] not null default array['profile:read', 'resumes:read']::text[],
  selected_resume_ids uuid[] not null default '{}'::uuid[],
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_used_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists star_interview_sessions_user_idx
  on public.star_interview_sessions (user_id, created_at desc);

create index if not exists star_interview_sessions_expiry_idx
  on public.star_interview_sessions (expires_at)
  where revoked_at is null;

alter table public.star_interview_auth_codes enable row level security;
alter table public.star_interview_sessions enable row level security;

revoke all on table public.star_interview_auth_codes from anon, authenticated;
revoke all on table public.star_interview_sessions from anon, authenticated;

comment on table public.star_interview_auth_codes is
  'Short-lived, single-use PKCE authorization codes for the StarInterview macOS client.';
comment on table public.star_interview_sessions is
  'Revocable StarInterview sessions with rotating hashed refresh tokens.';
