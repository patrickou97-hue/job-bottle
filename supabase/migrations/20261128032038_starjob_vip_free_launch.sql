create table public.starjob_vip_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_fen integer not null default 1999 check (amount_fen = 1999),
  provider_order_id text not null unique,
  provider_transaction_id text unique,
  status text not null default 'pending' check (status in ('pending', 'paid', 'closed')),
  code_url text,
  checkout_started_at timestamptz not null default now(),
  provider_last_checked_at timestamptz,
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  paid_at timestamptz
);

create unique index starjob_vip_one_pending_order
  on public.starjob_vip_orders (user_id) where status = 'pending';

create table public.starjob_vip_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  order_id uuid unique references public.starjob_vip_orders(id),
  active boolean not null default true,
  plan text not null default 'full' check (plan in ('free_launch', 'full')),
  free_claimed_at timestamptz,
  activated_at timestamptz not null default now(),
  last_started_at timestamptz
);

-- Carry forward only explicitly granted legacy access. An admin role alone is not a membership.
insert into public.starjob_vip_memberships (user_id)
select id from auth.users where raw_app_meta_data -> 'star_interview_unlimited_access' = 'true'::jsonb;

create table public.starjob_vip_uses (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  task text not null check (task in ('compose', 'advanced', 'flash', 'standard')),
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index starjob_vip_uses_by_user
  on public.starjob_vip_uses (user_id, started_at desc);

alter table public.starjob_vip_uses enable row level security;
revoke all on public.starjob_vip_uses from public, anon, authenticated;
grant select, insert, update, delete on public.starjob_vip_uses to service_role;

alter table public.starjob_vip_orders enable row level security;
alter table public.starjob_vip_memberships enable row level security;
revoke all on public.starjob_vip_orders, public.starjob_vip_memberships from public, anon, authenticated;
grant select, insert, update on public.starjob_vip_orders, public.starjob_vip_memberships to service_role;

-- Caller supplies the verified session user; only the server can execute this function.
create function public.claim_starjob_vip_free(p_user_id uuid)
returns boolean language plpgsql set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 63821));
  insert into public.starjob_vip_memberships(user_id, plan, free_claimed_at)
    values (p_user_id, 'free_launch', now()) on conflict (user_id) do nothing;
  return (select active from public.starjob_vip_memberships where user_id = p_user_id);
end;
$$;
revoke all on function public.claim_starjob_vip_free(uuid) from public, anon, authenticated;
grant execute on function public.claim_starjob_vip_free(uuid) to service_role;

create function public.prepare_starjob_vip_order(p_user_id uuid, p_provider_order_id text)
returns jsonb language plpgsql set search_path = '' as $$
declare
  vip_order public.starjob_vip_orders%rowtype;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 63821));
  if exists (select 1 from public.starjob_vip_memberships where user_id = p_user_id and active and plan = 'full') then
    return jsonb_build_object('state', 'active');
  end if;
  select * into vip_order from public.starjob_vip_orders
    where user_id = p_user_id and status = 'pending' for update;
  if not found then
    insert into public.starjob_vip_orders (user_id, provider_order_id)
      values (p_user_id, p_provider_order_id) returning * into vip_order;
  elsif vip_order.expires_at <= now() then
    return jsonb_build_object('state', 'expired', 'order', to_jsonb(vip_order));
  elsif vip_order.code_url is not null then
    return jsonb_build_object('state', 'ready', 'order', to_jsonb(vip_order));
  elsif vip_order.checkout_started_at > now() - interval '25 seconds' then
    return jsonb_build_object('state', 'processing');
  else
    update public.starjob_vip_orders set checkout_started_at = now() where id = vip_order.id;
  end if;
  return jsonb_build_object('state', 'create', 'order', to_jsonb(vip_order));
end;
$$;

create function public.complete_starjob_vip_order(
  p_id uuid, p_provider_order_id text, p_transaction_id text
)
returns void language plpgsql set search_path = '' as $$
declare
  vip_order public.starjob_vip_orders%rowtype;
begin
  select * into strict vip_order from public.starjob_vip_orders
    where id = p_id and provider_order_id = p_provider_order_id;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(vip_order.user_id::text, 63821));
  select * into strict vip_order from public.starjob_vip_orders where id = p_id for update;
  if vip_order.status = 'paid' then
    if vip_order.provider_transaction_id is distinct from p_transaction_id then
      raise exception 'VIP transaction mismatch';
    end if;
    return;
  end if;

  update public.starjob_vip_orders
    set status = 'paid', provider_transaction_id = p_transaction_id, paid_at = now()
    where id = vip_order.id;
  insert into public.starjob_vip_memberships (user_id, order_id)
    values (vip_order.user_id, vip_order.id) on conflict (user_id) do update set active = true, plan = 'full', order_id = excluded.order_id;
