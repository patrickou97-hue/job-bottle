begin;

-- Auth and profiles cannot be mutated through one HTTP/SQL transaction. Keep a
-- durable, non-expiring target guard and store the exact fields this workflow
-- may change. This is fail-closed: an unresolved guard revokes admin authority
-- everywhere until the operation is finalized, safely cancelled, or explicitly
-- recovered.
create table if not exists public.admin_user_mutation_guards (
  target_user_id uuid primary key references auth.users(id) on delete cascade,
  reservation_token uuid not null default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id),
  mutation_kind text not null
    check (mutation_kind in ('profile_auth', 'star_interview_access')),
  actor_is_primary boolean not null,
  actor_auth_updated_at timestamptz not null,
  actor_profile_updated_at timestamptz not null,
  target_is_primary boolean not null,
  previous_role text not null check (previous_role in ('user', 'admin')),
  previous_display_name text,
  previous_banned_until timestamptz,
  previous_access_key_present boolean not null,
  previous_access_value jsonb,
  next_role text not null check (next_role in ('user', 'admin')),
  next_disabled boolean not null,
  mutate_access_key boolean not null,
  next_access_value boolean not null,
  reserved_at timestamptz not null default now(),
  recovery_requested_at timestamptz,
  recovery_requested_by_user_id uuid references auth.users(id),
  recovery_reason text,
  updated_at timestamptz not null default now(),
  check (previous_access_key_present or previous_access_value is null),
  check (
    (recovery_requested_at is null
      and recovery_requested_by_user_id is null
      and recovery_reason is null)
    or (recovery_requested_at is not null
      and recovery_requested_by_user_id is not null
      and recovery_reason is not null)
  )
);

create table if not exists public.admin_user_mutation_recoveries (
  id uuid primary key default gen_random_uuid(),
  reservation_token uuid not null,
  target_user_id uuid not null,
  original_actor_user_id uuid,
  recovered_by_user_id uuid not null,
  mutation_kind text not null,
  reason text not null,
  recovered_at timestamptz not null default now()
);

alter table public.admin_user_mutation_guards enable row level security;
alter table public.admin_user_mutation_recoveries enable row level security;
revoke all on table public.admin_user_mutation_guards,
  public.admin_user_mutation_recoveries from public, anon, authenticated;
grant select, insert, update, delete on table public.admin_user_mutation_guards,
  public.admin_user_mutation_recoveries to service_role;

-- RLS and every authenticated database caller use this authority check. A
-- stale JWT cannot retain admin access after a ban or while the user's own
-- mutation guard is unresolved.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.id = auth.uid()
      and p.role = 'admin'
      and not coalesce(u.banned_until > now(), false)
      and not exists (
        select 1
        from public.admin_user_mutation_guards g
        where g.target_user_id = p.id
      )
  );
$$;

-- Balance grants are performed through service_role, so the database must
-- revalidate the claimed actor inside the same transaction as every grant.
-- Holding the actor's mutation advisory lock prevents a target guard from
-- appearing after this check but before the underlying ledger write.
create or replace function public.adjust_star_interview_admin_grant(
  p_user_id uuid,
  p_amount_fen bigint,
  p_reference_key text,
  p_note text,
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  actor_auth auth.users%rowtype;
  actor_profile public.profiles%rowtype;
begin
  if p_actor_user_id is null
    or p_amount_fen not between 100 and 100000 then
    raise exception 'invalid administrator balance grant';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('admin-user-mutation:' || p_actor_user_id::text, 0)
  );

  select * into actor_auth from auth.users
  where id = p_actor_user_id for share;
  if not found then
    raise exception 'administrator authority revoked';
  end if;
  select * into actor_profile from public.profiles
  where id = p_actor_user_id for share;
  if not found
    or lower(trim(coalesce(actor_auth.email, ''))) <> 'raywang6688@outlook.com'
    or actor_profile.role is distinct from 'admin'
    or coalesce(actor_auth.banned_until > now(), false)
    or exists (
      select 1 from public.admin_user_mutation_guards
      where target_user_id = p_actor_user_id
    ) then
    raise exception 'administrator authority revoked';
  end if;

  return public.adjust_star_interview_balance(
    p_user_id,
    p_amount_fen,
    'admin_grant',
    p_reference_key,
    p_note,
    p_actor_user_id
  );
