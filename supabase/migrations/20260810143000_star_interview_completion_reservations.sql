create extension if not exists pg_cron;

begin;

create table if not exists public.star_interview_completion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meter_key uuid not null,
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  stream boolean not null,
  state text not null default 'failed'
    check (state in ('reserved', 'dispatching', 'dispatched', 'streaming', 'succeeded', 'failed', 'consumed')),
  reservation_token uuid,
  lease_expires_at timestamptz,
  reserved_fen bigint not null default 0 check (reserved_fen >= 0),
  actual_charge_fen bigint not null default 0 check (actual_charge_fen >= 0),
  nominal_charge_fen bigint not null default 80 check (nominal_charge_fen = 80),
  response_body text,
  response_content_type text,
  last_error text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  completed_at timestamptz,
  cache_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, meter_key)
);

create index if not exists star_interview_completion_requests_lease_idx
  on public.star_interview_completion_requests (state, lease_expires_at)
  where state in ('reserved', 'dispatching', 'dispatched', 'streaming');

create index if not exists star_interview_completion_requests_cache_expiry_idx
  on public.star_interview_completion_requests (cache_expires_at)
  where state = 'succeeded' and response_body is not null;

alter table public.star_interview_completion_requests enable row level security;

revoke all on table public.star_interview_completion_requests
  from public, anon, authenticated;
grant select, insert, update, delete on table public.star_interview_completion_requests
  to service_role;

-- Give each account at most one bounded rolling-release compatibility grant.
-- Historical raw meters do not contain an audio digest, so equivalence cannot
-- be proven. Limiting the bridge to one <=45s segment (at most 30 fen), and to
-- a short creation window, preserves a normal retry without creating an
-- unbounded first-v2-wins discount across legacy UUIDs.
create table if not exists public.star_interview_asr_meter_aliases (
  user_id uuid primary key references auth.users(id) on delete cascade,
  legacy_meter_key uuid not null,
  v2_meter_key text not null
    check (v2_meter_key ~* '^v2:[0-9a-f-]{36}:[0-9a-f]{64}$')
    check (split_part(v2_meter_key, ':', 2) = lower(legacy_meter_key::text)),
  created_at timestamptz not null default now(),
  unique (user_id, v2_meter_key)
);

alter table public.star_interview_asr_meter_aliases enable row level security;
revoke all on table public.star_interview_asr_meter_aliases
  from public, anon, authenticated;
grant select, insert, update, delete on table public.star_interview_asr_meter_aliases
  to service_role;

create or replace function public.purge_star_interview_completion_cache()
returns bigint
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  purged_count bigint;
begin
  -- This runs as its own RPC transaction before reservation. Keeping the
  -- cross-user cache sweep outside wallet transactions avoids lock inversion
  -- with completion/failure accounting.
  with expired_cache as (
    select id
    from public.star_interview_completion_requests
    where state = 'succeeded'
      and cache_expires_at <= now()
      and response_body is not null
    order by cache_expires_at
    for update skip locked
  ), cleared as (
    update public.star_interview_completion_requests
    set response_body = null,
        response_content_type = null,
        updated_at = now()
    from expired_cache
    where public.star_interview_completion_requests.id = expired_cache.id
    returning public.star_interview_completion_requests.id
  )
  select count(*) into purged_count from cleared;

  return purged_count;
end;
$$;

-- Keep pre-reservation application instances safe during a rolling deploy.
-- The signature is unchanged, so ASR and every released client remain
-- compatible. Only the completion branch gains coordination with the new
-- durable request row while holding the same wallet lock.
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
set search_path = public, auth
as $$
declare
  wallet public.star_interview_wallets%rowtype;
  meter public.star_interview_usage_meters%rowtype;
  completion_request public.star_interview_completion_requests%rowtype;
  legacy_asr_meter public.star_interview_usage_meters%rowtype;
  completion_meter_key uuid;
  legacy_asr_meter_key uuid;
  aliased_asr_meter_key text;
  effective_meter_key text;
  new_total_cost bigint;
  delta_cost bigint;
  actual_charge bigint;
  reference text;