end;
$$;

create function public.starjob_vip_available_uses(p_user_id uuid)
returns jsonb language sql stable set search_path = '' as $$
  with windows as (
    select date_trunc('day', now() at time zone 'Asia/Shanghai') as day_start,
           date_trunc('week', now() at time zone 'Asia/Shanghai') as week_start
  ), entitlement as (
    select exists (select 1 from public.starjob_vip_memberships where user_id = p_user_id and active) as vip,
           (select plan from public.starjob_vip_memberships where user_id = p_user_id and active) as plan
  )
  select jsonb_build_object(
    'active', e.vip, 'plan', e.plan,
    'basicWeeklyRemaining', greatest(0, (case when e.vip then 100 else 30 end) - count(*) filter (
      where u.task in ('flash', 'standard') and u.finished_at >= (w.week_start at time zone 'Asia/Shanghai'))),
    'basicHourlyRemaining', greatest(0, (case when e.vip then 20 else 5 end) - count(*) filter (where u.task in ('flash', 'standard')
      and u.finished_at > now() - interval '1 hour')),
    'composeRemaining', greatest(0, (case when e.vip then 3 else 0 end) - count(*) filter (where u.task = 'compose'
      and u.finished_at >= (w.day_start at time zone 'Asia/Shanghai'))),
    'composeWeeklyRemaining', greatest(0, (case when e.vip then 10 else 0 end) - count(*) filter (where u.task = 'compose'
      and u.finished_at >= (w.week_start at time zone 'Asia/Shanghai'))),
    'advancedHourlyRemaining', greatest(0, (case when e.plan = 'full' then 8 else 0 end) - count(*) filter (where u.task = 'advanced'
      and u.finished_at > now() - interval '1 hour')),
    'advancedWeeklyRemaining', greatest(0, (case when e.plan = 'full' then 40 else 0 end) - count(*) filter (where u.task = 'advanced'
      and u.finished_at >= (w.week_start at time zone 'Asia/Shanghai'))),
    'composeResetAt', (w.day_start + interval '1 day') at time zone 'Asia/Shanghai',
    'advancedHourlyResetAt', min(u.finished_at) filter (where u.task = 'advanced'
      and u.finished_at > now() - interval '1 hour') + interval '1 hour',
    'weeklyResetAt', (w.week_start + interval '1 week') at time zone 'Asia/Shanghai'
  )
  from windows w cross join entitlement e
  left join public.starjob_vip_uses u on u.user_id = p_user_id and u.started_at > now() - interval '8 days'
  group by w.day_start, w.week_start, e.vip, e.plan;
$$;

create function public.reserve_starjob_vip_use(p_user_id uuid, p_id uuid, p_task text)
returns text language plpgsql set search_path = '' as $$
declare
  last_started timestamptz;
  quota jsonb;
begin
  if p_task is null or p_task not in ('compose', 'advanced', 'flash', 'standard') then raise exception 'Invalid VIP task'; end if;
  -- All account tiers share one lock and basic editing history across membership changes.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 63821));
  select last_started_at into last_started from public.starjob_vip_memberships where user_id = p_user_id and active for update;
  if not found and p_task <> 'standard' then return 'locked'; end if;

  if p_task = 'advanced' and not exists (select 1 from public.starjob_vip_memberships
      where user_id = p_user_id and active and plan = 'full') then return 'advanced_locked'; end if;

  delete from public.starjob_vip_uses where user_id = p_user_id and (
    started_at <= now() - interval '8 days' or (finished_at is null and started_at <= now() - interval '2 minutes')
  );
  if last_started > now() - interval '4 seconds' or exists (
    select 1 from public.starjob_vip_uses where user_id = p_user_id and finished_at is null
  ) then return 'busy'; end if;

  quota := public.starjob_vip_available_uses(p_user_id);
  if (p_task in ('flash', 'standard') and (quota ->> 'basicHourlyRemaining')::integer = 0)
    or (p_task in ('flash', 'standard') and (quota ->> 'basicWeeklyRemaining')::integer = 0)
    or (p_task = 'compose' and (quota ->> 'composeRemaining')::integer = 0)
    or (p_task = 'compose' and (quota ->> 'composeWeeklyRemaining')::integer = 0)
    or (p_task = 'advanced' and (quota ->> 'advancedHourlyRemaining')::integer = 0)
    or (p_task = 'advanced' and (quota ->> 'advancedWeeklyRemaining')::integer = 0)
  then return 'quota'; end if;

  insert into public.starjob_vip_uses (id, user_id, task) values (p_id, p_user_id, p_task);
  update public.starjob_vip_memberships set last_started_at = now() where user_id = p_user_id;
  return 'reserved';
