import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createWechatNativeOrder, getWechatPayConfiguration } from "@/lib/wechat-pay";

const schema = z.object({ amountFen: z.union([
  z.literal(1_000),
  z.literal(2_000),
  z.literal(4_000),
  z.literal(10_000),
]) }).strict();

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "请先登录拾星充值。" }, { status: 401 });
  if (!getWechatPayConfiguration()) {
    return NextResponse.json({ error: "微信支付通道尚未配置完成。" }, { status: 503 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "请选择有效的充值金额。" }, { status: 400 });

  const admin = createAdminClient();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1_000);
  const outTradeNo = `SI${Date.now().toString(36)}${randomBytes(5).toString("hex")}`.slice(0, 32);
  const { data: order, error: insertError } = await admin
    .from("star_interview_recharge_orders")
    .insert({
      user_id: user.id,
      amount_fen: parsed.data.amountFen,
      provider_order_id: outTradeNo,
      expires_at: expiresAt.toISOString(),
    })
    .select("id,amount_fen,expires_at")
    .single();
  if (insertError) return NextResponse.json({ error: "充值订单创建失败。" }, { status: 500 });

  try {
    const codeUrl = await createWechatNativeOrder({
      outTradeNo,
      amountFen: order.amount_fen,
      expiresAt: expiresAt.toISOString(),
      attach: order.id,
    });
    await admin.from("star_interview_recharge_orders")
      .update({ code_url: codeUrl, updated_at: new Date().toISOString() })
      .eq("id", order.id);
    return NextResponse.json({
      orderId: order.id,
      amountFen: order.amount_fen,
      expiresAt: order.expires_at,
      qrDataUrl: await QRCode.toDataURL(codeUrl, { margin: 1, width: 280, errorCorrectionLevel: "M" }),
    });
  } catch {
    await admin.from("star_interview_recharge_orders")
      .update({ status: "closed", updated_at: new Date().toISOString() })
      .eq("id", order.id);
    return NextResponse.json({ error: "微信支付下单失败，本次未扣款。" }, { status: 502 });
  }
}
