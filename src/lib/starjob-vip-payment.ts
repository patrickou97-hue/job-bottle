import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  closeWechatNativeOrder, queryWechatNativeOrder, validateWechatPaymentIdentity,
  WechatPayVerificationError, type WechatPayTransaction,
} from "@/lib/wechat-pay";

type VipPaymentOrder = { id: string; provider_order_id: string; amount_fen: number; expires_at: string; status: string };

export async function fulfillVipPayment(payment: WechatPayTransaction, order: Pick<VipPaymentOrder, "id" | "provider_order_id" | "amount_fen">) {
  if (payment.trade_state !== "SUCCESS"
    || payment.trade_type !== "NATIVE"
    || !validateWechatPaymentIdentity(payment)
    || payment.attach !== order.id
    || payment.out_trade_no !== order.provider_order_id
    || !/^[0-9A-Za-z_-]{6,32}$/.test(payment.transaction_id)
    || payment.amount?.currency !== "CNY"
    || payment.amount.payer_currency !== "CNY"
    || payment.amount.total !== order.amount_fen
    || !Number.isInteger(payment.amount.payer_total)
    || payment.amount.payer_total < 0
    || payment.amount.payer_total > order.amount_fen) {
    throw new WechatPayVerificationError("VIP_PAYMENT_MISMATCH");
  }

  const { error } = await createAdminClient().rpc("complete_starjob_vip_order", {
    p_id: order.id, p_provider_order_id: order.provider_order_id, p_transaction_id: payment.transaction_id,
  });
  if (error) throw error;
}

export async function reconcileVipPayment(order: VipPaymentOrder) {
  if (order.status !== "pending") return order.status;
  async function checkPayment() {
    const result = await queryWechatNativeOrder(order.provider_order_id);
    if (result.out_trade_no !== order.provider_order_id || !validateWechatPaymentIdentity(result)) {
      throw new WechatPayVerificationError("VIP_PAYMENT_MISMATCH");
    }
    if (result.trade_state === "SUCCESS") await fulfillVipPayment(result, order);
    return result.trade_state;
  }

  const expired = Date.parse(order.expires_at) <= Date.now();
  let tradeState: string;
  try {
    tradeState = await checkPayment();
  } catch (error) {
    if (!expired || !(error instanceof Error) || !error.message.endsWith(":ORDER_NOT_EXIST")) throw error;
    tradeState = "CLOSED";
  }
  if (tradeState === "NOTPAY" && expired) {
    try {
      await closeWechatNativeOrder(order.provider_order_id);
      tradeState = "CLOSED";
    } catch {
      tradeState = await checkPayment();
    }
  }
  if (tradeState === "SUCCESS") return "paid";
  if (["CLOSED", "REVOKED", "PAYERROR"].includes(tradeState)) {
    const { error } = await createAdminClient().from("starjob_vip_orders")
      .update({ status: "closed" }).eq("id", order.id).eq("status", "pending");
    if (error) throw error;
    return "closed";
  }
  return "pending";
}