begin
  if p_feature not in ('asr', 'completion')
    or char_length(p_meter_key) not between 8 and 120
    or p_units < 1 then
    raise exception 'invalid StarInterview usage input';
  end if;

  effective_meter_key := p_meter_key;

  insert into public.star_interview_wallets (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into wallet
  from public.star_interview_wallets
  where user_id = p_user_id
  for update;

  if p_feature = 'asr' then
    aliased_asr_meter_key := null;
    if p_meter_key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      legacy_asr_meter_key := p_meter_key::uuid;
      select v2_meter_key into aliased_asr_meter_key
      from public.star_interview_asr_meter_aliases
      where user_id = p_user_id and legacy_meter_key = legacy_asr_meter_key
      for update;
      if found then
        effective_meter_key := aliased_asr_meter_key;
      end if;
    elsif p_meter_key ~* '^v2:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[0-9a-f]{64}$' then
      legacy_asr_meter_key := split_part(p_meter_key, ':', 2)::uuid;
      select v2_meter_key into aliased_asr_meter_key
      from public.star_interview_asr_meter_aliases
      where user_id = p_user_id and legacy_meter_key = legacy_asr_meter_key
      for update;

      if not found and now() < timestamptz '2026-08-17 00:00:00+00' then
        select * into legacy_asr_meter
        from public.star_interview_usage_meters
        where user_id = p_user_id
          and feature = 'asr'
          and meter_key = legacy_asr_meter_key::text
        for update;

        if found then
          insert into public.star_interview_asr_meter_aliases (
            user_id, legacy_meter_key, v2_meter_key
          ) values (
            p_user_id, legacy_asr_meter_key, p_meter_key
          )
          on conflict (user_id) do nothing;

          select v2_meter_key into aliased_asr_meter_key
          from public.star_interview_asr_meter_aliases
          where user_id = p_user_id and legacy_meter_key = legacy_asr_meter_key
          for update;
        end if;
      end if;

      -- Only the account's single, time-bounded compatibility bridge can
      -- inherit a raw meter. Every other v2 audio hash is billed independently.
      if aliased_asr_meter_key = p_meter_key then
        effective_meter_key := p_meter_key;
        select * into legacy_asr_meter
        from public.star_interview_usage_meters
        where user_id = p_user_id
          and feature = 'asr'
          and meter_key = legacy_asr_meter_key::text
        for update;

        if found then
          insert into public.star_interview_usage_meters (
            user_id, feature, meter_key, max_units, nominal_cost_fen
          ) values (
            p_user_id,
            'asr',
            p_meter_key,
            legacy_asr_meter.max_units,
            legacy_asr_meter.nominal_cost_fen
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
            and meter_key = legacy_asr_meter_key::text;
        end if;
      end if;
    end if;
  end if;

  if p_feature = 'completion' then
    if p_meter_key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      completion_meter_key := p_meter_key::uuid;
    elsif p_meter_key ~* '^v2:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[0-9a-f]{32}$' then
      completion_meter_key := split_part(p_meter_key, ':', 2)::uuid;
    end if;

    if completion_meter_key is not null then
      select * into completion_request
      from public.star_interview_completion_requests
      where user_id = p_user_id and meter_key = completion_meter_key
      for update;

      if found and completion_request.state in ('reserved', 'dispatching', 'dispatched') then
        -- The new route has already removed this hold from available balance.
        -- Finalize that exact hold for the successful legacy response instead
        -- of subtracting another 80 fen.
        actual_charge := completion_request.reserved_fen;

        insert into public.star_interview_usage_meters (
          user_id, feature, meter_key, max_units, nominal_cost_fen
        ) values (
          p_user_id, 'completion', p_meter_key, 1, 80
        )
        on conflict (user_id, feature, meter_key) do update
        set max_units = greatest(public.star_interview_usage_meters.max_units, 1),
            nominal_cost_fen = greatest(public.star_interview_usage_meters.nominal_cost_fen, 80),
            updated_at = now();

        update public.star_interview_wallets
        set total_spent_fen = total_spent_fen + actual_charge,
            nominal_spent_fen = nominal_spent_fen + 80,
            updated_at = now()
        where user_id = p_user_id
        returning * into wallet;

        reference := 'usage:completion:' || p_meter_key || ':80';
        insert into public.star_interview_ledger (
          user_id, entry_type, amount_fen, nominal_amount_fen, balance_after_fen,
          feature, units, reference_key, note, metadata
        ) values (
          p_user_id, 'usage', -actual_charge, -80, wallet.balance_fen,
          'completion', 1, reference,
          case when actual_charge = 0 then '无限账户影子消耗' else '按量使用' end,
          jsonb_build_object(
            'unlimited', actual_charge = 0,
            'rolling_deploy_compatibility', true
          )
        )
        on conflict (user_id, reference_key) do nothing;

        update public.star_interview_completion_requests
        set state = 'consumed',
            reservation_token = null,
            lease_expires_at = null,
            reserved_fen = 0,
            actual_charge_fen = actual_charge,
            nominal_charge_fen = 80,
            last_error = 'legacy route completed during reservation',
            completed_at = now(),
            updated_at = now()
        where id = completion_request.id;

        return jsonb_build_object(
          'allowed', true,
          'balance_fen', wallet.balance_fen,
          'required_fen', 0,
          'nominal_charge_fen', 80,
          'actual_charge_fen', actual_charge
        );
      end if;

      if found and completion_request.state in ('streaming', 'succeeded', 'consumed') then
        -- A new instance already committed this logical key. The legacy
        -- response may finish, but it must not mutate balance or usage again.
        return jsonb_build_object(
          'allowed', true,
          'balance_fen', wallet.balance_fen,
          'required_fen', 0,
          'nominal_charge_fen', 0,
          'actual_charge_fen', 0
        );
      end if;
    end if;
  end if;

  insert into public.star_interview_usage_meters (user_id, feature, meter_key)
  values (p_user_id, p_feature, effective_meter_key)
  on conflict (user_id, feature, meter_key) do nothing;

  select * into meter
  from public.star_interview_usage_meters
  where user_id = p_user_id and feature = p_feature and meter_key = effective_meter_key
  for update;

  if p_feature = 'asr' then
    new_total_cost := ceil(greatest(p_units, meter.max_units)::numeric * 40 / 60000)::bigint;
  else
    new_total_cost := 80;
  end if;

  delta_cost := greatest(0, new_total_cost - meter.nominal_cost_fen);
  actual_charge := case when p_unlimited then 0 else delta_cost end;

  if actual_charge > wallet.balance_fen then
    return jsonb_build_object(
      'allowed', false,
      'balance_fen', wallet.balance_fen,
      'required_fen', actual_charge,
      'nominal_charge_fen', delta_cost,
      'actual_charge_fen', 0
    );
  end if;

  update public.star_interview_usage_meters
  set max_units = greatest(max_units, p_units),
      nominal_cost_fen = new_total_cost,
      updated_at = now()
  where user_id = p_user_id and feature = p_feature and meter_key = effective_meter_key;

  update public.star_interview_wallets
  set balance_fen = balance_fen - actual_charge,
      total_spent_fen = total_spent_fen + actual_charge,
      nominal_spent_fen = nominal_spent_fen + delta_cost,
      updated_at = now()
  where user_id = p_user_id
  returning * into wallet;

  if delta_cost > 0 then
    reference := 'usage:' || p_feature || ':' || effective_meter_key || ':' || new_total_cost::text;
    insert into public.star_interview_ledger (
      user_id, entry_type, amount_fen, nominal_amount_fen, balance_after_fen,
      feature, units, reference_key, note, metadata
    ) values (
      p_user_id, 'usage', -actual_charge, -delta_cost, wallet.balance_fen,
      p_feature, p_units, reference,
      case when p_unlimited then '无限账户影子消耗' else '按量使用' end,
      jsonb_build_object('unlimited', p_unlimited)
    )
    on conflict (user_id, reference_key) do nothing;
  end if;

  return jsonb_build_object(
    'allowed', true,
    'balance_fen', wallet.balance_fen,
    'required_fen', 0,
    'nominal_charge_fen', delta_cost,
    'actual_charge_fen', actual_charge
  );
end;
$$;

create or replace function public.reserve_star_interview_completion(
  p_user_id uuid,
  p_meter_key uuid,
  p_request_hash text,
  p_stream boolean,
  p_unlimited boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  wallet public.star_interview_wallets%rowtype;
  completion_request public.star_interview_completion_requests%rowtype;
  account_auth auth.users%rowtype;
  profile_role text;
  access_value jsonb;
  account_exists boolean;
  guard_exists boolean;
  effective_unlimited boolean;
  token uuid;
  charge bigint;
  expired_release bigint;
  legacy_consumed boolean;
  stale_dispatch public.star_interview_completion_requests%rowtype;
  usage_meter_key text;
  ledger_reference text;
begin
  if p_user_id is null
    or p_meter_key is null
    or p_request_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid StarInterview completion reservation';
  end if;

  -- Use the same account lock as administrator mutations. The legacy
  -- p_unlimited argument remains in the RPC signature for rolling clients, but
  -- authorization and pricing are derived only from the current database
  -- snapshot while this lock is held.
  perform pg_advisory_xact_lock(
    hashtextextended('admin-user-mutation:' || p_user_id::text, 0)
  );

  select * into account_auth
  from auth.users
  where id = p_user_id
  for share;
  account_exists := found;

  select role into profile_role
  from public.profiles
  where id = p_user_id
  for share;
  if not found then
    profile_role := 'user';
  end if;

  select exists (
    select 1
    from public.admin_user_mutation_guards
    where target_user_id = p_user_id
  ) into guard_exists;

  if not account_exists
    or coalesce(account_auth.banned_until > now(), false)
    or guard_exists then
    return jsonb_build_object(
      'action', 'stale',
      'balance_fen', 0,
      'required_fen', 0,
      'nominal_charge_fen', 0,
      'actual_charge_fen', 0
    );
  end if;

  access_value := coalesce(account_auth.raw_app_meta_data, '{}'::jsonb)
    -> 'star_interview_unlimited_access';
  effective_unlimited := case
    when jsonb_typeof(access_value) = 'boolean' then access_value = 'true'::jsonb
    else profile_role = 'admin'
  end;

  -- Serialize every balance mutation for this user. The wallet row lock keeps
  -- this compatible with the existing usage and recharge functions.
  perform pg_advisory_xact_lock(
    hashtextextended('star_interview_completion:' || p_user_id::text, 0)
  );

  insert into public.star_interview_wallets (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into wallet
  from public.star_interview_wallets
  where user_id = p_user_id
  for update;

  -- Refund every pre-intent reservation for the user, not only the key being
  -- retried. Intent/dispatched leases are settled below at the at-most-once
  -- boundary and therefore must never enter this refund sweep.
  with expired as (
    select id, reserved_fen
    from public.star_interview_completion_requests
    where user_id = p_user_id
      and state = 'reserved'
      and (lease_expires_at is null or lease_expires_at <= now())
    for update
  ), released as (
    update public.star_interview_completion_requests
    set state = 'failed',
        reservation_token = null,
        lease_expires_at = null,
        reserved_fen = 0,
        last_error = 'reservation lease expired',
        updated_at = now()
    from expired
    where public.star_interview_completion_requests.id = expired.id
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

  -- Once durable dispatch intent exists, a vanished worker must not turn a
  -- possibly-issued provider request into a reusable free call. Known
  -- synchronous pre-fetch/upstream failures explicitly refund through
  -- fail_star_interview_completion; only an abandoned intent/dispatch lease is
  -- finalized here. This is the deliberate at-most-once boundary for an
  -- upstream API that does not expose an idempotency key.
  for stale_dispatch in
    select *
    from public.star_interview_completion_requests
    where user_id = p_user_id
      and state in ('dispatching', 'dispatched')
      and (lease_expires_at is null or lease_expires_at <= now())
    for update
  loop
    usage_meter_key := 'v3:' || stale_dispatch.meter_key::text || ':'
      || substring(stale_dispatch.request_hash, 1, 32);
    ledger_reference := 'usage:completion:' || usage_meter_key || ':80';

    insert into public.star_interview_usage_meters (
      user_id, feature, meter_key, max_units, nominal_cost_fen
    ) values (
      p_user_id, 'completion', usage_meter_key, 1, 80
    )
    on conflict (user_id, feature, meter_key) do update
    set max_units = greatest(public.star_interview_usage_meters.max_units, 1),
        nominal_cost_fen = greatest(public.star_interview_usage_meters.nominal_cost_fen, 80),
        updated_at = now();

    update public.star_interview_wallets
    set total_spent_fen = total_spent_fen + stale_dispatch.reserved_fen,
        nominal_spent_fen = nominal_spent_fen + 80,
        updated_at = now()
    where user_id = p_user_id
    returning * into wallet;

    insert into public.star_interview_ledger (
      user_id, entry_type, amount_fen, nominal_amount_fen, balance_after_fen,
      feature, units, reference_key, note, metadata
    ) values (
      p_user_id, 'usage', -stale_dispatch.reserved_fen, -80, wallet.balance_fen,
      'completion', 1, ledger_reference,
      case when stale_dispatch.reserved_fen = 0
        then '无限账户影子消耗' else '按量使用' end,
      jsonb_build_object(
        'unlimited', stale_dispatch.reserved_fen = 0,
        'request_hash', stale_dispatch.request_hash,
        'stream', stale_dispatch.stream,
        'dispatch_lease_expired', true,
        'dispatch_phase_at_expiry', stale_dispatch.state
      )
    )
    on conflict (user_id, reference_key) do nothing;

    update public.star_interview_completion_requests
    set state = 'consumed',
        reservation_token = null,
        lease_expires_at = null,
        actual_charge_fen = stale_dispatch.reserved_fen,
        reserved_fen = 0,
        last_error = case when stale_dispatch.state = 'dispatching'
          then 'dispatch intent lease expired'
          else 'dispatched request lease expired' end,
        completed_at = now(),
        updated_at = now()
    where id = stale_dispatch.id;
  end loop;

  -- A streaming request has already been formally charged before its first
  -- byte is exposed. If its worker disappears, close the lease without a
  -- refund and retain a tombstone that prevents a second upstream call.
  update public.star_interview_completion_requests
  set state = 'consumed',
      reservation_token = null,
      lease_expires_at = null,
      last_error = 'stream interrupted after charge',
      updated_at = now()
  where user_id = p_user_id
    and state = 'streaming'
    and (lease_expires_at is null or lease_expires_at <= now());

  select * into completion_request
  from public.star_interview_completion_requests
  where user_id = p_user_id and meter_key = p_meter_key
  for update;

  if not found then
    insert into public.star_interview_completion_requests (
      user_id, meter_key, request_hash, stream, state
    ) values (
      p_user_id, p_meter_key, p_request_hash, p_stream, 'failed'
    )
    returning * into completion_request;
  elsif completion_request.request_hash <> p_request_hash
    or completion_request.stream <> p_stream then
    return jsonb_build_object(
      'action', 'conflict',
      'balance_fen', wallet.balance_fen,
      'required_fen', 0,
      'nominal_charge_fen', 0,
      'actual_charge_fen', 0
    );
  end if;

  if completion_request.state = 'succeeded'
    and completion_request.response_body is not null
    and completion_request.cache_expires_at > now() then
    return jsonb_build_object(
      'action', 'cached',
      'balance_fen', wallet.balance_fen,
      'required_fen', 0,
      'nominal_charge_fen', 0,
      'actual_charge_fen', 0,
      'response_body', completion_request.response_body,
      'response_content_type', completion_request.response_content_type
    );
  end if;

  if completion_request.state = 'succeeded' then
    return jsonb_build_object(
      'action', 'expired_result',
      'balance_fen', wallet.balance_fen,
      'required_fen', 0,
      'nominal_charge_fen', 0,
      'actual_charge_fen', 0
    );
  end if;

  if completion_request.state = 'consumed' then
    return jsonb_build_object(
      'action', 'consumed',
      'balance_fen', wallet.balance_fen,
      'required_fen', 0,
      'nominal_charge_fen', 0,
      'actual_charge_fen', 0
    );
  end if;

  if completion_request.state in ('reserved', 'dispatching', 'dispatched', 'streaming')
    and completion_request.lease_expires_at > now() then
    return jsonb_build_object(
      'action', 'in_progress',
      'balance_fen', wallet.balance_fen,
      'required_fen', 0,
      'nominal_charge_fen', 0,
      'actual_charge_fen', 0,
      'lease_expires_at', completion_request.lease_expires_at
    );
  end if;

  -- Older production routes recorded completed calls directly in the usage
  -- meter, first under the raw UUID and later under a v2-prefixed key. Check
  -- every retryable row so an in-flight legacy call that finishes during a
  -- deployment cannot later be charged by the new path.
  if completion_request.state = 'failed' then
    select exists (
      select 1
      from public.star_interview_usage_meters
      where user_id = p_user_id
        and feature = 'completion'
        and nominal_cost_fen >= 80
        and (
          meter_key = p_meter_key::text
          or meter_key like 'v2:' || p_meter_key::text || ':%'
        )
    ) into legacy_consumed;

    if legacy_consumed then
      update public.star_interview_completion_requests
      set state = 'consumed',
          reserved_fen = 0,
          actual_charge_fen = 0,
          nominal_charge_fen = 80,
          last_error = 'legacy completion already charged',
          completed_at = now(),
          updated_at = now()
      where id = completion_request.id;

      return jsonb_build_object(
        'action', 'consumed',
        'balance_fen', wallet.balance_fen,
        'required_fen', 0,
        'nominal_charge_fen', 0,
        'actual_charge_fen', 0
      );
    end if;
  end if;

  charge := case when effective_unlimited then 0 else 80 end;
  if charge > wallet.balance_fen then
    return jsonb_build_object(
      'action', 'insufficient',
      'balance_fen', wallet.balance_fen,
      'required_fen', charge,
      'nominal_charge_fen', 80,
      'actual_charge_fen', 0
    );
  end if;

  token := gen_random_uuid();

  update public.star_interview_wallets
  set balance_fen = balance_fen - charge,
      updated_at = now()
  where user_id = p_user_id
  returning * into wallet;

  update public.star_interview_completion_requests
  set state = 'reserved',
      reservation_token = token,
      lease_expires_at = now() + interval '120 seconds',
      reserved_fen = charge,
      actual_charge_fen = 0,
      nominal_charge_fen = 80,
      response_body = null,
      response_content_type = null,
      last_error = null,
      completed_at = null,
      cache_expires_at = null,
      attempt_count = attempt_count + 1,
      updated_at = now()
  where id = completion_request.id;

  return jsonb_build_object(
    'action', 'claimed',
    'reservation_token', token,
    'balance_fen', wallet.balance_fen,
    'required_fen', 0,
    'nominal_charge_fen', 80,
    'actual_charge_fen', charge,
    'lease_expires_at', now() + interval '120 seconds'
  );
end;
$$;

create or replace function public.mark_star_interview_completion_dispatch_intent(
  p_user_id uuid,
  p_meter_key uuid,
  p_request_hash text,
  p_reservation_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  wallet public.star_interview_wallets%rowtype;
  completion_request public.star_interview_completion_requests%rowtype;
  account_auth auth.users%rowtype;
  profile_role text;
  access_value jsonb;
  account_exists boolean;
  guard_exists boolean;
  effective_unlimited boolean;
  expected_charge bigint;
begin
  if p_user_id is null
    or p_meter_key is null
    or p_request_hash !~ '^[0-9a-f]{64}$'
    or p_reservation_token is null then
    raise exception 'invalid StarInterview dispatch intent';
  end if;

  -- Close the authorization window immediately before fetch. Administrator
  -- mutations and this dispatch fence share the same per-account lock, so a
  -- ban, target guard, or access-mode change cannot be hidden between these
  -- authority reads and the durable dispatch decision.
  perform pg_advisory_xact_lock(
    hashtextextended('admin-user-mutation:' || p_user_id::text, 0)
  );

  select * into account_auth
  from auth.users
  where id = p_user_id
  for share;
  account_exists := found;

  select role into profile_role
  from public.profiles
  where id = p_user_id
  for share;
  if not found then
    profile_role := 'user';
  end if;

  select exists (
    select 1
    from public.admin_user_mutation_guards
    where target_user_id = p_user_id
  ) into guard_exists;

  access_value := coalesce(account_auth.raw_app_meta_data, '{}'::jsonb)
    -> 'star_interview_unlimited_access';
  effective_unlimited := case
    when jsonb_typeof(access_value) = 'boolean' then access_value = 'true'::jsonb
    else profile_role = 'admin'
  end;
  expected_charge := case when effective_unlimited then 0 else 80 end;

  perform pg_advisory_xact_lock(
    hashtextextended('star_interview_completion:' || p_user_id::text, 0)
  );

  select * into wallet
  from public.star_interview_wallets
  where user_id = p_user_id
  for update;

  select * into completion_request
  from public.star_interview_completion_requests
  where user_id = p_user_id and meter_key = p_meter_key
  for update;

  if not found or completion_request.request_hash <> p_request_hash then
    return jsonb_build_object(
      'action', 'conflict',
      'balance_fen', coalesce(wallet.balance_fen, 0)
    );
  end if;

  if completion_request.state not in ('reserved', 'dispatching')
    or completion_request.reservation_token <> p_reservation_token then
    return jsonb_build_object(
      'action', case when completion_request.state = 'consumed' then 'consumed' else 'stale' end,
      'balance_fen', wallet.balance_fen
    );
  end if;

  if not account_exists
    or coalesce(account_auth.banned_until > now(), false)
    or guard_exists
    or completion_request.reserved_fen <> expected_charge then
    return jsonb_build_object(
      'action', 'blocked',
      'balance_fen', wallet.balance_fen,
      'required_fen', expected_charge,
      'nominal_charge_fen', 80,
      'actual_charge_fen', completion_request.reserved_fen
    );
  end if;

  if completion_request.state = 'dispatching' then
    return jsonb_build_object(
      'action', 'dispatching',
      'balance_fen', wallet.balance_fen,
      'required_fen', 0,
      'nominal_charge_fen', 80,
      'actual_charge_fen', completion_request.reserved_fen,
      'lease_expires_at', completion_request.lease_expires_at
    );
  end if;

  update public.star_interview_completion_requests
  set state = 'dispatching',
      lease_expires_at = now() + interval '210 seconds',
      updated_at = now()
  where id = completion_request.id;

  return jsonb_build_object(
    'action', 'dispatching',
    'balance_fen', wallet.balance_fen,
    'required_fen', 0,
    'nominal_charge_fen', 80,
    'actual_charge_fen', completion_request.reserved_fen,
    'lease_expires_at', now() + interval '210 seconds'
  );
end;
$$;

create or replace function public.mark_star_interview_completion_dispatched(
  p_user_id uuid,
  p_meter_key uuid,
  p_request_hash text,
  p_reservation_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  wallet public.star_interview_wallets%rowtype;
  completion_request public.star_interview_completion_requests%rowtype;
begin
  if p_user_id is null
    or p_meter_key is null
    or p_request_hash !~ '^[0-9a-f]{64}$'
    or p_reservation_token is null then
    raise exception 'invalid StarInterview dispatched marker';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('star_interview_completion:' || p_user_id::text, 0)
  );

  select * into wallet
  from public.star_interview_wallets
  where user_id = p_user_id
  for update;

  select * into completion_request
  from public.star_interview_completion_requests
  where user_id = p_user_id and meter_key = p_meter_key
  for update;

  if not found or completion_request.request_hash <> p_request_hash then
    return jsonb_build_object(
      'action', 'conflict',
      'balance_fen', coalesce(wallet.balance_fen, 0)
    );
  end if;

  if completion_request.state = 'dispatched'
    and completion_request.reservation_token = p_reservation_token then
    return jsonb_build_object(
      'action', 'dispatched',
      'balance_fen', wallet.balance_fen,
      'required_fen', 0,
      'nominal_charge_fen', 80,
      'actual_charge_fen', completion_request.reserved_fen,
      'lease_expires_at', completion_request.lease_expires_at
    );
  end if;

  if completion_request.state <> 'dispatching'
    or completion_request.reservation_token <> p_reservation_token then
    return jsonb_build_object(
      'action', case when completion_request.state = 'consumed' then 'consumed' else 'stale' end,
      'balance_fen', wallet.balance_fen
    );
  end if;

  update public.star_interview_completion_requests
  set state = 'dispatched',
      lease_expires_at = now() + interval '210 seconds',
      updated_at = now()
  where id = completion_request.id;

  return jsonb_build_object(
    'action', 'dispatched',
    'balance_fen', wallet.balance_fen,
    'required_fen', 0,
    'nominal_charge_fen', 80,
    'actual_charge_fen', completion_request.reserved_fen,
    'lease_expires_at', now() + interval '210 seconds'
  );
end;
$$;

create or replace function public.commit_star_interview_completion_stream(
  p_user_id uuid,
  p_meter_key uuid,
  p_request_hash text,
  p_reservation_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  wallet public.star_interview_wallets%rowtype;
  completion_request public.star_interview_completion_requests%rowtype;
  charge bigint;
  usage_meter_key text;
  ledger_reference text;
begin
  if p_user_id is null
    or p_meter_key is null
    or p_request_hash !~ '^[0-9a-f]{64}$'
    or p_reservation_token is null then
    raise exception 'invalid StarInterview stream commit';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('star_interview_completion:' || p_user_id::text, 0)
  );

  insert into public.star_interview_wallets (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into wallet
  from public.star_interview_wallets
  where user_id = p_user_id
  for update;

  select * into completion_request
  from public.star_interview_completion_requests
  where user_id = p_user_id and meter_key = p_meter_key
  for update;

  if not found
    or completion_request.request_hash <> p_request_hash
    or not completion_request.stream then
    return jsonb_build_object(
      'action', 'conflict',
      'balance_fen', wallet.balance_fen
    );
  end if;

  if completion_request.state = 'succeeded'
    and completion_request.response_body is not null
    and completion_request.cache_expires_at > now() then
    return jsonb_build_object(
      'action', 'cached',
      'balance_fen', wallet.balance_fen,
      'required_fen', 0,
      'nominal_charge_fen', 0,
      'actual_charge_fen', 0,
      'response_body', completion_request.response_body,
      'response_content_type', completion_request.response_content_type
    );
  end if;

  if completion_request.state = 'streaming'
    and completion_request.reservation_token = p_reservation_token then
    return jsonb_build_object(
      'action', 'committed',
      'balance_fen', wallet.balance_fen,
      'required_fen', 0,
      'nominal_charge_fen', 80,
      'actual_charge_fen', completion_request.actual_charge_fen
    );
  end if;

  if completion_request.state <> 'dispatched'
    or completion_request.reservation_token <> p_reservation_token then
    return jsonb_build_object(
      'action', case when completion_request.state = 'consumed' then 'consumed' else 'stale' end,
      'balance_fen', wallet.balance_fen
    );
  end if;

  charge := completion_request.reserved_fen;
  usage_meter_key := 'v3:' || p_meter_key::text || ':' || substring(p_request_hash, 1, 32);
  ledger_reference := 'usage:completion:' || usage_meter_key || ':80';

  insert into public.star_interview_usage_meters (
    user_id, feature, meter_key, max_units, nominal_cost_fen
  ) values (
    p_user_id, 'completion', usage_meter_key, 1, 80
  )
  on conflict (user_id, feature, meter_key) do update
  set max_units = greatest(public.star_interview_usage_meters.max_units, 1),
      nominal_cost_fen = greatest(public.star_interview_usage_meters.nominal_cost_fen, 80),
      updated_at = now();

  update public.star_interview_wallets
  set total_spent_fen = total_spent_fen + charge,
      nominal_spent_fen = nominal_spent_fen + 80,
      updated_at = now()
  where user_id = p_user_id
  returning * into wallet;

  insert into public.star_interview_ledger (
    user_id, entry_type, amount_fen, nominal_amount_fen, balance_after_fen,
    feature, units, reference_key, note, metadata
  ) values (
    p_user_id, 'usage', -charge, -80, wallet.balance_fen,
    'completion', 1, ledger_reference,
    case when charge = 0 then '无限账户影子消耗' else '按量使用' end,
    jsonb_build_object(
      'unlimited', charge = 0,
      'request_hash', p_request_hash,
      'stream', true
    )
  )
  on conflict (user_id, reference_key) do nothing;

  update public.star_interview_completion_requests
  set state = 'streaming',
      lease_expires_at = now() + interval '210 seconds',
      reserved_fen = 0,
      actual_charge_fen = charge,
      updated_at = now()
  where id = completion_request.id;

  return jsonb_build_object(
    'action', 'committed',
    'balance_fen', wallet.balance_fen,
    'required_fen', 0,
    'nominal_charge_fen', 80,
    'actual_charge_fen', charge
  );
end;
$$;

create or replace function public.get_star_interview_completion(
  p_user_id uuid,
  p_meter_key uuid,
  p_request_hash text
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, auth
as $$
declare
  wallet public.star_interview_wallets%rowtype;
  completion_request public.star_interview_completion_requests%rowtype;
begin
  select * into wallet
  from public.star_interview_wallets
  where user_id = p_user_id;

  select * into completion_request
  from public.star_interview_completion_requests
  where user_id = p_user_id and meter_key = p_meter_key;

  if not found then
    return jsonb_build_object(
      'action', 'missing',
      'balance_fen', coalesce(wallet.balance_fen, 0)
    );
  end if;

  if completion_request.request_hash <> p_request_hash then
    return jsonb_build_object(
      'action', 'conflict',
      'balance_fen', coalesce(wallet.balance_fen, 0)
    );
  end if;

  if completion_request.state = 'succeeded'
    and completion_request.response_body is not null
    and completion_request.cache_expires_at > now() then
    return jsonb_build_object(
      'action', 'cached',
      'balance_fen', coalesce(wallet.balance_fen, 0),
      'required_fen', 0,
      'nominal_charge_fen', 0,
      'actual_charge_fen', 0,
      'response_body', completion_request.response_body,
      'response_content_type', completion_request.response_content_type
    );
  end if;

  if completion_request.state = 'succeeded' then
    return jsonb_build_object(
      'action', 'expired_result',
      'balance_fen', coalesce(wallet.balance_fen, 0)
    );
  end if;

  if completion_request.state in ('reserved', 'dispatching', 'dispatched', 'streaming')
    and completion_request.lease_expires_at > now() then
    return jsonb_build_object(
      'action', 'in_progress',
      'balance_fen', coalesce(wallet.balance_fen, 0),
      'lease_expires_at', completion_request.lease_expires_at
    );
  end if;

  if completion_request.state in ('reserved', 'dispatching', 'dispatched') then
    return jsonb_build_object(
      'action', 'expired',
      'balance_fen', coalesce(wallet.balance_fen, 0)
    );
  end if;

  if completion_request.state in ('streaming', 'consumed') then
    return jsonb_build_object(
      'action', 'consumed',
      'balance_fen', coalesce(wallet.balance_fen, 0)
    );
  end if;

  return jsonb_build_object(
    'action', 'failed',
    'balance_fen', coalesce(wallet.balance_fen, 0)
  );
end;
$$;

create or replace function public.complete_star_interview_completion(
  p_user_id uuid,
  p_meter_key uuid,
  p_request_hash text,
  p_reservation_token uuid,
  p_response_body text,
  p_response_content_type text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  wallet public.star_interview_wallets%rowtype;
  completion_request public.star_interview_completion_requests%rowtype;
  charge bigint;
  usage_meter_key text;
  ledger_reference text;
begin
  if p_user_id is null
    or p_meter_key is null
    or p_request_hash !~ '^[0-9a-f]{64}$'
    or p_reservation_token is null
    or octet_length(coalesce(p_response_body, '')) < 1
    or octet_length(p_response_body) > 1000000
    or p_response_content_type not in (
      'application/json; charset=utf-8',
      'text/event-stream; charset=utf-8'
    ) then
    raise exception 'invalid StarInterview completion result';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('star_interview_completion:' || p_user_id::text, 0)
  );

  insert into public.star_interview_wallets (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into wallet
  from public.star_interview_wallets
  where user_id = p_user_id
  for update;

  select * into completion_request
  from public.star_interview_completion_requests
  where user_id = p_user_id and meter_key = p_meter_key
  for update;

  if not found
    or completion_request.request_hash <> p_request_hash
    or completion_request.stream <> (p_response_content_type = 'text/event-stream; charset=utf-8') then
    return jsonb_build_object(
      'action', 'conflict',
      'balance_fen', wallet.balance_fen
    );
  end if;

  if completion_request.state = 'succeeded'
    and completion_request.response_body is not null
    and completion_request.cache_expires_at > now() then
    return jsonb_build_object(
      'action', 'cached',
      'balance_fen', wallet.balance_fen,
      'required_fen', 0,
      'nominal_charge_fen', 0,
      'actual_charge_fen', 0,
      'response_body', completion_request.response_body,
      'response_content_type', completion_request.response_content_type
    );
  end if;

  if completion_request.state = 'succeeded' then
    return jsonb_build_object(
      'action', 'expired_result',
      'balance_fen', wallet.balance_fen
    );
  end if;

  if completion_request.reservation_token <> p_reservation_token
    or (completion_request.stream and completion_request.state <> 'streaming')
    or (not completion_request.stream and completion_request.state <> 'dispatched') then
    return jsonb_build_object(
      'action', 'stale',
      'balance_fen', wallet.balance_fen
    );
  end if;

  if completion_request.stream then
    -- Streaming was already formally charged before the first byte.
    charge := completion_request.actual_charge_fen;
  else
    charge := completion_request.reserved_fen;
    usage_meter_key := 'v3:' || p_meter_key::text || ':' || substring(p_request_hash, 1, 32);
    ledger_reference := 'usage:completion:' || usage_meter_key || ':80';

    insert into public.star_interview_usage_meters (
      user_id, feature, meter_key, max_units, nominal_cost_fen
    ) values (
      p_user_id, 'completion', usage_meter_key, 1, 80
    )
    on conflict (user_id, feature, meter_key) do update
    set max_units = greatest(public.star_interview_usage_meters.max_units, 1),
        nominal_cost_fen = greatest(public.star_interview_usage_meters.nominal_cost_fen, 80),
        updated_at = now();

    update public.star_interview_wallets
    set total_spent_fen = total_spent_fen + charge,
        nominal_spent_fen = nominal_spent_fen + 80,
        updated_at = now()
    where user_id = p_user_id
    returning * into wallet;

    insert into public.star_interview_ledger (
      user_id, entry_type, amount_fen, nominal_amount_fen, balance_after_fen,
      feature, units, reference_key, note, metadata
    ) values (
      p_user_id, 'usage', -charge, -80, wallet.balance_fen,
      'completion', 1, ledger_reference,
      case when charge = 0 then '无限账户影子消耗' else '按量使用' end,
      jsonb_build_object(
        'unlimited', charge = 0,
        'request_hash', p_request_hash,
        'stream', false
      )
    )
    on conflict (user_id, reference_key) do nothing;
  end if;

  update public.star_interview_completion_requests
  set state = 'succeeded',
      reservation_token = null,
      lease_expires_at = null,
      reserved_fen = 0,
      actual_charge_fen = charge,
      response_body = p_response_body,
      response_content_type = p_response_content_type,
      last_error = null,
      completed_at = now(),
      cache_expires_at = now() + interval '24 hours',
      updated_at = now()
  where id = completion_request.id;

  return jsonb_build_object(
    'action', 'completed',
    'balance_fen', wallet.balance_fen,
    'required_fen', 0,
    'nominal_charge_fen', 80,
    'actual_charge_fen', charge,
    'response_body', p_response_body,
    'response_content_type', p_response_content_type
  );
end;
$$;

create or replace function public.fail_star_interview_completion(
  p_user_id uuid,
  p_meter_key uuid,
  p_request_hash text,
  p_reservation_token uuid,
  p_reason text,
  p_refund boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  wallet public.star_interview_wallets%rowtype;
  completion_request public.star_interview_completion_requests%rowtype;
  should_refund boolean;
  charge bigint;
  usage_meter_key text;
  ledger_reference text;
begin
  if p_user_id is null
    or p_meter_key is null
    or p_request_hash !~ '^[0-9a-f]{64}$'
    or p_reservation_token is null then
    raise exception 'invalid StarInterview completion failure';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('star_interview_completion:' || p_user_id::text, 0)
  );

  insert into public.star_interview_wallets (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into wallet
  from public.star_interview_wallets
  where user_id = p_user_id
  for update;

  select * into completion_request
  from public.star_interview_completion_requests
  where user_id = p_user_id and meter_key = p_meter_key
  for update;

  if not found
    or completion_request.request_hash <> p_request_hash
    or completion_request.state not in ('reserved', 'dispatching', 'dispatched', 'streaming')
    or completion_request.reservation_token <> p_reservation_token then
    return jsonb_build_object(
      'action', 'stale',
      'released', false,
      'balance_fen', wallet.balance_fen
    );
  end if;

  should_refund := coalesce(p_refund, true)
    and completion_request.state in ('reserved', 'dispatching', 'dispatched');
  charge := case
    when should_refund then 0
    when completion_request.state = 'streaming' then completion_request.actual_charge_fen
    else completion_request.reserved_fen
  end;

  if should_refund then
    update public.star_interview_wallets
    set balance_fen = balance_fen + completion_request.reserved_fen,
        updated_at = now()
    where user_id = p_user_id
    returning * into wallet;
  elsif completion_request.state in ('reserved', 'dispatching', 'dispatched') then
    usage_meter_key := 'v3:' || p_meter_key::text || ':' || substring(p_request_hash, 1, 32);
    ledger_reference := 'usage:completion:' || usage_meter_key || ':80';

    insert into public.star_interview_usage_meters (
      user_id, feature, meter_key, max_units, nominal_cost_fen
    ) values (
      p_user_id, 'completion', usage_meter_key, 1, 80
    )
    on conflict (user_id, feature, meter_key) do update
    set max_units = greatest(public.star_interview_usage_meters.max_units, 1),
        nominal_cost_fen = greatest(public.star_interview_usage_meters.nominal_cost_fen, 80),
        updated_at = now();

    update public.star_interview_wallets
    set total_spent_fen = total_spent_fen + charge,
        nominal_spent_fen = nominal_spent_fen + 80,
        updated_at = now()
    where user_id = p_user_id
    returning * into wallet;

    insert into public.star_interview_ledger (
      user_id, entry_type, amount_fen, nominal_amount_fen, balance_after_fen,
      feature, units, reference_key, note, metadata
    ) values (
      p_user_id, 'usage', -charge, -80, wallet.balance_fen,
      'completion', 1, ledger_reference,
      case when charge = 0 then '无限账户影子消耗' else '按量使用' end,
      jsonb_build_object(
        'unlimited', charge = 0,
        'request_hash', p_request_hash,
        'stream', completion_request.stream,
        'cancelled_after_dispatch', true
      )
    )
    on conflict (user_id, reference_key) do nothing;
  end if;

  update public.star_interview_completion_requests
  set state = case when should_refund then 'failed' else 'consumed' end,
      reservation_token = null,
      lease_expires_at = null,
      reserved_fen = 0,
      actual_charge_fen = charge,
      last_error = left(coalesce(nullif(p_reason, ''), 'completion failed'), 200),
      completed_at = case when should_refund then null else now() end,
      updated_at = now()
  where id = completion_request.id;

  return jsonb_build_object(
    'action', case when should_refund then 'failed' else 'consumed' end,
    'released', should_refund,
    'actual_charge_fen', charge,
    'balance_fen', wallet.balance_fen
  );
end;
$$;

create or replace function public.reconcile_star_interview_completion_leases(
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
  completion_request public.star_interview_completion_requests%rowtype;
  charge bigint;
  usage_meter_key text;
  ledger_reference text;
  refunded_count integer := 0;
  finalized_count integer := 0;
  interrupted_count integer := 0;
begin
  if p_limit not between 1 and 1000 then
    raise exception 'invalid StarInterview reconciliation limit';
  end if;

  -- Candidate discovery takes no row lock. Each row is then settled using the
  -- same user advisory -> wallet -> request lock order as live billing. A busy
  -- user is skipped until the next minute instead of creating lock inversion.
  for candidate in
    select id, user_id
    from public.star_interview_completion_requests
    where state in ('reserved', 'dispatching', 'dispatched', 'streaming')
      and (lease_expires_at is null or lease_expires_at <= now())
    order by lease_expires_at nulls first, id
    limit p_limit
  loop
    if not pg_try_advisory_xact_lock(
      hashtextextended('star_interview_completion:' || candidate.user_id::text, 0)
    ) then
      continue;
    end if;

    insert into public.star_interview_wallets (user_id)
    values (candidate.user_id)
    on conflict (user_id) do nothing;

    select * into wallet
    from public.star_interview_wallets
    where user_id = candidate.user_id
    for update;

    select * into completion_request
    from public.star_interview_completion_requests
    where id = candidate.id
    for update skip locked;

    if not found
      or completion_request.state not in ('reserved', 'dispatching', 'dispatched', 'streaming')
      or (completion_request.lease_expires_at is not null
        and completion_request.lease_expires_at > now()) then
      continue;
    end if;

    if completion_request.state = 'reserved' then
      update public.star_interview_wallets
      set balance_fen = balance_fen + completion_request.reserved_fen,
          updated_at = now()
      where user_id = completion_request.user_id
      returning * into wallet;

      update public.star_interview_completion_requests as target
      set state = 'failed',
          reservation_token = null,
          lease_expires_at = null,
          reserved_fen = 0,
          actual_charge_fen = 0,
          last_error = 'reservation lease expired',
          completed_at = null,
          updated_at = now()
      where target.id = completion_request.id
        and target.reservation_token = completion_request.reservation_token;
      refunded_count := refunded_count + 1;
      continue;
    end if;

    if completion_request.state in ('dispatching', 'dispatched') then
      charge := completion_request.reserved_fen;
      usage_meter_key := 'v3:' || completion_request.meter_key::text || ':'
        || substring(completion_request.request_hash, 1, 32);
      ledger_reference := 'usage:completion:' || usage_meter_key || ':80';

      insert into public.star_interview_usage_meters (
        user_id, feature, meter_key, max_units, nominal_cost_fen
      ) values (
        completion_request.user_id, 'completion', usage_meter_key, 1, 80
      )
      on conflict (user_id, feature, meter_key) do update
      set max_units = greatest(public.star_interview_usage_meters.max_units, 1),
          nominal_cost_fen = greatest(public.star_interview_usage_meters.nominal_cost_fen, 80),
          updated_at = now();

      update public.star_interview_wallets
      set total_spent_fen = total_spent_fen + charge,
          nominal_spent_fen = nominal_spent_fen + 80,
          updated_at = now()
      where user_id = completion_request.user_id
      returning * into wallet;

      insert into public.star_interview_ledger (
        user_id, entry_type, amount_fen, nominal_amount_fen, balance_after_fen,
        feature, units, reference_key, note, metadata
      ) values (
        completion_request.user_id, 'usage', -charge, -80, wallet.balance_fen,
        'completion', 1, ledger_reference,
        case when charge = 0 then '无限账户影子消耗' else '按量使用' end,
        jsonb_build_object(
          'unlimited', charge = 0,
          'request_hash', completion_request.request_hash,
          'stream', completion_request.stream,
          'dispatch_lease_expired', true,
          'dispatch_phase_at_expiry', completion_request.state,
          'scheduled_reconciliation', true
        )
      )
      on conflict (user_id, reference_key) do nothing;

      update public.star_interview_completion_requests as target
      set state = 'consumed',
          reservation_token = null,
          lease_expires_at = null,
          reserved_fen = 0,
          actual_charge_fen = charge,
          last_error = case when completion_request.state = 'dispatching'
            then 'dispatch intent lease expired'
            else 'dispatched request lease expired' end,
          completed_at = now(),
          updated_at = now()
      where target.id = completion_request.id
        and target.reservation_token = completion_request.reservation_token;
      finalized_count := finalized_count + 1;
      continue;
    end if;

    update public.star_interview_completion_requests as target
    set state = 'consumed',
        reservation_token = null,
        lease_expires_at = null,
        last_error = 'stream interrupted after charge',
        completed_at = coalesce(completed_at, now()),
        updated_at = now()
    where target.id = completion_request.id
      and target.reservation_token = completion_request.reservation_token;
    interrupted_count := interrupted_count + 1;
  end loop;

  return jsonb_build_object(
    'refunded', refunded_count,
    'finalized', finalized_count,
    'interrupted', interrupted_count
  );
end;
$$;

revoke all on function public.reserve_star_interview_completion(
  uuid, uuid, text, boolean, boolean
) from public, anon, authenticated;
revoke all on function public.consume_star_interview_usage(
  uuid, text, text, bigint, boolean
) from public, anon, authenticated;
revoke all on function public.purge_star_interview_completion_cache()
  from public, anon, authenticated;
revoke all on function public.get_star_interview_completion(
  uuid, uuid, text
) from public, anon, authenticated;
revoke all on function public.mark_star_interview_completion_dispatch_intent(
  uuid, uuid, text, uuid
) from public, anon, authenticated;
revoke all on function public.mark_star_interview_completion_dispatched(
  uuid, uuid, text, uuid
) from public, anon, authenticated;
revoke all on function public.commit_star_interview_completion_stream(
  uuid, uuid, text, uuid
) from public, anon, authenticated;
revoke all on function public.complete_star_interview_completion(
  uuid, uuid, text, uuid, text, text
) from public, anon, authenticated;
revoke all on function public.fail_star_interview_completion(
  uuid, uuid, text, uuid, text, boolean
) from public, anon, authenticated;
revoke all on function public.reconcile_star_interview_completion_leases(integer)
  from public, anon, authenticated;

grant execute on function public.reserve_star_interview_completion(
  uuid, uuid, text, boolean, boolean
) to service_role;
grant execute on function public.consume_star_interview_usage(
  uuid, text, text, bigint, boolean
) to service_role;
grant execute on function public.purge_star_interview_completion_cache()
  to service_role;
grant execute on function public.get_star_interview_completion(
  uuid, uuid, text
) to service_role;
grant execute on function public.mark_star_interview_completion_dispatch_intent(
  uuid, uuid, text, uuid
) to service_role;
grant execute on function public.mark_star_interview_completion_dispatched(
  uuid, uuid, text, uuid
) to service_role;
grant execute on function public.commit_star_interview_completion_stream(
  uuid, uuid, text, uuid
) to service_role;
grant execute on function public.complete_star_interview_completion(
  uuid, uuid, text, uuid, text, text
) to service_role;
grant execute on function public.fail_star_interview_completion(
  uuid, uuid, text, uuid, text, boolean
) to service_role;
grant execute on function public.reconcile_star_interview_completion_leases(integer)
  to service_role;

-- Physical deletion is independent of future application traffic. The stable
-- job name makes re-applying this migration idempotently replace the schedule.
select cron.schedule(
  'star-interview-completion-cache-purge',
  '* * * * *',
  'select public.reconcile_star_interview_completion_leases(500); select public.purge_star_interview_completion_cache();'
);

-- pg_cron records every minute-level run. Retain only seven days of this
-- project's own maintenance history so observability does not become bloat.
select cron.schedule(
  'star-interview-maintenance-history-purge',
  '17 3 * * *',
  'delete from cron.job_run_details d using cron.job j where d.jobid = j.jobid and j.jobname in (''star-interview-completion-cache-purge'', ''star-interview-maintenance-history-purge'') and d.start_time < now() - interval ''7 days'';'
);

commit;
