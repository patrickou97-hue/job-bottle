begin;

alter table public.star_interview_recharge_orders
  add column if not exists provider_transaction_id text unique;

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
    or char_length(coalesce(p_transaction_id, '')) < 8 then
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
