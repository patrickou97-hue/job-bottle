import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateStarInterviewAppRequest } from "@/lib/star-interview-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  closeWechatNativeOrder,
  getWechatPayConfiguration,
  queryWechatNativeOrder,
  validateWechatPaymentIdentity,
  type WechatPayTransaction,
} from "@/lib/wechat-pay";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

const idSchema = z.string().uuid();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await authenticateStarInterviewAppRequest(request);
  if (!access) return noStore({ error: "诘星登录状态已失效，请重新连接拾星。" }, 401);
  const parsedId = idSchema.safeParse((await params).id);
  if (!parsedId.success) return noStore({ error: "充值订单不存在。" }, 404);

  const admin = createAdminClient();
  const { data: order, error } = await admin
    .from("star_interview_recharge_orders")
    .select("id,user_id,amount_fen,status,provider_order_id,provider_transaction_id,expires_at,provider_last_checked_at")
    .eq("id", parsedId.data)
    .eq("user_id", access.sub)
    .maybeSingle();
  if (error) return noStore({ error: "充值结果暂时无法查询。" }, 500);
  if (!order || !order.provider_order_id) return noStore({ error: "充值订单不存在。" }, 404);
  if (order.status !== "pending") {
    return noStore({ status: order.status, paid: order.status === "paid" });
  }
  if (!getWechatPayConfiguration()) {
    return noStore({ error: "微信支付通道尚未配置完成。" }, 503);
  }

  const lastCheckedAt = order.provider_last_checked_at
    ? new Date(order.provider_last_checked_at).getTime()
    : 0;
  if (Date.now() - lastCheckedAt < 2_000) {
    return noStore({ status: "pending", paid: false });
  }

  try {
    let payment = await queryWechatNativeOrder(order.provider_order_id);
    if (payment.trade_state === "SUCCESS") {
      await completePaidOrder({
        order,
        payment,
      });
      return noStore({ status: "paid", paid: true });
    }

    if (payment.trade_state === "NOTPAY"
      && new Date(order.expires_at).getTime() <= Date.now()) {
      try {
        await closeWechatNativeOrder(order.provider_order_id);
        payment = { ...payment, trade_state: "CLOSED" };
      } catch {
        const refreshed = await queryWechatNativeOrder(order.provider_order_id);
        if (refreshed.trade_state === "SUCCESS") {
          await completePaidOrder({ order, payment: refreshed });
          return noStore({ status: "paid", paid: true });
        }
        payment = refreshed;
      }
    }

    const localStatus = payment.trade_state === "CLOSED" ? "closed" : "pending";
    const { error: updateError } = await admin.from("star_interview_recharge_orders")
      .update({
        status: localStatus,
        provider_trade_state: payment.trade_state,
        provider_last_checked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .eq("user_id", access.sub)
      .eq("status", "pending");
    if (updateError) throw updateError;
    return noStore({ status: localStatus, paid: false });
  } catch {
    return noStore({ error: "微信支付结果暂时无法确认，请稍后重试。" }, 502);
  }
}

async function completePaidOrder(input: {
  order: {
    id: string;
    amount_fen: number;
    provider_order_id: string | null;
  };
  payment: WechatPayTransaction;
}) {
  if (!input.order.provider_order_id
    || !isMatchingSuccessfulPayment(input.payment, input.order)) {
    throw new Error("WECHAT_PAY_ORDER_MISMATCH");
  }
  const admin = createAdminClient();
  const { error: completionError } = await admin.rpc("complete_star_interview_recharge", {
    p_order_id: input.order.id,
    p_provider_order_id: input.order.provider_order_id,
    p_transaction_id: input.payment.transaction_id,
  });
  if (completionError) throw completionError;
}

function isMatchingSuccessfulPayment(
  payment: WechatPayTransaction,
  order: { id: string; amount_fen: number; provider_order_id: string | null },
) {
  return payment.trade_state === "SUCCESS"
    && payment.trade_type === "NATIVE"
    && validateWechatPaymentIdentity(payment)
    && payment.attach === order.id
    && payment.out_trade_no === order.provider_order_id
    && /^[0-9A-Za-z_-]{6,32}$/.test(payment.transaction_id)
    && payment.amount.currency === "CNY"
    && payment.amount.payer_currency === "CNY"
    && Number.isInteger(payment.amount.total)
    && payment.amount.total === order.amount_fen
    && Number.isInteger(payment.amount.payer_total)
    && payment.amount.payer_total >= 0
    && payment.amount.payer_total <= payment.amount.total;
}

function noStore(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
