begin;

alter table public.star_interview_recharge_orders
  add column if not exists client_request_id uuid,
  add column if not exists provider_trade_state text,
  add column if not exists provider_last_checked_at timestamptz;

create unique index if not exists star_interview_recharge_orders_user_request_idx
  on public.star_interview_recharge_orders (user_id, client_request_id)
  where client_request_id is not null;

create unique index if not exists star_interview_recharge_orders_transaction_idx
  on public.star_interview_recharge_orders (provider_transaction_id)
  where provider_transaction_id is not null;

create or replace function public.create_star_interview_recharge_order(
  p_order_id uuid,
  p_user_id uuid,
  p_amount_fen bigint,
  p_provider_order_id text,
  p_client_request_id uuid,
  p_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  existing_order public.star_interview_recharge_orders%rowtype;
  created_order public.star_interview_recharge_orders%rowtype;
  recent_pending_count integer;
begin
  if p_amount_fen not in (1000, 2000, 4000, 10000)
    or p_expires_at <= now() + interval '1 minute'
    or p_expires_at > now() + interval '20 minutes'
    or p_provider_order_id !~ '^[0-9A-Za-z_-]{6,32}$' then
    raise exception 'invalid StarInterview recharge order';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select * into existing_order
  from public.star_interview_recharge_orders
  where user_id = p_user_id and client_request_id = p_client_request_id;

  if found then
    return to_jsonb(existing_order);
  end if;

  update public.star_interview_recharge_orders
  set status = 'closed',
      provider_trade_state = coalesce(provider_trade_state, 'EXPIRED'),
      updated_at = now()
  where user_id = p_user_id
    and status = 'pending'
    and expires_at <= now();

  select count(*) into recent_pending_count
  from public.star_interview_recharge_orders
  where user_id = p_user_id
    and status = 'pending'
    and created_at > now() - interval '10 minutes';

  if recent_pending_count >= 3 then
    raise exception 'too many pending StarInterview recharge orders';
  end if;

  insert into public.star_interview_recharge_orders (
    id,
    user_id,
    amount_fen,
    provider_order_id,
    client_request_id,
    expires_at
  ) values (
    p_order_id,
    p_user_id,
    p_amount_fen,
    p_provider_order_id,
    p_client_request_id,
    p_expires_at
  )
  returning * into created_order;

  return to_jsonb(created_order);
end;
$$;

revoke all on function public.create_star_interview_recharge_order(
  uuid, uuid, bigint, text, uuid, timestamptz
) from public, anon, authenticated;

grant execute on function public.create_star_interview_recharge_order(
  uuid, uuid, bigint, text, uuid, timestamptz
) to service_role;

create or replace function public.complete_star_interview_recharge(
  p_order_id uuid,
  p_provider_order_id text,
  p_transaction_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  recharge_order public.star_interview_recharge_orders%rowtype;
  adjustment jsonb;
begin
  select * into recharge_order
  from public.star_interview_recharge_orders
  where id = p_order_id
  for update;

  if not found
    or recharge_order.provider_order_id <> p_provider_order_id
    or p_transaction_id !~ '^[0-9A-Za-z_-]{6,32}$' then
    raise exception 'invalid StarInterview recharge completion';
  end if;

  if recharge_order.status = 'paid' then
    if recharge_order.provider_transaction_id <> p_transaction_id then
      raise exception 'StarInterview recharge transaction mismatch';
    end if;
    return jsonb_build_object('paid', true, 'duplicate', true);
  end if;
  if recharge_order.status <> 'pending' then
    raise exception 'StarInterview recharge order is not payable';
  end if;

  adjustment := public.adjust_star_interview_balance(
    recharge_order.user_id,
    recharge_order.amount_fen,
    'recharge',
    'recharge:' || recharge_order.id::text,
    '微信支付充值',
    null
  );

  update public.star_interview_recharge_orders
  set status = 'paid',
      provider_transaction_id = p_transaction_id,
      provider_trade_state = 'SUCCESS',
      provider_last_checked_at = now(),
      paid_at = now(),
      updated_at = now()
  where id = recharge_order.id;

  return jsonb_build_object(
    'paid', true,
    'duplicate', false,
    'balance_fen', adjustment->'balance_fen'
  );
end;
$$;

revoke all on function public.complete_star_interview_recharge(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.complete_star_interview_recharge(uuid, text, text)
  to service_role;

commit;