end;
$$;

create or replace function public.reserve_admin_user_mutation(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_mutation_kind text,
  p_next_role text,
  p_next_disabled boolean,
  p_next_star_interview_access boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  actor_auth auth.users%rowtype;
  target_auth auth.users%rowtype;
  actor_profile public.profiles%rowtype;
  target_profile public.profiles%rowtype;
  existing_guard public.admin_user_mutation_guards%rowtype;
  token uuid;
  actor_is_primary boolean;
  target_is_primary boolean;
  changes_admin_role boolean;
  previous_access_key_present boolean;
  previous_access_value jsonb;
  mutate_access_key boolean;
  next_access_value boolean;
  resolved_next_role text;
  resolved_next_disabled boolean;
begin
  if p_actor_user_id is null
    or p_target_user_id is null
    or p_mutation_kind not in ('profile_auth', 'star_interview_access')
    or (p_mutation_kind = 'profile_auth'
      and (p_next_role not in ('user', 'admin') or p_next_disabled is null))
    or (p_mutation_kind = 'star_interview_access'
      and p_next_star_interview_access is null) then
    raise exception 'invalid admin user mutation reservation';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'admin-user-mutation:' || least(p_actor_user_id::text, p_target_user_id::text),
      0
    )
  );
  if p_actor_user_id <> p_target_user_id then
    perform pg_advisory_xact_lock(
      hashtextextended(
        'admin-user-mutation:' || greatest(p_actor_user_id::text, p_target_user_id::text),
        0
      )
    );
  end if;

  select * into actor_auth
  from auth.users
  where id = p_actor_user_id
  for share;
  if not found or coalesce(actor_auth.banned_until > now(), false) then
    return jsonb_build_object(
      'action', 'forbidden',
      'code', 'ADMIN_ACTOR_REVOKED',
      'error', '管理员账号已停用或权限已发生变化，请刷新后重试。'
    );
  end if;

  select * into actor_profile
  from public.profiles
  where id = p_actor_user_id
  for share;
  if not found or actor_profile.role is distinct from 'admin' then
    return jsonb_build_object(
      'action', 'forbidden',
      'code', 'ADMIN_ACTOR_REVOKED',
      'error', '管理员权限已发生变化，请刷新后重试。'
    );
  end if;

  -- A target guard on the actor immediately suspends all of their admin work.
  select * into existing_guard
  from public.admin_user_mutation_guards
  where target_user_id = p_actor_user_id
  for update;
  if found then
    return jsonb_build_object(
      'action', 'forbidden',
      'code', 'ADMIN_ACTOR_RECOVERY_REQUIRED',
      'error', '当前管理员账号存在未完成的安全操作，需要主管理员恢复后继续。'
    );
  end if;

  select * into target_auth
  from auth.users
  where id = p_target_user_id
  for update;
  if not found then
    return jsonb_build_object(
      'action', 'conflict',
      'code', 'ADMIN_TARGET_MISSING',
      'error', '目标账户不存在或已被删除。'
    );
  end if;

  insert into public.profiles (id, display_name, role)
  values (p_target_user_id, '秋招用户', 'user')
  on conflict (id) do nothing;

  select * into target_profile
  from public.profiles
  where id = p_target_user_id
  for update;

  select * into existing_guard
  from public.admin_user_mutation_guards
  where target_user_id = p_target_user_id
  for update;
  if found then
    return jsonb_build_object(
      'action', 'busy',
      'code', 'ADMIN_MUTATION_IN_PROGRESS',
      'error', '该账户存在未完成的安全操作，需要完成或恢复后重试。',
      'reserved_at', existing_guard.reserved_at
    );
  end if;

  actor_is_primary := lower(coalesce(actor_auth.email, '')) = 'raywang6688@outlook.com';
  target_is_primary := lower(coalesce(target_auth.email, '')) = 'raywang6688@outlook.com';
  resolved_next_role := case
    when p_mutation_kind = 'profile_auth' then p_next_role
    else target_profile.role
  end;
  resolved_next_disabled := case
    when p_mutation_kind = 'profile_auth' then p_next_disabled
    else coalesce(target_auth.banned_until > now(), false)
  end;

  if p_actor_user_id = p_target_user_id
    and (resolved_next_disabled or resolved_next_role <> 'admin') then
    return jsonb_build_object(
      'action', 'forbidden',
      'code', 'ADMIN_SELF_PROTECTED',
      'error', '不能停用或降级当前管理员账号。'
    );
  end if;
  if target_is_primary
    and (resolved_next_disabled or resolved_next_role <> 'admin') then
    return jsonb_build_object(
      'action', 'forbidden',
      'code', 'PRIMARY_ADMIN_PROTECTED',
      'error', '主管理员账号不能被停用或降级。'
    );
  end if;

  changes_admin_role := target_profile.role <> resolved_next_role
    and (target_profile.role = 'admin' or resolved_next_role = 'admin');
  if p_mutation_kind = 'star_interview_access' and not actor_is_primary then
    return jsonb_build_object(
      'action', 'forbidden',
      'code', 'PRIMARY_ADMIN_REQUIRED',
      'error', '只有主管理员可以调整 StarInterview 无限访问。'
    );
  end if;
  if p_mutation_kind = 'profile_auth'
    and not actor_is_primary
    and (changes_admin_role or (target_profile.role = 'admin' and resolved_next_disabled)) then
    return jsonb_build_object(
      'action', 'forbidden',
      'code', 'PRIMARY_ADMIN_REQUIRED',
      'error', '只有主管理员可以调整管理员角色或停用管理员账号。'
    );
  end if;

  previous_access_key_present := coalesce(target_auth.raw_app_meta_data, '{}'::jsonb)
    ? 'star_interview_unlimited_access';
  previous_access_value := coalesce(target_auth.raw_app_meta_data, '{}'::jsonb)
    -> 'star_interview_unlimited_access';
  if p_mutation_kind = 'star_interview_access' then
    mutate_access_key := true;
    next_access_value := p_next_star_interview_access;
  else
    mutate_access_key := coalesce(jsonb_typeof(previous_access_value), '') <> 'boolean';
    next_access_value := case
      when mutate_access_key then target_profile.role = 'admin'
      else previous_access_value = 'true'::jsonb
    end;
  end if;

  token := gen_random_uuid();
  insert into public.admin_user_mutation_guards (
    target_user_id,
    reservation_token,
    actor_user_id,
    mutation_kind,
    actor_is_primary,
    actor_auth_updated_at,
    actor_profile_updated_at,
    target_is_primary,
    previous_role,
    previous_display_name,
    previous_banned_until,
    previous_access_key_present,
    previous_access_value,
    next_role,
    next_disabled,
    mutate_access_key,
    next_access_value
  ) values (
    p_target_user_id,
    token,
    p_actor_user_id,
    p_mutation_kind,
    actor_is_primary,
    actor_auth.updated_at,
    actor_profile.updated_at,
    target_is_primary,
    target_profile.role,
    target_profile.display_name,
    target_auth.banned_until,
    previous_access_key_present,
    previous_access_value,
    resolved_next_role,
    resolved_next_disabled,
    mutate_access_key,
    next_access_value
  );

  return jsonb_build_object(
    'action', 'claimed',
    'reservation_token', token,
    'mutation_kind', p_mutation_kind,
    'current_role', target_profile.role,
    'current_disabled', coalesce(target_auth.banned_until > now(), false),
    'previous_banned_until', target_auth.banned_until,
    'previous_access_key_present', previous_access_key_present,
    'previous_access_value', previous_access_value,
    'next_role', resolved_next_role,
    'next_disabled', resolved_next_disabled,
    'mutate_access_key', mutate_access_key,
    'next_access_value', next_access_value
  );
