import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";
import {
  getVipStatus, getVipWebUserId, freeEnrollmentOpen, isVipSameOrigin, vipJson,
} from "@/lib/starjob-vip-server";

export async function GET(request: NextRequest) {
  try {
    return vipJson(await getVipStatus(request));
  } catch {
    return vipJson({ error: "VIP 状态暂时无法查询，请稍后重试。" }, 503);
  }
}

export async function POST(request: NextRequest) {
  if (!isVipSameOrigin(request)) return vipJson({ error: "请求来源无效。" }, 403);
  if (!freeEnrollmentOpen(request)) return vipJson({ error: "限时免费开通暂未开放。" }, 403);
  const body = await request.json().catch(() => null);
  if (body?.action !== "activate" || Object.keys(body).length !== 1) return vipJson({ error: "开通请求无效。" }, 400);
  const userId = await getVipWebUserId();
  if (!userId) return vipJson({ error: "请登录后开通。" }, 401);
  const { data, error } = await (await createClient()).rpc("claim_my_starjob_vip_free");
  if (error) return vipJson({ error: "开通未完成，请稍后重试。" }, 503);
  if (!data) return vipJson({ error: "当前账号暂时无法开通，请联系帮助与反馈。" }, 403);
  return vipJson({ active: true });
}
