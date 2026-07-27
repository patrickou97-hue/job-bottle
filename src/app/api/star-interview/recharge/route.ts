import { randomBytes, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { z } from "zod";
import { authenticateStarInterviewAppRequest } from "@/lib/star-interview-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  closeWechatNativeOrder,
  createWechatNativeOrder,
  getWechatPayConfiguration,
} from "@/lib/wechat-pay";

const schema = z.object({
  amountFen: z.union([
    z.literal(1_000),
    z.literal(2_000),
    z.literal(4_000),
    z.literal(10_000),
  ]),
  idempotencyKey: z.string().uuid(),
}).strict();

export async function POST(request: NextRequest) {
  const access = await authenticateStarInterviewAppRequest(request);
  if (!access) return noStore({ error: "诘星登录状态已失效，请重新连接拾星。" }, 401);
  if (!getWechatPayConfiguration()) {
    return noStore({ error: "微信支付通道尚未配置完成。" }, 503);
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return noStore({ error: "请选择有效的充值金额。" }, 400);

  const admin = createAdminClient();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1_000);
  const orderId = randomUUID();
  const outTradeNo = `SI${Date.now().toString(36)}${randomBytes(5).toString("hex")}`.slice(0, 32);
  const { data, error: createError } = await admin.rpc("create_star_interview_recharge_order", {
    p_order_id: orderId,
    p_user_id: access.sub,
    p_amount_fen: parsed.data.amountFen,
    p_provider_order_id: outTradeNo,
    p_client_request_id: parsed.data.idempotencyKey,
    p_expires_at: expiresAt.toISOString(),
  });
  if (createError) {
    const tooMany = createError.message.includes("too many pending");
    return noStore(
      { error: tooMany ? "待支付订单较多，请完成或等待订单失效后再试。" : "充值订单创建失败。" },
      tooMany ? 429 : 500,
    );
  }
  const order = asOrder(data);
  if (!order) return noStore({ error: "充值订单创建失败。" }, 500);

  if (order.codeUrl) {
    return noStore({
      orderId: order.id,
      amountFen: order.amountFen,
      expiresAt: order.expiresAt,
      qrDataUrl: await createQrDataUrl(order.codeUrl),
    });
  }

  try {
    const codeUrl = await createWechatNativeOrder({
      outTradeNo: order.providerOrderId,
      amountFen: order.amountFen,
      expiresAt: order.expiresAt,
      attach: order.id,
    });
    const { error: updateError } = await admin.from("star_interview_recharge_orders")
      .update({
        code_url: codeUrl,
        provider_trade_state: "NOTPAY",
        provider_last_checked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .eq("user_id", access.sub)
      .eq("status", "pending");
    if (updateError) throw updateError;
    return noStore({
      orderId: order.id,
      amountFen: order.amountFen,
      expiresAt: order.expiresAt,
      qrDataUrl: await createQrDataUrl(codeUrl),
    });
  } catch {
    await closeWechatNativeOrder(order.providerOrderId).catch(() => undefined);
    await admin.from("star_interview_recharge_orders")
      .update({
        status: "closed",
        provider_trade_state: "CREATE_FAILED",
        provider_last_checked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .eq("status", "pending");
    return noStore({ error: "微信支付下单失败，本次未扣款。" }, 502);
  }
}

function noStore(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function asOrder(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string"
    || typeof record.provider_order_id !== "string"
    || typeof record.expires_at !== "string"
    || !Number.isFinite(Number(record.amount_fen))) {
    return null;
  }
  return {
    id: record.id,
    providerOrderId: record.provider_order_id,
    expiresAt: record.expires_at,
    amountFen: Math.round(Number(record.amount_fen)),
    codeUrl: typeof record.code_url === "string" ? record.code_url : null,
  };
}

function createQrDataUrl(codeUrl: string) {
  return QRCode.toDataURL(codeUrl, {
    margin: 1,
    width: 280,
    errorCorrectionLevel: "M",
  });
}
