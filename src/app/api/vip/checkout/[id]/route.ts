import { NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVipWebUserId, isVipEnabled, isVipSameOrigin, vipJson } from "@/lib/starjob-vip-server";
import { reconcileVipPayment } from "@/lib/starjob-vip-payment";

export const maxDuration = 30;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isVipSameOrigin(request)) return vipJson({ error: "请求来源无效。" }, 403);
  if (!isVipEnabled()) return vipJson({ error: "正式支付尚未开放。" }, 503);
  const userId = await getVipWebUserId();
  if (!userId) return vipJson({ error: "请先登录拾星。" }, 401);
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) return vipJson({ error: "订单不存在。" }, 404);

  const admin = createAdminClient();
  const { data, error } = await admin.from("starjob_vip_orders")
    .select("id,provider_order_id,amount_fen,expires_at,status")
    .eq("id", id.data).eq("user_id", userId).maybeSingle();
  if (error) return vipJson({ error: "暂时无法查询订单，请稍后重试。" }, 503);
  if (!data) return vipJson({ error: "订单不存在。" }, 404);
  if (data.status !== "pending") return vipJson({ status: data.status });
  const now = Date.now();
  const cutoff = new Date(now - 4_000).toISOString();
  const { data: claimed, error: claimError } = await admin.from("starjob_vip_orders")
    .update({ provider_last_checked_at: new Date(now).toISOString() })
    .eq("id", data.id).eq("user_id", userId).eq("status", "pending")
    .or(`provider_last_checked_at.is.null,provider_last_checked_at.lt.${cutoff}`)
    .select("id").maybeSingle();
  if (claimError) return vipJson({ error: "暂时无法查询订单，请稍后重试。" }, 503);
  if (!claimed) return vipJson({ status: "pending" });
  try {
    return vipJson({ status: await reconcileVipPayment(data) });
  } catch {
    return vipJson({ error: "暂时无法确认支付，请稍后重试。" }, 502);
  }
}
