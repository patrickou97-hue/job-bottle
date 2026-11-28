import "server-only";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { VipStatus, VipUsageKind } from "@/lib/starjob-vip";
import { getVipModel } from "@/lib/starjob-vip-model";

export type VipIdentity = { userId: string; plan: "full" | "free_launch" };

export function isVipPreview(request: NextRequest) {
  return process.env.NODE_ENV === "development"
    && process.env.STARJOB_VIP_PREVIEW === "1"
    && ["127.0.0.1", "localhost", "[::1]"].includes(request.nextUrl.hostname);
}

export function isVipEnabled() {
  return process.env.STARJOB_VIP_ENABLED === "1";
}

export function isVipSalesEnabled() {
  return isVipEnabled() && process.env.STARJOB_VIP_FREE_ENROLLMENT === "0" && process.env.STARJOB_VIP_SALES_ENABLED === "1";
}

export function vipJson<T>(data: T, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
}

export function isVipSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return origin === null || origin === request.nextUrl.origin || (
    request.headers.get("sec-fetch-site") === "same-origin"
  );
}

export function freeEnrollmentOpen(request: NextRequest) {
  return (isVipEnabled() || isVipPreview(request)) && process.env.STARJOB_VIP_FREE_ENROLLMENT !== "0";
}

async function getVipWebUser() {
  try {
    const { data, error } = await (await createClient()).auth.getUser();
    return error ? null : data.user;
  } catch {
    return null;
  }
}

export async function getVipWebUserId() {
  return (await getVipWebUser())?.id ?? null;
}

export async function getVipStatus(request: NextRequest): Promise<VipStatus> {
  const base = {
    active: false, plan: null, advancedAvailable: false, preview: isVipPreview(request), composeLive: Boolean(getVipModel("flash")), signedIn: false, checkoutAvailable: false,
    basicWeeklyRemaining: 0, basicHourlyRemaining: 0, composeRemaining: 0, composeWeeklyRemaining: 0, advancedHourlyRemaining: 0, advancedWeeklyRemaining: 0,
    composeResetAt: null, advancedHourlyResetAt: null, weeklyResetAt: null,
  };
  if (!isVipEnabled() && !isVipPreview(request)) return base;
  const user = await getVipWebUser();
  const quota = user ? await (await createClient()).rpc("my_starjob_vip_status") : null;
  if (quota?.error) throw quota.error;
  return {
    ...base,
    ...quota?.data,
    signedIn: Boolean(user),
    account: user ? { id: user.id, email: user.email ?? null } : null,
    advancedAvailable: quota?.data?.plan === "full" && isVipSalesEnabled(),
    ...(!isVipSalesEnabled() ? { advancedHourlyRemaining: 0, advancedWeeklyRemaining: 0, advancedHourlyResetAt: null } : {}),
    checkoutAvailable: freeEnrollmentOpen(request),
  };
}

export async function checkVipIdentity(request: NextRequest) {
  if (!isVipEnabled() && !isVipPreview(request)) return vipJson({ error: "StarJob VIP 尚未开放。" }, 503);
  const id = await getVipWebUserId();
  if (!id) return vipJson({ error: "请先登录拾星。" }, 401);
  const { data, error } = await (await createClient()).rpc("my_starjob_vip_status");
  if (error) return vipJson({ error: "VIP 权益暂时无法查询，请稍后重试。" }, 503);
  if (!data?.plan || !data.active) return vipJson({ error: "请先开通 StarJob VIP。" }, 403);
  return { userId: id, plan: data.plan };
}

export async function reserveVipUse(identity: VipIdentity, task: VipUsageKind) {
  if (task === "advanced" && (identity.plan !== "full" || !isVipSalesEnabled())) return advancedLocked();
  return reserveAccountUse(identity.userId, task);
}

export async function reserveAccountUse(userId: string, task: VipUsageKind | "standard", client: "web" | "miniprogram" = "web") {
  const db = client === "web" ? await createClient() : createAdminClient();
  const reservationId = randomUUID();
  const { data, error } = client === "web"
    ? await db.rpc("reserve_my_starjob_vip_use", { p_id: reservationId, p_task: task })
    : await db.rpc("reserve_starjob_vip_use", { p_user_id: userId, p_id: reservationId, p_task: task });
  if (error || !data) return vipJson({ error: "额度服务暂时不可用，请稍后重试。" }, 503);
  if (data === "unlimited") return { async finish() { return true; } };
  if (data === "quota") return quotaExceeded(task);
  if (data === "advanced_locked") return advancedLocked();
  if (data === "locked") return vipJson({ error: "请先开通 StarJob VIP。" }, 403);
  if (data !== "reserved") return vipJson({ error: "请等待当前任务完成后再试。" }, 429);
  return {
    async finish(success: boolean) {
      const result = client === "web"
        ? await db.rpc("finish_my_starjob_vip_use", { p_id: reservationId, p_success: success })
        : await db.rpc("finish_starjob_vip_use", { p_user_id: userId, p_id: reservationId, p_success: success });
      return !result.error && result.data === true;
    },
  };
}

function quotaExceeded(task: VipUsageKind | "standard") {
  if (task === "flash" || task === "standard") return vipJson({ error: "基础润色的小时或周额度已用完。小时额度滚动恢复，周额度在北京时间周一零点恢复。" }, 429);
  return vipJson({
    error: task === "compose"
      ? "整份生成额度已用完，请查看每日与每周恢复时间。"
      : "高级优化共享额度已用完，请查看小时与每周恢复时间。",
  }, 429);
}

export function advancedLocked() {
  return vipJson({ error: "高级模型将与正式付费版一起发布。限时免费会员可使用基础模型。" }, 403);
}
