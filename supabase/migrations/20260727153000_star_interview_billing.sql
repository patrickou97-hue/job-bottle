begin;

create table if not exists public.star_interview_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance_fen bigint not null default 0 check (balance_fen >= 0),
  total_granted_fen bigint not null default 0 check (total_granted_fen >= 0),
  total_recharged_fen bigint not null default 0 check (total_recharged_fen >= 0),
  total_spent_fen bigint not null default 0 check (total_spent_fen >= 0),
  nominal_spent_fen bigint not null default 0 check (nominal_spent_fen >= 0),
  currency text not null default 'CNY' check (currency = 'CNY'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.star_interview_usage_meters (
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null check (feature in ('asr', 'completion')),
  meter_key text not null check (char_length(meter_key) between 8 and 120),
  max_units bigint not null default 0 check (max_units >= 0),
  nominal_cost_fen bigint not null default 0 check (nominal_cost_fen >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, feature, meter_key)
);

create table if not exists public.star_interview_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_type text not null check (entry_type in ('usage', 'admin_grant', 'recharge', 'refund', 'correction')),
  amount_fen bigint not null,
  nominal_amount_fen bigint not null default 0,
  balance_after_fen bigint not null check (balance_after_fen >= 0),
  feature text check (feature is null or feature in ('asr', 'completion')),
  units bigint,
  reference_key text not null,
  note text,
  actor_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, reference_key)
);

create index if not exists star_interview_ledger_user_created_idx
  on public.star_interview_ledger (user_id, created_at desc);

create table if not exists public.star_interview_recharge_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_fen bigint not null check (amount_fen between 100 and 100000),
  status text not null default 'pending' check (status in ('pending', 'paid', 'closed', 'refunded')),
  provider text not null default 'wechat_native' check (provider in ('wechat_native')),
  provider_order_id text unique,
  code_url text,
  expires_at timestamptz not null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists star_interview_recharge_orders_user_created_idx
  on public.star_interview_recharge_orders (user_id, created_at desc);

alter table public.star_interview_wallets enable row level security;
alter table public.star_interview_usage_meters enable row level security;
alter table public.star_interview_ledger enable row level security;
alter table public.star_interview_recharge_orders enable row level security;

create policy "Users can read their StarInterview wallet"
  on public.star_interview_wallets for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can read their StarInterview ledger"
  on public.star_interview_ledger for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can read their StarInterview recharge orders"
  on public.star_interview_recharge_orders for select to authenticated
  using (auth.uid() = user_id);

create or replace function public.get_star_interview_wallet(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  wallet public.star_interview_wallets%rowtype;
begin
  insert into public.star_interview_wallets (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into wallet
  from public.star_interview_wallets
  where user_id = p_user_id;

  return jsonb_build_object(
    'user_id', wallet.user_id,
    'balance_fen', wallet.balance_fen,
    'total_granted_fen', wallet.total_granted_fen,
    'total_recharged_fen', wallet.total_recharged_fen,
    'total_spent_fen', wallet.total_spent_fen,
    'nominal_spent_fen', wallet.nominal_spent_fen,
    'currency', wallet.currency,
    'updated_at', wallet.updated_at
  );
end;
$$;

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

  insert into public.star_interview_wallets (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into wallet
  from public.star_interview_wallets
  where user_id = p_user_id
  for update;

  insert into public.star_interview_usage_meters (user_id, feature, meter_key)
  values (p_user_id, p_feature, p_meter_key)
  on conflict (user_id, feature, meter_key) do nothing;

  select * into meter
  from public.star_interview_usage_meters
  where user_id = p_user_id and feature = p_feature and meter_key = p_meter_key
  for update;

  if p_feature = 'asr' then
    -- ¥0.40/minute. Cumulative snapshots use the maximum observed duration,
    -- so repeated partial recognition never bills the same audio twice.
    new_total_cost := ceil(greatest(p_units, meter.max_units)::numeric * 40 / 60000)::bigint;
  else
    -- ¥0.80 for one successfully generated answer.
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
  where user_id = p_user_id and feature = p_feature and meter_key = p_meter_key;

  update public.star_interview_wallets
  set balance_fen = balance_fen - actual_charge,
      total_spent_fen = total_spent_fen + actual_charge,
      nominal_spent_fen = nominal_spent_fen + delta_cost,
      updated_at = now()
  where user_id = p_user_id
  returning * into wallet;

  if delta_cost > 0 then
    reference := 'usage:' || p_feature || ':' || p_meter_key || ':' || new_total_cost::text;
    insert into public.star_interview_ledger (
      user_id, entry_type, amount_fen, nominal_amount_fen, balance_after_fen,
      feature, units, reference_key, note, metadata
    ) values (
      p_user_id, 'usage', -actual_charge, -delta_cost, wallet.balance_fen,
      p_feature, p_units, reference, case when p_unlimited then '无限账户影子消耗' else '按量使用' end,
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

create or replace function public.adjust_star_interview_balance(
  p_user_id uuid,
  p_amount_fen bigint,
  p_entry_type text,
  p_reference_key text,
  p_note text,
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  wallet public.star_interview_wallets%rowtype;
  existing public.star_interview_ledger%rowtype;
begin
  if p_amount_fen = 0
    or p_entry_type not in ('admin_grant', 'recharge', 'refund', 'correction')
    or char_length(p_reference_key) not between 8 and 160
    or char_length(coalesce(p_note, '')) < 2 then
    raise exception 'invalid StarInterview balance adjustment';
  end if;

  select * into existing
  from public.star_interview_ledger
  where user_id = p_user_id and reference_key = p_reference_key;
  if found then
    return jsonb_build_object('balance_fen', existing.balance_after_fen, 'duplicate', true);
  end if;

  insert into public.star_interview_wallets (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into wallet
  from public.star_interview_wallets
  where user_id = p_user_id
  for update;

  if wallet.balance_fen + p_amount_fen < 0 then
    raise exception 'insufficient balance for adjustment';
  end if;

  update public.star_interview_wallets
  set balance_fen = balance_fen + p_amount_fen,
      total_granted_fen = total_granted_fen
        + case when p_entry_type = 'admin_grant' and p_amount_fen > 0 then p_amount_fen else 0 end,
      total_recharged_fen = total_recharged_fen
        + case when p_entry_type = 'recharge' and p_amount_fen > 0 then p_amount_fen else 0 end,
      updated_at = now()
  where user_id = p_user_id
  returning * into wallet;

  insert into public.star_interview_ledger (
    user_id, entry_type, amount_fen, nominal_amount_fen, balance_after_fen,
    reference_key, note, actor_user_id
  ) values (
    p_user_id, p_entry_type, p_amount_fen, p_amount_fen, wallet.balance_fen,
    p_reference_key, p_note, p_actor_user_id
  );

  return jsonb_build_object('balance_fen', wallet.balance_fen, 'duplicate', false);
end;
$$;

revoke all on function public.get_star_interview_wallet(uuid) from public, anon, authenticated;
revoke all on function public.consume_star_interview_usage(uuid, text, text, bigint, boolean) from public, anon, authenticated;
revoke all on function public.adjust_star_interview_balance(uuid, bigint, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.get_star_interview_wallet(uuid) to service_role;
grant execute on function public.consume_star_interview_usage(uuid, text, text, bigint, boolean) to service_role;
grant execute on function public.adjust_star_interview_balance(uuid, bigint, text, text, text, uuid) to service_role;

grant select on public.star_interview_wallets, public.star_interview_ledger, public.star_interview_recharge_orders to authenticated;

commit;
