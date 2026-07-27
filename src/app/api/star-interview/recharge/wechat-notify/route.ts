import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  validateWechatPaymentIdentity,
  verifyAndDecryptWechatNotification,
  WechatPayVerificationError,
  type WechatPayTransaction,
} from "@/lib/wechat-pay";

export const maxDuration = 10;

export async function POST(request: NextRequest) {
  const body = await request.text();
  try {
    const payment = verifyAndDecryptWechatNotification({
      body,
      timestamp: request.headers.get("wechatpay-timestamp") ?? "",
      nonce: request.headers.get("wechatpay-nonce") ?? "",
      signature: request.headers.get("wechatpay-signature") ?? "",
      serial: request.headers.get("wechatpay-serial") ?? "",
    });
    if (!isValidSuccessfulNativePayment(payment)) {
      throw new WechatPayVerificationError("WECHAT_PAY_TRANSACTION_INVALID");
    }
    const admin = createAdminClient();
    const { data: order, error } = await admin
      .from("star_interview_recharge_orders")
      .select("id,amount_fen,provider_order_id")
      .eq("id", payment.attach!)
      .maybeSingle();
    if (error) throw error;
    if (!order
      || order.provider_order_id !== payment.out_trade_no
      || payment.amount.total !== order.amount_fen) {
      throw new WechatPayVerificationError("WECHAT_PAY_ORDER_MISMATCH");
    }
    const { error: completionError } = await admin.rpc("complete_star_interview_recharge", {
      p_order_id: order.id,
      p_provider_order_id: payment.out_trade_no,
      p_transaction_id: payment.transaction_id,
    });
    if (completionError) throw completionError;
    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const verificationFailure = error instanceof WechatPayVerificationError;
    console.error("[star_interview_recharge_notify]", {
      category: verificationFailure ? "verification" : "processing",
      code: verificationFailure ? error.code : "INTERNAL_ERROR",
    });
    return NextResponse.json(
      { code: "FAIL", message: verificationFailure ? "回调校验失败" : "回调处理失败" },
      {
        status: verificationFailure ? 401 : 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}

function isValidSuccessfulNativePayment(payment: WechatPayTransaction) {
  return payment.trade_state === "SUCCESS"
    && payment.trade_type === "NATIVE"
    && validateWechatPaymentIdentity(payment)
    && typeof payment.attach === "string"
    && /^[0-9a-f-]{36}$/i.test(payment.attach)
    && /^[0-9A-Za-z_-]{6,32}$/.test(payment.out_trade_no)
    && /^[0-9A-Za-z_-]{6,32}$/.test(payment.transaction_id)
    && payment.amount.currency === "CNY"
    && payment.amount.payer_currency === "CNY"
    && Number.isInteger(payment.amount.total)
    && payment.amount.total > 0
    && Number.isInteger(payment.amount.payer_total)
    && payment.amount.payer_total >= 0
    && payment.amount.payer_total <= payment.amount.total;
}