end;
$$;

create function public.finish_starjob_vip_use(p_user_id uuid, p_id uuid, p_success boolean)
returns boolean language plpgsql set search_path = '' as $$
declare
  usage_event public.starjob_vip_uses%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 63821));

  select * into usage_event from public.starjob_vip_uses where id = p_id and user_id = p_user_id;
  if not found then return false; end if;
  if usage_event.finished_at is not null then return true; end if;
  if usage_event.started_at <= now() - interval '2 minutes' then return false; end if;

  if p_success and usage_event.task <> 'standard' and not exists (
    select 1 from public.starjob_vip_memberships where user_id = p_user_id and active
  ) then return false; end if;
  if p_success then
    update public.starjob_vip_uses set finished_at = now() where id = p_id;
  else
    delete from public.starjob_vip_uses where id = p_id;
  end if;

  return true;
end;
$$;

revoke all on function public.prepare_starjob_vip_order(uuid, text),
  public.complete_starjob_vip_order(uuid, text, text),
  public.starjob_vip_available_uses(uuid),
  public.reserve_starjob_vip_use(uuid, uuid, text),
  public.finish_starjob_vip_use(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.prepare_starjob_vip_order(uuid, text),
  public.complete_starjob_vip_order(uuid, text, text),
  public.starjob_vip_available_uses(uuid),
  public.reserve_starjob_vip_use(uuid, uuid, text),
  public.finish_starjob_vip_use(uuid, uuid, boolean) to service_role;

-- Serialize a manual grant with checkout and account administration. Quota history
-- stays on the same row across revocations, new grants and payment retries.
create function public.set_starjob_vip_membership(p_actor uuid, p_target uuid, p_active boolean)
returns text language plpgsql security definer set search_path = '' as $$
begin
  if p_actor is null or p_target is null or p_active is null then return 'invalid'; end if;
  perform pg_advisory_xact_lock(hashtextextended('admin-user-mutation:' || least(p_actor::text, p_target::text), 0));
  if p_actor <> p_target then
    perform pg_advisory_xact_lock(hashtextextended('admin-user-mutation:' || greatest(p_actor::text, p_target::text), 0));
  end if;
  perform 1 from auth.users u join public.profiles p on p.id = u.id
    where u.id = p_actor and p.role = 'admin' and lower(trim(u.email)) = 'raywang6688@outlook.com'
    and (u.banned_until is null or u.banned_until <= now()) for share of u, p;
  if not found then return 'forbidden'; end if;
  if exists (select 1 from public.admin_user_mutation_guards where target_user_id in (p_actor, p_target)) then
    return 'busy';
  end if;
  perform 1 from auth.users where id = p_target for key share;
  if not found then return 'missing'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_target::text, 63821));
  insert into public.starjob_vip_memberships (user_id, active) values (p_target, p_active)
    on conflict (user_id) do update set active = excluded.active;
  return 'ok';
end;
$$;
revoke all on function public.set_starjob_vip_membership(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.set_starjob_vip_membership(uuid, uuid, boolean) to service_role;

-- The web client uses session-bound functions. The authenticated role has no table grants.
-- Close free enrollment by revoking EXECUTE on claim_my_starjob_vip_free() from authenticated.
create function public.claim_my_starjob_vip_free() returns boolean
language sql security definer set search_path = '' as $$
  select public.claim_starjob_vip_free(auth.uid());
$$;
create function public.my_starjob_vip_status() returns jsonb
language sql stable security definer set search_path = '' as $$
  select public.starjob_vip_available_uses(auth.uid());
$$;
create function public.reserve_my_starjob_vip_use(p_id uuid, p_task text) returns text
language sql security definer set search_path = '' as $$
  select public.reserve_starjob_vip_use(auth.uid(), p_id, p_task);
$$;
create function public.finish_my_starjob_vip_use(p_id uuid, p_success boolean) returns boolean
language sql security definer set search_path = '' as $$
  select public.finish_starjob_vip_use(auth.uid(), p_id, p_success);
$$;
revoke all on function public.claim_my_starjob_vip_free(), public.my_starjob_vip_status(),
  public.reserve_my_starjob_vip_use(uuid,text), public.finish_my_starjob_vip_use(uuid,boolean) from public, anon;
grant execute on function public.claim_my_starjob_vip_free(), public.my_starjob_vip_status(),
  public.reserve_my_starjob_vip_use(uuid,text), public.finish_my_starjob_vip_use(uuid,boolean) to authenticated;
