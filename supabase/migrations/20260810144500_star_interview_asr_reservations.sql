create extension if not exists pg_cron;

begin;

-- Preserve the rolling-deploy implementation behind a private compatibility
-- name. The public signature below coordinates older post-charge ASR workers
-- with the new durable reservation row before delegating all other traffic.
alter function public.consume_star_interview_usage(uuid, text, text, bigint, boolean)
  rename to consume_star_interview_usage_before_asr_reservations;

create table public.star_interview_asr_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meter_key text not null
    check (meter_key ~* '^v2:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[0-9a-f]{64}$'),
  state text not null default 'failed'
    check (state in ('reserved', 'succeeded', 'consumed', 'failed')),
  reservation_token uuid,
  lease_expires_at timestamptz,
  units bigint not null check (units between 1 and 45000),
  unlimited boolean not null default false,
  reserved_fen bigint not null default 0 check (reserved_fen >= 0),
  actual_charge_fen bigint not null default 0 check (actual_charge_fen >= 0),
  nominal_charge_fen bigint not null default 0 check (nominal_charge_fen >= 0),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text,
  response_body text check (response_body is null or char_length(response_body) between 1 and 20000),
  completed_at timestamptz,
  cache_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, meter_key),
  check (
    (state = 'reserved' and reservation_token is not null and lease_expires_at is not null)
    or (state in ('succeeded', 'consumed', 'failed') and reservation_token is null and lease_expires_at is null)
  ),
  check (
    (state = 'succeeded' and response_body is not null)
    or (state <> 'succeeded' and response_body is null)
  ),
  check (
    (state = 'succeeded' and cache_expires_at is not null)
    or (state <> 'succeeded' and cache_expires_at is null)
  )
);

create index star_interview_asr_requests_lease_idx
  on public.star_interview_asr_requests (lease_expires_at, user_id)
  where state = 'reserved';

create index star_interview_asr_requests_cache_idx
  on public.star_interview_asr_requests (cache_expires_at, user_id)
  where state = 'succeeded';

alter table public.star_interview_asr_requests enable row level security;
revoke all on table public.star_interview_asr_requests
  from public, anon, authenticated;
grant select, insert, update, delete on table public.star_interview_asr_requests
  to service_role;