end;
$$;

create or replace function public.finalize_admin_user_mutation(
  p_reservation_token uuid,
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_display_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  guard public.admin_user_mutation_guards%rowtype;
  actor_auth auth.users%rowtype;
  target_auth auth.users%rowtype;
  actor_profile public.profiles%rowtype;
  target_profile public.profiles%rowtype;
  actor_is_primary boolean;
  target_is_primary boolean;
  target_access_present boolean;
  target_access_value jsonb;
  changes_admin_role boolean;
  resolved_display_name text;
begin
  if p_reservation_token is null
    or p_actor_user_id is null
    or p_target_user_id is null then
    raise exception 'invalid admin user mutation finalization';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'admin-user-mutation:' || least(p_actor_user_id::text, p_target_user_id::text),
      0
    )
  );
  if p_actor_user_id <> p_target_user_id then
    perform pg_advisory_xact_lock(
      hashtextextended(
        'admin-user-mutation:' || greatest(p_actor_user_id::text, p_target_user_id::text),
        0
      )
    );
  end if;

  select * into guard
  from public.admin_user_mutation_guards
  where target_user_id = p_target_user_id
  for update;
  if not found
    or guard.reservation_token <> p_reservation_token
    or guard.actor_user_id <> p_actor_user_id
    or guard.recovery_requested_at is not null then
    return jsonb_build_object(
      'action', 'stale',
      'code', 'ADMIN_MUTATION_STALE',
      'error', '账户管理操作已失效，请刷新后重试。'
    );
  end if;

  select * into actor_auth from auth.users
  where id = p_actor_user_id for share;
  select * into actor_profile from public.profiles
  where id = p_actor_user_id for share;
  if actor_profile.role is distinct from 'admin'
    or coalesce(actor_auth.banned_until > now(), false)
    or actor_profile.updated_at is distinct from guard.actor_profile_updated_at
    or (p_actor_user_id <> p_target_user_id
      and actor_auth.updated_at is distinct from guard.actor_auth_updated_at)
    or exists (
      select 1
      from public.admin_user_mutation_guards actor_guard
      where actor_guard.target_user_id = p_actor_user_id
        and not (
          actor_guard.target_user_id = p_target_user_id
          and actor_guard.reservation_token = p_reservation_token
        )
    ) then
    return jsonb_build_object(
      'action', 'forbidden',
      'code', 'ADMIN_ACTOR_REVOKED',
      'error', '管理员权限或账号状态已发生变化，目标账户已保持锁定。'
    );
  end if;
  actor_is_primary := lower(coalesce(actor_auth.email, '')) = 'raywang6688@outlook.com';
  if actor_is_primary is distinct from guard.actor_is_primary then
    return jsonb_build_object(
      'action', 'forbidden',
      'code', 'ADMIN_ACTOR_REVOKED',
      'error', '管理员身份已发生变化，目标账户已保持锁定。'
    );
  end if;

  select * into target_auth from auth.users
  where id = p_target_user_id for update;
  select * into target_profile from public.profiles
  where id = p_target_user_id for update;
  if not found
    or target_profile.role is distinct from guard.previous_role
    or target_profile.display_name is distinct from guard.previous_display_name then
    return jsonb_build_object(
      'action', 'conflict',
      'code', 'ADMIN_TARGET_PROFILE_CHANGED',
      'error', '目标账户资料已发生变化，目标账户已保持锁定。'
    );
  end if;

  target_is_primary := lower(coalesce(target_auth.email, '')) = 'raywang6688@outlook.com';
  target_access_present := coalesce(target_auth.raw_app_meta_data, '{}'::jsonb)
    ? 'star_interview_unlimited_access';
  target_access_value := coalesce(target_auth.raw_app_meta_data, '{}'::jsonb)
    -> 'star_interview_unlimited_access';
  if target_is_primary is distinct from guard.target_is_primary
    or (
      coalesce(guard.previous_banned_until > now(), false)
        is distinct from guard.next_disabled
      and coalesce(target_auth.banned_until > now(), false)
        is distinct from guard.next_disabled
    )
    or (
      coalesce(guard.previous_banned_until > now(), false)
        is not distinct from guard.next_disabled
      and target_auth.banned_until is distinct from guard.previous_banned_until
    )
    or (guard.mutate_access_key and target_access_value is distinct from to_jsonb(guard.next_access_value))
    or (not guard.mutate_access_key and (
      target_access_present is distinct from guard.previous_access_key_present
      or target_access_value is distinct from guard.previous_access_value
    )) then
    return jsonb_build_object(
      'action', 'conflict',
      'code', 'ADMIN_TARGET_AUTH_CHANGED',
      'error', '目标账户认证状态未达到预期，目标账户已保持锁定。'
    );
  end if;

  if guard.actor_user_id = guard.target_user_id
    and (guard.next_disabled or guard.next_role <> 'admin') then
    return jsonb_build_object(
      'action', 'forbidden',
      'code', 'ADMIN_SELF_PROTECTED',
      'error', '不能停用或降级当前管理员账号。'
    );
  end if;
  if guard.target_is_primary
    and (guard.next_disabled or guard.next_role <> 'admin') then
    return jsonb_build_object(
      'action', 'forbidden',
      'code', 'PRIMARY_ADMIN_PROTECTED',
      'error', '主管理员账号不能被停用或降级。'
    );
  end if;
  changes_admin_role := target_profile.role <> guard.next_role
    and (target_profile.role = 'admin' or guard.next_role = 'admin');
  if guard.mutation_kind = 'star_interview_access' and not actor_is_primary then
    return jsonb_build_object(
      'action', 'forbidden',
      'code', 'PRIMARY_ADMIN_REQUIRED',
      'error', '只有主管理员可以调整 StarInterview 无限访问。'
    );
  end if;
  if guard.mutation_kind = 'profile_auth'
    and not actor_is_primary
    and (changes_admin_role or (target_profile.role = 'admin' and guard.next_disabled)) then
    return jsonb_build_object(
      'action', 'forbidden',
      'code', 'PRIMARY_ADMIN_REQUIRED',
      'error', '只有主管理员可以调整管理员角色或停用管理员账号。'
    );
  end if;

  resolved_display_name := case
    when guard.mutation_kind = 'profile_auth' then left(
      coalesce(nullif(trim(p_display_name), ''), '秋招用户'),
      60
    )
    else target_profile.display_name
  end;
  if guard.mutation_kind = 'profile_auth' then
    update public.profiles
    set display_name = resolved_display_name,
        role = guard.next_role,
        updated_at = now()
    where id = p_target_user_id;
  end if;

  delete from public.admin_user_mutation_guards
  where target_user_id = p_target_user_id
    and reservation_token = p_reservation_token;

  return jsonb_build_object(
    'action', 'applied',
    'role', guard.next_role,
    'display_name', resolved_display_name
  );
