import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  validateWechatPaymentIdentity,
  verifyAndDecryptWechatNotification,
} from "@/lib/wechat-pay";

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
    if (payment.trade_state !== "SUCCESS" || !validateWechatPaymentIdentity(payment)) {
      throw new Error("WECHAT_PAY_TRANSACTION_INVALID");
    }
    const admin = createAdminClient();
    const { data: order, error } = await admin
      .from("star_interview_recharge_orders")
      .select("id,amount_fen,provider_order_id")
      .eq("id", payment.attach)
      .maybeSingle();
    if (error || !order
      || order.provider_order_id !== payment.out_trade_no
      || payment.amount.currency !== "CNY"
      || payment.amount.total !== order.amount_fen
      || payment.amount.payer_total !== order.amount_fen) {
      throw new Error("WECHAT_PAY_AMOUNT_MISMATCH");
    }
    const { error: completionError } = await admin.rpc("complete_star_interview_recharge", {
      p_order_id: order.id,
      p_provider_order_id: payment.out_trade_no,
      p_transaction_id: payment.transaction_id,
    });
    if (completionError) throw completionError;
    return NextResponse.json({ code: "SUCCESS", message: "成功" });
  } catch {
    return NextResponse.json(
      { code: "FAIL", message: "回调校验失败" },
      { status: 400 },
    );
  }
}
