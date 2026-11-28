import { getWechatPayConfiguration } from "@/lib/wechat-pay";
import { getVipModel } from "@/lib/starjob-vip-model";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVipStatus, getVipWebUserId, isVipPreview, isVipSalesEnabled, isVipSameOrigin, vipJson } from "@/lib/starjob-vip-server";
import { reconcileVipPayment } from "@/lib/starjob-vip-payment";
import { createWechatNativeOrder } from "@/lib/wechat-pay";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  if (!isVipSameOrigin(request)) return vipJson({ error: "请求来源无效。" }, 403);
  if (isVipPreview(request) || !isVipSalesEnabled()) return vipJson({ error: "正式支付尚未开放。" }, 503);
  const userId = await getVipWebUserId();
  if (!userId) return vipJson({ error: "请先登录拾星。" }, 401);
  const admin = createAdminClient();

  async function prepare() {
    const { data, error } = await admin.rpc("prepare_starjob_vip_order", {
      p_user_id: userId!, p_provider_order_id: `VIP${randomUUID().replace(/-/g, "").slice(0, 29)}`,
    });
    if (!data || error) throw new Error("VIP_ORDER_PREPARATION_FAILED");
    return data;
  }

  try {
    const status = await getVipStatus(request);
    if (status.plan === "full") return vipJson({ status: "paid" });
    if (!getWechatPayConfiguration() || !getVipModel("astra") || !getVipModel("flash")) return vipJson({ error: "正式支付暂未开放，请稍后再试。" }, 503);
    let result = await prepare();
    if (result.state === "expired") {
      const payment = await reconcileVipPayment(result.order);
      if (payment === "paid") return vipJson({ status: "paid" });
      if (payment === "pending") return vipJson({ status: "processing" });
      result = await prepare();
    }
    if (!("order" in result)) return vipJson({ status: result.state === "active" ? "paid" : "processing" });
    if (result.state === "expired") return vipJson({ status: "processing" });
    const order = result.order;
    let codeUrl = order.code_url;
    if (!codeUrl) {
      codeUrl = await createWechatNativeOrder({
        product: "starjob-vip", outTradeNo: order.provider_order_id, attach: order.id,
        amountFen: order.amount_fen, expiresAt: order.expires_at,
      });
      const { error } = await admin.from("starjob_vip_orders")
        .update({ code_url: codeUrl }).eq("id", order.id).eq("status", "pending");
      if (error) throw error;
    }
    return vipJson({
      status: "pending", orderId: order.id, expiresAt: order.expires_at,
      qrDataUrl: await QRCode.toDataURL(codeUrl, { width: 240, margin: 2, errorCorrectionLevel: "M" }),
    });
  } catch {
    return vipJson({ error: "暂时无法创建支付二维码，请稍后重试。" }, 502);
  }
}