end;
$$;

-- Cancellation is not a blind unlock. It only succeeds while the mutation's
-- Auth/Profile fields are provably still at their effective pre-mutation state.
create or replace function public.cancel_admin_user_mutation(
  p_reservation_token uuid,
  p_actor_user_id uuid,
  p_target_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  guard public.admin_user_mutation_guards%rowtype;
  actor_auth auth.users%rowtype;
  actor_profile public.profiles%rowtype;
  target_auth auth.users%rowtype;
  target_profile public.profiles%rowtype;
  target_access_present boolean;
  target_access_value jsonb;
begin
  perform pg_advisory_xact_lock(
    hashtextextended(
      'admin-user-mutation:' || least(p_actor_user_id::text, p_target_user_id::text),
      0
    )
  );
  if p_actor_user_id <> p_target_user_id then
    perform pg_advisory_xact_lock(
      hashtextextended(
        'admin-user-mutation:' || greatest(p_actor_user_id::text, p_target_user_id::text),
        0
      )
    );
  end if;

  select * into guard from public.admin_user_mutation_guards
  where target_user_id = p_target_user_id for update;
  if not found
    or guard.reservation_token <> p_reservation_token
    or guard.actor_user_id <> p_actor_user_id
    or guard.recovery_requested_at is not null then
    return false;
  end if;

  select * into actor_auth from auth.users where id = p_actor_user_id for share;
  select * into actor_profile from public.profiles where id = p_actor_user_id for share;
  if actor_profile.role is distinct from 'admin'
    or coalesce(actor_auth.banned_until > now(), false)
    or actor_profile.updated_at is distinct from guard.actor_profile_updated_at
    or (p_actor_user_id <> p_target_user_id
      and actor_auth.updated_at is distinct from guard.actor_auth_updated_at)
    or exists (
      select 1
      from public.admin_user_mutation_guards actor_guard
      where actor_guard.target_user_id = p_actor_user_id
        and not (
          actor_guard.target_user_id = p_target_user_id
          and actor_guard.reservation_token = p_reservation_token
        )
    ) then
    return false;
  end if;

  select * into target_auth from auth.users where id = p_target_user_id for update;
  select * into target_profile from public.profiles where id = p_target_user_id for update;
  target_access_present := coalesce(target_auth.raw_app_meta_data, '{}'::jsonb)
    ? 'star_interview_unlimited_access';
  target_access_value := coalesce(target_auth.raw_app_meta_data, '{}'::jsonb)
    -> 'star_interview_unlimited_access';
  if target_profile.role is distinct from guard.previous_role
    or target_profile.display_name is distinct from guard.previous_display_name
    or target_auth.banned_until is distinct from guard.previous_banned_until
    or (guard.previous_access_key_present and (
      not target_access_present
      or target_access_value is distinct from guard.previous_access_value
    ))
    or (not guard.previous_access_key_present
      and target_access_present
      and target_access_value <> 'null'::jsonb) then
    return false;
  end if;

  delete from public.admin_user_mutation_guards
  where target_user_id = p_target_user_id
    and reservation_token = p_reservation_token;
  return true;
end;
$$;

-- No TTL or blind delete exists. Recovery is deliberately two-phase: the
-- first call freezes finalize/cancel and starts a quiescence window longer
-- than the route's declared maximum execution time. Only a later call may
-- restore the exact snapshot and unlock. This fences a paused old request from
-- waking after recovery and overwriting a newer mutation through GoTrue.
create or replace function public.recover_admin_user_mutation(
  p_primary_user_id uuid,
  p_target_user_id uuid,
  p_reservation_token uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  guard public.admin_user_mutation_guards%rowtype;
  primary_auth auth.users%rowtype;
  primary_profile public.profiles%rowtype;
  target_auth auth.users%rowtype;
  target_profile public.profiles%rowtype;
  restored_metadata jsonb;
  quiesce_seconds constant integer := 300;
  retry_after_seconds integer;
begin
  if p_primary_user_id is null
    or p_target_user_id is null
    or p_reservation_token is null
    or char_length(trim(coalesce(p_reason, ''))) not between 2 and 200 then
    raise exception 'invalid admin mutation recovery';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'admin-user-mutation:' || least(p_primary_user_id::text, p_target_user_id::text),
      0
    )
  );
  if p_primary_user_id <> p_target_user_id then
    perform pg_advisory_xact_lock(
      hashtextextended(
        'admin-user-mutation:' || greatest(p_primary_user_id::text, p_target_user_id::text),
        0
      )
    );
  end if;

  select * into primary_auth from auth.users
  where id = p_primary_user_id for share;
  select * into primary_profile from public.profiles
  where id = p_primary_user_id for share;
  if lower(coalesce(primary_auth.email, '')) <> 'raywang6688@outlook.com'
    or primary_profile.role is distinct from 'admin'
    or coalesce(primary_auth.banned_until > now(), false) then
    return jsonb_build_object(
      'action', 'forbidden',
      'code', 'PRIMARY_ADMIN_REQUIRED',
      'error', '只有当前启用的主管理员可以恢复账户安全操作。'
    );
  end if;
  if p_primary_user_id <> p_target_user_id and exists (
    select 1 from public.admin_user_mutation_guards
    where target_user_id = p_primary_user_id
  ) then
    return jsonb_build_object(
      'action', 'forbidden',
      'code', 'PRIMARY_ADMIN_RECOVERY_REQUIRED',
      'error', '主管理员自身存在未完成操作，请先恢复主管理员账号。'
    );
  end if;

  select * into guard from public.admin_user_mutation_guards
  where target_user_id = p_target_user_id for update;
  if not found then
    return jsonb_build_object(
      'action', 'missing',
      'code', 'ADMIN_MUTATION_NOT_FOUND',
      'error', '该账户没有需要恢复的安全操作。'
    );
  end if;
  if guard.reservation_token <> p_reservation_token then
    return jsonb_build_object(
      'action', 'stale',
      'code', 'ADMIN_MUTATION_STALE',
      'error', '待恢复的安全操作已不是当前代次，请重新核对后操作。'
    );
  end if;

  if guard.recovery_requested_at is null then
    update public.admin_user_mutation_guards
    set recovery_requested_at = clock_timestamp(),
        recovery_requested_by_user_id = p_primary_user_id,
        recovery_reason = left(trim(p_reason), 200),
        updated_at = clock_timestamp()
    where target_user_id = p_target_user_id
      and reservation_token = guard.reservation_token;

    return jsonb_build_object(
      'action', 'quiescing',
      'code', 'ADMIN_MUTATION_QUIESCING',
      'error', '安全恢复已进入静默期，请在 5 分钟后再次确认恢复。',
      'retry_after_seconds', quiesce_seconds
    );
  end if;

  retry_after_seconds := greatest(
    0,
    ceil(extract(epoch from (
      guard.recovery_requested_at + make_interval(secs => quiesce_seconds)
      - clock_timestamp()
    )))::integer
  );
  if retry_after_seconds > 0 then
    return jsonb_build_object(
      'action', 'quiescing',
      'code', 'ADMIN_MUTATION_QUIESCING',
      'error', '安全恢复仍在静默期，请稍后再次确认恢复。',
      'retry_after_seconds', retry_after_seconds
    );
  end if;

  -- A guarded workflow never changes profiles until finalize, and finalize
  -- deletes the guard in the same transaction. Therefore a surviving guard
  -- must not overwrite a display-name edit the target made meanwhile. The role
  -- is security-sensitive and cannot be repaired safely if another path changed
  -- it, so preserve the guard and require investigation in that case.
  select * into target_auth from auth.users
  where id = p_target_user_id for update;
  if not found then
    return jsonb_build_object(
      'action', 'conflict',
      'code', 'ADMIN_TARGET_AUTH_CHANGED',
      'error', '目标账户认证记录已发生变化，安全恢复已停止，请先核对数据库状态。'
    );
  end if;

  select * into target_profile from public.profiles
  where id = p_target_user_id for update;
  if not found or target_profile.role is distinct from guard.previous_role then
    return jsonb_build_object(
      'action', 'conflict',
      'code', 'ADMIN_TARGET_PROFILE_CHANGED',
      'error', '目标账户身份已发生变化，安全恢复已停止，请先核对数据库状态。'
    );
  end if;

  restored_metadata := coalesce(target_auth.raw_app_meta_data, '{}'::jsonb);
  if guard.previous_access_key_present then
    restored_metadata := jsonb_set(
      restored_metadata,
      '{star_interview_unlimited_access}',
      guard.previous_access_value,
      true
    );
  else
    restored_metadata := restored_metadata - 'star_interview_unlimited_access';
  end if;

  update auth.users
  set banned_until = guard.previous_banned_until,
      raw_app_meta_data = restored_metadata,
      updated_at = now()
  where id = p_target_user_id;

  insert into public.admin_user_mutation_recoveries (
    reservation_token,
    target_user_id,
    original_actor_user_id,
    recovered_by_user_id,
    mutation_kind,
    reason
  ) values (
    guard.reservation_token,
    guard.target_user_id,
    guard.actor_user_id,
    p_primary_user_id,
    guard.mutation_kind,
    guard.recovery_reason
  );

  delete from public.admin_user_mutation_guards
  where target_user_id = p_target_user_id
    and reservation_token = guard.reservation_token;

  return jsonb_build_object(
    'action', 'recovered',
    'role', target_profile.role,
    'display_name', target_profile.display_name
  );
end;
$$;

revoke all on function public.reserve_admin_user_mutation(
  uuid, uuid, text, text, boolean, boolean
) from public, anon, authenticated;
revoke all on function public.finalize_admin_user_mutation(
  uuid, uuid, uuid, text
) from public, anon, authenticated;
revoke all on function public.cancel_admin_user_mutation(
  uuid, uuid, uuid
) from public, anon, authenticated;
revoke all on function public.recover_admin_user_mutation(
  uuid, uuid, uuid, text
) from public, anon, authenticated;
revoke all on function public.adjust_star_interview_admin_grant(
  uuid, bigint, text, text, uuid
) from public, anon, authenticated;

grant execute on function public.reserve_admin_user_mutation(
  uuid, uuid, text, text, boolean, boolean
) to service_role;
grant execute on function public.finalize_admin_user_mutation(
  uuid, uuid, uuid, text
) to service_role;
grant execute on function public.cancel_admin_user_mutation(
  uuid, uuid, uuid
) to service_role;
grant execute on function public.recover_admin_user_mutation(
  uuid, uuid, uuid, text
) to service_role;
grant execute on function public.adjust_star_interview_admin_grant(
  uuid, bigint, text, text, uuid
) to service_role;

commit;
