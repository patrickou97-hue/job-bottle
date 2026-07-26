create table if not exists public.wechat_web_login_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  code_hash text not null unique check (length(code_hash) = 64),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists wechat_web_login_codes_active_expiry_idx
  on public.wechat_web_login_codes (expires_at)
  where used_at is null;

create table if not exists public.wechat_web_login_attempts (
  fingerprint_hash text primary key check (length(fingerprint_hash) = 64),
  window_started_at timestamptz not null default now(),
  attempts integer not null default 1 check (attempts between 1 and 10),
  updated_at timestamptz not null default now()
);

alter table public.wechat_web_login_codes enable row level security;
alter table public.wechat_web_login_attempts enable row level security;

revoke all on table public.wechat_web_login_codes from anon, authenticated;
revoke all on table public.wechat_web_login_attempts from anon, authenticated;

create or replace function public.reserve_wechat_web_login_code(
  p_user_id uuid,
  p_code_hash text,
  p_expires_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  reserved_id uuid;
begin
  if p_code_hash !~ '^[0-9a-f]{64}$'
    or p_expires_at <= now()
    or p_expires_at > now() + interval '5 minutes 10 seconds'
    or not exists (
      select 1
      from public.wechat_identities
      where user_id = p_user_id
    )
  then
    return false;
  end if;

  insert into public.wechat_web_login_codes (
    user_id,
    code_hash,
    expires_at,
    used_at,
    created_at
  )
  values (p_user_id, p_code_hash, p_expires_at, null, now())
  on conflict (user_id) do update
  set code_hash = excluded.code_hash,
      expires_at = excluded.expires_at,
      used_at = null,
      created_at = now()
  where wechat_web_login_codes.created_at <= now() - interval '30 seconds'
  returning id into reserved_id;

  return reserved_id is not null;
end;
$$;

create or replace function public.take_wechat_web_login_attempt_slot(
  p_fingerprint_hash text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  slot_hash text;
begin
  if p_fingerprint_hash !~ '^[0-9a-f]{64}$' then
    return false;
  end if;

  insert into public.wechat_web_login_attempts (
    fingerprint_hash,
    window_started_at,
    attempts,
    updated_at
  )
  values (p_fingerprint_hash, now(), 1, now())
  on conflict (fingerprint_hash) do update
  set attempts = case
        when wechat_web_login_attempts.window_started_at <= now() - interval '10 minutes'
          then 1
        else wechat_web_login_attempts.attempts + 1
      end,
      window_started_at = case
        when wechat_web_login_attempts.window_started_at <= now() - interval '10 minutes'
          then now()
        else wechat_web_login_attempts.window_started_at
      end,
      updated_at = now()
  where wechat_web_login_attempts.window_started_at <= now() - interval '10 minutes'
     or wechat_web_login_attempts.attempts < 10
  returning fingerprint_hash into slot_hash;

  return slot_hash is not null;
end;
$$;

create or replace function public.consume_wechat_web_login_code(
  p_code_hash text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  consumed_user_id uuid;
begin
  if p_code_hash !~ '^[0-9a-f]{64}$' then
    return null;
  end if;

  update public.wechat_web_login_codes as login_code
  set used_at = now()
  where login_code.code_hash = p_code_hash
    and login_code.used_at is null
    and login_code.expires_at > now()
    and exists (
      select 1
      from public.wechat_identities
      where user_id = login_code.user_id
    )
  returning login_code.user_id into consumed_user_id;

  return consumed_user_id;
end;
$$;

revoke all on function public.reserve_wechat_web_login_code(uuid, text, timestamptz) from public;
revoke all on function public.take_wechat_web_login_attempt_slot(text) from public;
revoke all on function public.consume_wechat_web_login_code(text) from public;

grant execute on function public.reserve_wechat_web_login_code(uuid, text, timestamptz) to service_role;
grant execute on function public.take_wechat_web_login_attempt_slot(text) to service_role;
grant execute on function public.consume_wechat_web_login_code(text) to service_role;

comment on table public.wechat_web_login_codes is
  'Server-only one-time codes that let an authenticated Mini Program user start a web session.';

comment on table public.wechat_web_login_attempts is
  'Server-only persistent rate limits for WeChat web login code guesses. Stores only HMAC fingerprints.';