create or replace function public.reserve_star_interview_asr(
  p_user_id uuid,
  p_meter_key text,
  p_units bigint,
  p_unlimited boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  account_auth auth.users%rowtype;
  account_profile public.profiles%rowtype;
  wallet public.star_interview_wallets%rowtype;
  asr_request public.star_interview_asr_requests%rowtype;
  meter public.star_interview_usage_meters%rowtype;
  legacy_meter public.star_interview_usage_meters%rowtype;
  legacy_meter_key uuid;
  alias_v2_key text;
  token uuid;
  lease_deadline timestamptz;
  expired_release bigint;
  new_total_cost bigint;
  delta_cost bigint;
  actual_reserve bigint;
  resolved_unlimited boolean;
begin
  if p_user_id is null
    or p_meter_key !~* '^v2:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[0-9a-f]{64}$'
    or p_units not between 1 and 45000
    or p_unlimited is null then
    raise exception 'invalid StarInterview ASR reservation';
  end if;

  -- Serialize with administrator target mutations, then derive access from
  -- the authoritative Auth/Profile snapshot. p_unlimited remains only for
  -- rolling API compatibility and is never trusted for billing.
  perform pg_advisory_xact_lock(
    hashtextextended('admin-user-mutation:' || p_user_id::text, 0)
  );
  select * into account_auth from auth.users
  where id = p_user_id for share;
  if not found then
    return jsonb_build_object(
      'action', 'forbidden', 'allowed', false,
      'code', 'STAR_INTERVIEW_ACCOUNT_UNAVAILABLE',
      'balance_fen', 0, 'required_fen', 0,
      'nominal_charge_fen', 0, 'actual_charge_fen', 0
    );
  end if;
  select * into account_profile from public.profiles
  where id = p_user_id for share;
  if not found
    or coalesce(account_auth.banned_until > now(), false)
    or exists (
      select 1 from public.admin_user_mutation_guards
      where target_user_id = p_user_id
    ) then
    return jsonb_build_object(
      'action', 'forbidden', 'allowed', false,
      'code', 'STAR_INTERVIEW_ACCOUNT_RECOVERY_REQUIRED',
      'balance_fen', 0, 'required_fen', 0,
      'nominal_charge_fen', 0, 'actual_charge_fen', 0
    );
  end if;
  resolved_unlimited := case
    when jsonb_typeof(
      coalesce(account_auth.raw_app_meta_data, '{}'::jsonb)
        -> 'star_interview_unlimited_access'
    ) = 'boolean'
      then (account_auth.raw_app_meta_data->>'star_interview_unlimited_access')::boolean
    else account_profile.role = 'admin'
  end;

  perform pg_advisory_xact_lock(
    hashtextextended('star_interview_asr:' || p_user_id::text, 0)
  );

  insert into public.star_interview_wallets (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into wallet
  from public.star_interview_wallets
  where user_id = p_user_id
  for update;

  -- Release every expired hold for this active user before calculating a new
  -- delta. The scheduled reconciler performs the same operation globally.
  with expired as (
    select id, reserved_fen
    from public.star_interview_asr_requests
    where user_id = p_user_id
      and state = 'reserved'
      and (lease_expires_at is null or lease_expires_at <= now())
    for update
  ), released as (
    update public.star_interview_asr_requests as target
    set state = 'failed',
        reservation_token = null,
        lease_expires_at = null,
        reserved_fen = 0,
        actual_charge_fen = 0,
        response_body = null,
        cache_expires_at = null,
        last_error = 'ASR reservation lease expired',
        completed_at = null,
        updated_at = now()
    from expired
    where target.id = expired.id
    returning expired.reserved_fen
  )
  select coalesce(sum(reserved_fen), 0) into expired_release
  from released;

  if expired_release > 0 then
    update public.star_interview_wallets
    set balance_fen = balance_fen + expired_release,
        updated_at = now()
    where user_id = p_user_id
    returning * into wallet;
  end if;

  -- Reuse the one-account compatibility alias introduced by 143000. Claiming
  -- an unused bridge during its bounded rollout window also coordinates an
  -- older raw-UUID worker that has not written its legacy meter yet.
  legacy_meter_key := split_part(p_meter_key, ':', 2)::uuid;
  alias_v2_key := null;
  select v2_meter_key into alias_v2_key
  from public.star_interview_asr_meter_aliases
  where user_id = p_user_id
  for update;

  if not found and now() < timestamptz '2026-08-17 00:00:00+00' then
    insert into public.star_interview_asr_meter_aliases (
      user_id, legacy_meter_key, v2_meter_key
    ) values (
      p_user_id, legacy_meter_key, p_meter_key
    )
    on conflict (user_id) do nothing;

    select v2_meter_key into alias_v2_key
    from public.star_interview_asr_meter_aliases
    where user_id = p_user_id
    for update;
  end if;

  if alias_v2_key = p_meter_key then
    select * into legacy_meter
    from public.star_interview_usage_meters
    where user_id = p_user_id
      and feature = 'asr'
      and meter_key = legacy_meter_key::text
    for update;

    if found then
      insert into public.star_interview_usage_meters (
        user_id, feature, meter_key, max_units, nominal_cost_fen
      ) values (
        p_user_id, 'asr', p_meter_key,
        legacy_meter.max_units, legacy_meter.nominal_cost_fen
      )
      on conflict (user_id, feature, meter_key) do update
      set max_units = greatest(
            public.star_interview_usage_meters.max_units,
            excluded.max_units
          ),
          nominal_cost_fen = greatest(
            public.star_interview_usage_meters.nominal_cost_fen,
            excluded.nominal_cost_fen
          ),
          updated_at = now();

      delete from public.star_interview_usage_meters
      where user_id = p_user_id
        and feature = 'asr'
        and meter_key = legacy_meter_key::text;
    end if;
  end if;

  insert into public.star_interview_usage_meters (user_id, feature, meter_key)
  values (p_user_id, 'asr', p_meter_key)
  on conflict (user_id, feature, meter_key) do nothing;

  select * into meter
  from public.star_interview_usage_meters
  where user_id = p_user_id
    and feature = 'asr'
    and meter_key = p_meter_key
  for update;

  select * into asr_request
  from public.star_interview_asr_requests
  where user_id = p_user_id and meter_key = p_meter_key
  for update;

  if found
    and asr_request.state = 'succeeded'
    and asr_request.cache_expires_at > now() then
    return jsonb_build_object(
      'action', 'cached',
      'allowed', true,
      'balance_fen', wallet.balance_fen,
      'required_fen', 0,
      'nominal_charge_fen', 0,
      'actual_charge_fen', 0,
      'response_body', asr_request.response_body
    );
  elsif found and asr_request.state = 'succeeded' then
    update public.star_interview_asr_requests
    set state = 'consumed',
        response_body = null,
        cache_expires_at = null,
        last_error = 'ASR transcript cache expired',
        updated_at = now()
    where id = asr_request.id;
    return jsonb_build_object(
      'action', 'consumed',
      'allowed', false,
      'balance_fen', wallet.balance_fen,
      'required_fen', 0,
      'nominal_charge_fen', 0,
      'actual_charge_fen', 0
    );
  elsif found and asr_request.state = 'consumed' then
    return jsonb_build_object(
      'action', 'consumed',
      'allowed', false,
      'balance_fen', wallet.balance_fen,
      'required_fen', 0,
      'nominal_charge_fen', 0,
      'actual_charge_fen', 0
    );
  elsif found and asr_request.state = 'reserved' then
    return jsonb_build_object(
      'action', 'in_progress',
      'allowed', false,
      'balance_fen', wallet.balance_fen,
      'required_fen', 0,
      'nominal_charge_fen', 0,
      'actual_charge_fen', 0,
      'lease_expires_at', asr_request.lease_expires_at
    );
  elsif not found then
    insert into public.star_interview_asr_requests (
      user_id, meter_key, state, units, unlimited
    ) values (
      p_user_id, p_meter_key, 'failed', p_units, resolved_unlimited
    )
    returning * into asr_request;
  end if;

  new_total_cost := greatest(
    meter.nominal_cost_fen,
    ceil(greatest(p_units, meter.max_units)::numeric * 40 / 60000)::bigint
  );
  delta_cost := greatest(0, new_total_cost - meter.nominal_cost_fen);
  actual_reserve := case when resolved_unlimited then 0 else delta_cost end;

  if actual_reserve > wallet.balance_fen then
    return jsonb_build_object(
      'action', 'insufficient',
      'allowed', false,
      'balance_fen', wallet.balance_fen,
      'required_fen', actual_reserve,
      'nominal_charge_fen', delta_cost,
      'actual_charge_fen', 0
    );
  end if;

  token := gen_random_uuid();
  lease_deadline := now() + interval '120 seconds';

  update public.star_interview_wallets
  set balance_fen = balance_fen - actual_reserve,
      updated_at = now()
  where user_id = p_user_id
  returning * into wallet;

  update public.star_interview_asr_requests
  set state = 'reserved',
      reservation_token = token,
      lease_expires_at = lease_deadline,
      units = p_units,
      unlimited = resolved_unlimited,
      reserved_fen = actual_reserve,
      actual_charge_fen = 0,
      nominal_charge_fen = delta_cost,
      response_body = null,
      cache_expires_at = null,
      attempt_count = attempt_count + 1,
      last_error = null,
      completed_at = null,
      updated_at = now()
  where id = asr_request.id;

  return jsonb_build_object(
    'action', 'claimed',
    'allowed', true,
    'reservation_token', token,
    'lease_expires_at', lease_deadline,
    'balance_fen', wallet.balance_fen,
    'required_fen', 0,
    'nominal_charge_fen', delta_cost,
    'actual_charge_fen', actual_reserve
  );
end;
$$;

create or replace function public.confirm_star_interview_asr_dispatch(
  p_user_id uuid,
  p_meter_key text,
  p_reservation_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  account_auth auth.users%rowtype;
  account_profile public.profiles%rowtype;
  asr_request public.star_interview_asr_requests%rowtype;
  resolved_unlimited boolean;
begin
  if p_user_id is null
    or p_meter_key !~* '^v2:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[0-9a-f]{64}$'
    or p_reservation_token is null then
    raise exception 'invalid StarInterview ASR dispatch confirmation';
  end if;

  -- This is the last durable gate before fetch(). It closes the interval
  -- between the initial access check/reservation and provider dispatch.
  perform pg_advisory_xact_lock(
    hashtextextended('admin-user-mutation:' || p_user_id::text, 0)
  );
  select * into account_auth from auth.users
  where id = p_user_id for share;
  select * into account_profile from public.profiles
  where id = p_user_id for share;
  if account_auth.id is null
    or account_profile.id is null
    or coalesce(account_auth.banned_until > now(), false)
    or exists (
      select 1 from public.admin_user_mutation_guards
      where target_user_id = p_user_id
    ) then
    return jsonb_build_object(
      'action', 'forbidden',
      'allowed', false,
      'code', 'STAR_INTERVIEW_ACCOUNT_RECOVERY_REQUIRED',
      'balance_fen', 0,
      'required_fen', 0,
      'nominal_charge_fen', 0,
      'actual_charge_fen', 0
    );
  end if;
  resolved_unlimited := case
    when jsonb_typeof(
      coalesce(account_auth.raw_app_meta_data, '{}'::jsonb)
        -> 'star_interview_unlimited_access'
    ) = 'boolean'
      then (account_auth.raw_app_meta_data->>'star_interview_unlimited_access')::boolean
    else account_profile.role = 'admin'
  end;

  perform pg_advisory_xact_lock(
    hashtextextended('star_interview_asr:' || p_user_id::text, 0)
  );
  select * into asr_request
  from public.star_interview_asr_requests
  where user_id = p_user_id and meter_key = p_meter_key
  for update;
  if not found
    or asr_request.state <> 'reserved'
    or asr_request.reservation_token <> p_reservation_token
    or asr_request.lease_expires_at <= now() then
    return jsonb_build_object(
      'action', 'stale',
      'allowed', false,
      'balance_fen', 0,
      'required_fen', 0,
      'nominal_charge_fen', 0,
      'actual_charge_fen', 0
    );
  end if;

  if asr_request.unlimited is distinct from resolved_unlimited
    or asr_request.reserved_fen <> (case
      when resolved_unlimited then 0
      else asr_request.nominal_charge_fen
    end) then
    return jsonb_build_object(
      'action', 'forbidden',
      'allowed', false,
      'code', 'STAR_INTERVIEW_ACCESS_MODE_CHANGED',
      'balance_fen', 0,
      'required_fen', 0,
      'nominal_charge_fen', 0,
      'actual_charge_fen', 0
    );
  end if;

  return jsonb_build_object(
    'action', 'confirmed',
    'allowed', true,
    'balance_fen', 0,
    'required_fen', 0,
    'nominal_charge_fen', asr_request.nominal_charge_fen,
    'actual_charge_fen', asr_request.reserved_fen
  );
end;
$$;

create or replace function public.complete_star_interview_asr(
  p_user_id uuid,
  p_meter_key text,
  p_reservation_token uuid,
  p_response_body text,
  p_consumed boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  wallet public.star_interview_wallets%rowtype;
  asr_request public.star_interview_asr_requests%rowtype;
  meter public.star_interview_usage_meters%rowtype;
  new_total_cost bigint;
  delta_cost bigint;
  actual_charge bigint;
  released_fen bigint;
  ledger_reference text;
begin
  if p_user_id is null
    or p_meter_key !~* '^v2:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[0-9a-f]{64}$'
    or p_reservation_token is null
    or p_consumed is null
    or (not p_consumed and char_length(trim(coalesce(p_response_body, ''))) not between 1 and 20000)
    or (p_consumed and p_response_body is not null) then
    raise exception 'invalid StarInterview ASR completion';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('star_interview_asr:' || p_user_id::text, 0)
  );

  select * into wallet
  from public.star_interview_wallets
  where user_id = p_user_id
  for update;

  select * into asr_request
  from public.star_interview_asr_requests
  where user_id = p_user_id and meter_key = p_meter_key
  for update;

  if not found then
    return jsonb_build_object(
      'action', 'stale', 'allowed', false,
      'balance_fen', coalesce(wallet.balance_fen, 0)
    );
  end if;

  -- A lost RPC response after commit is safe to retry. A newer reservation has
  -- a non-null different token and therefore cannot be mistaken for this one.
  if asr_request.state in ('succeeded', 'consumed') then
    return jsonb_build_object(
      'action', 'completed',
      'allowed', true,
      'balance_fen', wallet.balance_fen,
      'required_fen', 0,
      'nominal_charge_fen', asr_request.nominal_charge_fen,
      'actual_charge_fen', asr_request.actual_charge_fen,
      'response_body', asr_request.response_body,
      'consumed', asr_request.state = 'consumed'
    );
  end if;

  if asr_request.state <> 'reserved'
    or asr_request.reservation_token <> p_reservation_token then
    return jsonb_build_object(
      'action', 'stale', 'allowed', false,
      'balance_fen', wallet.balance_fen
    );
  end if;

  insert into public.star_interview_usage_meters (user_id, feature, meter_key)
  values (p_user_id, 'asr', p_meter_key)
  on conflict (user_id, feature, meter_key) do nothing;

  select * into meter
  from public.star_interview_usage_meters
  where user_id = p_user_id
    and feature = 'asr'
    and meter_key = p_meter_key
  for update;

  new_total_cost := greatest(
    meter.nominal_cost_fen,
    ceil(greatest(asr_request.units, meter.max_units)::numeric * 40 / 60000)::bigint
  );
  delta_cost := greatest(0, new_total_cost - meter.nominal_cost_fen);
  actual_charge := case when asr_request.unlimited then 0 else delta_cost end;

  if delta_cost > asr_request.nominal_charge_fen
    or actual_charge > asr_request.reserved_fen then
    return jsonb_build_object(
      'action', 'stale',
      'allowed', false,
      'balance_fen', wallet.balance_fen,
      'required_fen', actual_charge,
      'nominal_charge_fen', delta_cost,
      'actual_charge_fen', 0
    );
  end if;

  released_fen := asr_request.reserved_fen - actual_charge;

  update public.star_interview_usage_meters
  set max_units = greatest(max_units, asr_request.units),
      nominal_cost_fen = new_total_cost,
      updated_at = now()
  where user_id = p_user_id
    and feature = 'asr'
    and meter_key = p_meter_key;

  update public.star_interview_wallets
  set balance_fen = balance_fen + released_fen,
      total_spent_fen = total_spent_fen + actual_charge,
      nominal_spent_fen = nominal_spent_fen + delta_cost,
      updated_at = now()
  where user_id = p_user_id
  returning * into wallet;

  if delta_cost > 0 then
    ledger_reference := 'usage:asr:' || p_meter_key || ':' || new_total_cost::text;
    insert into public.star_interview_ledger (
      user_id, entry_type, amount_fen, nominal_amount_fen, balance_after_fen,
      feature, units, reference_key, note, metadata
    ) values (
      p_user_id, 'usage', -actual_charge, -delta_cost, wallet.balance_fen,
      'asr', asr_request.units, ledger_reference,
      case when asr_request.unlimited then '无限账户影子消耗' else '按量使用' end,
      jsonb_build_object(
        'unlimited', asr_request.unlimited,
        'durable_reservation', true,
        'request_id', asr_request.id
      )
    )
    on conflict (user_id, reference_key) do nothing;
  end if;

  update public.star_interview_asr_requests
  set state = case when p_consumed then 'consumed' else 'succeeded' end,
      reservation_token = null,
      lease_expires_at = null,
      reserved_fen = 0,
      actual_charge_fen = actual_charge,
      nominal_charge_fen = delta_cost,
      response_body = case when p_consumed then null else trim(p_response_body) end,
      cache_expires_at = case when p_consumed then null else now() + interval '24 hours' end,
      last_error = case when p_consumed then 'caller cancelled after dispatch' else null end,
      completed_at = now(),
      updated_at = now()
  where id = asr_request.id
    and reservation_token = p_reservation_token;

  return jsonb_build_object(
    'action', 'completed',
    'allowed', true,
    'balance_fen', wallet.balance_fen,
    'required_fen', 0,
    'nominal_charge_fen', delta_cost,
    'actual_charge_fen', actual_charge,
    'response_body', case when p_consumed then null else trim(p_response_body) end,
    'consumed', p_consumed
  );
end;
$$;

create or replace function public.fail_star_interview_asr(
  p_user_id uuid,
  p_meter_key text,
  p_reservation_token uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  wallet public.star_interview_wallets%rowtype;
  asr_request public.star_interview_asr_requests%rowtype;
begin
  if p_user_id is null
    or p_meter_key !~* '^v2:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[0-9a-f]{64}$'
    or p_reservation_token is null then
    raise exception 'invalid StarInterview ASR failure';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('star_interview_asr:' || p_user_id::text, 0)
  );

  select * into wallet
  from public.star_interview_wallets
  where user_id = p_user_id
  for update;

  select * into asr_request
  from public.star_interview_asr_requests
  where user_id = p_user_id and meter_key = p_meter_key
  for update;

  if not found
    or asr_request.state <> 'reserved'
    or asr_request.reservation_token <> p_reservation_token then
    return jsonb_build_object(
      'action', 'stale',
      'released', false,
      'balance_fen', coalesce(wallet.balance_fen, 0)
    );
  end if;

  update public.star_interview_wallets
  set balance_fen = balance_fen + asr_request.reserved_fen,
      updated_at = now()
  where user_id = p_user_id
  returning * into wallet;

  update public.star_interview_asr_requests
  set state = 'failed',
      reservation_token = null,
      lease_expires_at = null,
      reserved_fen = 0,
      actual_charge_fen = 0,
      response_body = null,
      cache_expires_at = null,
      last_error = left(coalesce(nullif(trim(p_reason), ''), 'ASR failed'), 200),
      completed_at = null,
      updated_at = now()
  where id = asr_request.id
    and reservation_token = p_reservation_token;

  return jsonb_build_object(
    'action', 'failed',
    'released', true,
    'balance_fen', wallet.balance_fen,
    'required_fen', 0,
    'nominal_charge_fen', 0,
    'actual_charge_fen', 0
  );
end;
$$;

create or replace function public.reconcile_star_interview_asr_leases(
  p_limit integer default 500
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  candidate record;
  wallet public.star_interview_wallets%rowtype;
  asr_request public.star_interview_asr_requests%rowtype;
  refunded_count integer := 0;
  refunded_fen bigint := 0;
  purged_count integer := 0;
begin
  if p_limit not between 1 and 1000 then
    raise exception 'invalid StarInterview ASR reconciliation limit';
  end if;

  -- Discover globally without row locks, then settle with the same
  -- user-advisory -> wallet -> request order used by live RPCs.
  for candidate in
    select id, user_id
    from public.star_interview_asr_requests
    where (state = 'reserved'
        and (lease_expires_at is null or lease_expires_at <= now()))
      or (state = 'succeeded'
        and (cache_expires_at is null or cache_expires_at <= now()))
    order by coalesce(lease_expires_at, cache_expires_at) nulls first, id
    limit p_limit
  loop
    if not pg_try_advisory_xact_lock(
      hashtextextended('star_interview_asr:' || candidate.user_id::text, 0)
    ) then
      continue;
    end if;

    select * into wallet
    from public.star_interview_wallets
    where user_id = candidate.user_id
    for update;

    select * into asr_request
    from public.star_interview_asr_requests
    where id = candidate.id
    for update skip locked;

    if not found then
      continue;
    end if;

    if asr_request.state = 'succeeded'
      and (asr_request.cache_expires_at is null
        or asr_request.cache_expires_at <= now()) then
      update public.star_interview_asr_requests
      set state = 'consumed',
          response_body = null,
          cache_expires_at = null,
          last_error = 'ASR transcript cache expired',
          updated_at = now()
      where id = asr_request.id
        and state = 'succeeded';
      purged_count := purged_count + 1;
      continue;
    end if;

    if asr_request.state <> 'reserved'
      or (asr_request.lease_expires_at is not null
        and asr_request.lease_expires_at > now()) then
      continue;
    end if;

    update public.star_interview_wallets
    set balance_fen = balance_fen + asr_request.reserved_fen,
        updated_at = now()
    where user_id = asr_request.user_id;

    update public.star_interview_asr_requests as target
    set state = 'failed',
        reservation_token = null,
        lease_expires_at = null,
        reserved_fen = 0,
        actual_charge_fen = 0,
        response_body = null,
        cache_expires_at = null,
        last_error = 'ASR reservation lease expired',
        completed_at = null,
        updated_at = now()
    where target.id = asr_request.id
      and target.reservation_token = asr_request.reservation_token;

    refunded_count := refunded_count + 1;
    refunded_fen := refunded_fen + asr_request.reserved_fen;
  end loop;

  return jsonb_build_object(
    'refunded', refunded_count,
    'refunded_fen', refunded_fen,
    'purged', purged_count
  );
end;
$$;

-- Rolling-deploy wrapper: an older route calls this only after a successful
-- upstream response. If a new worker already owns the same aliased v2 key,
-- finalize that exact hold instead of charging the wallet a second time.
create or replace function public.consume_star_interview_usage(
  p_user_id uuid,
  p_feature text,
  p_meter_key text,
  p_units bigint,
  p_unlimited boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  account_auth auth.users%rowtype;
  account_profile public.profiles%rowtype;
  effective_meter_key text;
  active_token uuid;
  settled jsonb;
  resolved_unlimited boolean;
begin
  resolved_unlimited := p_unlimited;
  if p_user_id is not null and p_feature in ('asr', 'completion') then
    perform pg_advisory_xact_lock(
      hashtextextended('admin-user-mutation:' || p_user_id::text, 0)
    );
    select * into account_auth from auth.users
    where id = p_user_id for share;
    if not found then
      return jsonb_build_object(
        'allowed', false,
        'code', 'STAR_INTERVIEW_ACCOUNT_UNAVAILABLE',
        'balance_fen', 0,
        'required_fen', 0,
        'nominal_charge_fen', 0,
        'actual_charge_fen', 0
      );
    end if;
    select * into account_profile from public.profiles
    where id = p_user_id for share;
    if not found
      or coalesce(account_auth.banned_until > now(), false)
      or exists (
        select 1 from public.admin_user_mutation_guards
        where target_user_id = p_user_id
      ) then
      return jsonb_build_object(
        'allowed', false,
        'code', 'STAR_INTERVIEW_ACCOUNT_RECOVERY_REQUIRED',
        'balance_fen', 0,
        'required_fen', 0,
        'nominal_charge_fen', 0,
        'actual_charge_fen', 0
      );
    end if;
    resolved_unlimited := case
      when jsonb_typeof(
        coalesce(account_auth.raw_app_meta_data, '{}'::jsonb)
          -> 'star_interview_unlimited_access'
      ) = 'boolean'
        then (account_auth.raw_app_meta_data->>'star_interview_unlimited_access')::boolean
      else account_profile.role = 'admin'
    end;
  end if;

  if p_feature = 'asr' and p_user_id is not null then
    -- Hold the same user fence and wallet row through request lookup and the
    -- legacy delegate. Otherwise a reserve could commit between a negative
    -- lookup and the old post-charge function, double-deducting the wallet.
    perform pg_advisory_xact_lock(
      hashtextextended('star_interview_asr:' || p_user_id::text, 0)
    );
    insert into public.star_interview_wallets (user_id)
    values (p_user_id)
    on conflict (user_id) do nothing;
    perform 1
    from public.star_interview_wallets
    where user_id = p_user_id
    for update;

    if p_meter_key ~* '^v2:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[0-9a-f]{64}$' then
      effective_meter_key := p_meter_key;
    elsif p_meter_key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      select v2_meter_key into effective_meter_key
      from public.star_interview_asr_meter_aliases
      where user_id = p_user_id
        and legacy_meter_key = p_meter_key::uuid
      for update;
    end if;

    if effective_meter_key is not null then
      select reservation_token into active_token
      from public.star_interview_asr_requests
      where user_id = p_user_id
        and meter_key = effective_meter_key
        and state = 'reserved'
      for update;

      if found and active_token is not null then
        settled := public.complete_star_interview_asr(
          p_user_id, effective_meter_key, active_token, null, true
        );
        if settled->>'action' = 'completed' then
          return settled || jsonb_build_object('allowed', true);
        end if;
      end if;
    end if;
  end if;

  return public.consume_star_interview_usage_before_asr_reservations(
    p_user_id, p_feature, p_meter_key, p_units, resolved_unlimited
  );
end;
$$;

revoke all on function public.reserve_star_interview_asr(
  uuid, text, bigint, boolean
) from public, anon, authenticated;
revoke all on function public.confirm_star_interview_asr_dispatch(
  uuid, text, uuid
) from public, anon, authenticated;
revoke all on function public.complete_star_interview_asr(
  uuid, text, uuid, text, boolean
) from public, anon, authenticated;
revoke all on function public.fail_star_interview_asr(
  uuid, text, uuid, text
) from public, anon, authenticated;
revoke all on function public.reconcile_star_interview_asr_leases(integer)
  from public, anon, authenticated;
revoke all on function public.consume_star_interview_usage(
  uuid, text, text, bigint, boolean
) from public, anon, authenticated;
revoke all on function public.consume_star_interview_usage_before_asr_reservations(
  uuid, text, text, bigint, boolean
) from public, anon, authenticated;

grant execute on function public.reserve_star_interview_asr(
  uuid, text, bigint, boolean
) to service_role;
grant execute on function public.confirm_star_interview_asr_dispatch(
  uuid, text, uuid
) to service_role;
grant execute on function public.complete_star_interview_asr(
  uuid, text, uuid, text, boolean
) to service_role;
grant execute on function public.fail_star_interview_asr(
  uuid, text, uuid, text
) to service_role;
grant execute on function public.reconcile_star_interview_asr_leases(integer)
  to service_role;
grant execute on function public.consume_star_interview_usage(
  uuid, text, text, bigint, boolean
) to service_role;
grant execute on function public.consume_star_interview_usage_before_asr_reservations(
  uuid, text, text, bigint, boolean
) to service_role;

select cron.schedule(
  'star-interview-asr-lease-reconcile',
  '* * * * *',
  'select public.reconcile_star_interview_asr_leases(500);'
);

-- Replace the shared history job so the ASR minute job is retained for only
-- the same seven-day observability window as completion maintenance.
select cron.schedule(
  'star-interview-maintenance-history-purge',
  '17 3 * * *',
  'delete from cron.job_run_details d using cron.job j where d.jobid = j.jobid and j.jobname in (''star-interview-completion-cache-purge'', ''star-interview-asr-lease-reconcile'', ''star-interview-maintenance-history-purge'') and d.start_time < now() - interval ''7 days'';'
);

commit;
