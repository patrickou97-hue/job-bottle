import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { fulfillVipPayment } from "@/lib/starjob-vip-payment";
import { vipJson } from "@/lib/starjob-vip-server";
import { verifyAndDecryptWechatNotification, WechatPayVerificationError } from "@/lib/wechat-pay";

export async function POST(request: NextRequest) {
  try {
    if (Number(request.headers.get("content-length")) > 32_000) {
      return vipJson({ code: "FAIL", message: "回调内容过长" }, 413);
    }
    const payment = verifyAndDecryptWechatNotification({
      body: await request.text(),
      timestamp: request.headers.get("wechatpay-timestamp") ?? "",
      nonce: request.headers.get("wechatpay-nonce") ?? "",
      signature: request.headers.get("wechatpay-signature") ?? "",
      serial: request.headers.get("wechatpay-serial") ?? "",
    });
    const id = z.uuid().safeParse(payment.attach);
    if (!id.success) throw new WechatPayVerificationError("VIP_ORDER_ID_INVALID");
    const { data, error } = await createAdminClient().from("starjob_vip_orders")
      .select("id,provider_order_id,amount_fen").eq("id", id.data).maybeSingle();
    if (error) throw error;
    if (!data) throw new WechatPayVerificationError("VIP_ORDER_NOT_FOUND");
    await fulfillVipPayment(payment, data);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const invalid = error instanceof WechatPayVerificationError;
    console.error("[starjob_vip_payment]", invalid ? error.code : "FULFILLMENT_ERROR");
    return vipJson({ code: "FAIL", message: invalid ? "回调校验失败" : "回调处理失败" }, invalid ? 401 : 500);
  }
}
