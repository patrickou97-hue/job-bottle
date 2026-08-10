import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { authenticateStarInterviewRequest } from "@/lib/star-interview-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  consumeStarInterviewUsage,
  starInterviewChargeHeaders,
  type StarInterviewChargeResult,
} from "@/lib/star-interview-billing";
import type { ProfileRole } from "@/lib/types";

const STAR_INTERVIEW_ACCESS_KEY = "star_interview_unlimited_access";

export type StarInterviewFeature = "asr" | "completion";
export type StarInterviewAccessMode = "unlimited" | "standard";

export type StarInterviewUsageAccess = {
  userId: string;
  sessionId: string;
  mode: StarInterviewAccessMode;
  usagePolicy: "unlimited" | "metered";
};

/**
 * Central access gate for every paid StarInterview capability.
 *
 * Standard accounts are deliberately allowed for now. The future usage ledger
 * only needs to replace `reserveStarInterviewUsage`; routes and macOS clients
 * can keep the same authenticated protocol.
 */
export async function requireStarInterviewUsageAccess(
  request: NextRequest,
  feature: StarInterviewFeature,
) {
  const session = await authenticateStarInterviewRequest(request);
  if (!session) {
    return {
      response: NextResponse.json(
        { error: "请先登录拾星并连接诘星后再使用此功能。" },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      ),
    };
  }

  const admin = createAdminClient();
  const [
    { data: auth, error: authError },
    { data: profile, error: profileError },
    { data: mutationGuard, error: mutationGuardError },
  ] = await Promise.all([
    admin.auth.admin.getUserById(session.sub),
    admin.from("profiles").select("role").eq("id", session.sub).maybeSingle(),
    admin
      .from("admin_user_mutation_guards")
      .select("reservation_token")
      .eq("target_user_id", session.sub)
      .maybeSingle(),
  ]);
  if (authError || profileError || mutationGuardError) {
    return {
      response: NextResponse.json(
        { error: "当前账户安全状态暂时无法确认，请稍后重试。" },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      ),
    };
  }
  if (!auth.user || isDisabled(auth.user)) {
    return {
      response: NextResponse.json(
        { error: "当前账户不可用，请重新登录拾星或联系管理员。" },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      ),
    };
  }
  if (mutationGuard) {
    return {
      response: NextResponse.json(
        {
          error: "当前账户存在未完成的安全操作，请联系主管理员恢复后再试。",
          code: "STAR_INTERVIEW_ACCOUNT_RECOVERY_REQUIRED",
          feature,
        },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      ),
    };
  }

  const mode = resolveStarInterviewAccessMode(
    auth.user,
    profile?.role ?? "user",
  );
  // Completion and ASR both perform durable atomic reservations after their
  // idempotency rows are inspected. Do not pre-reject on wallet balance here:
  // a zero-balance user must still be able to replay/re-run an already-paid key.
  return {
    access: {
      userId: session.sub,
      sessionId: session.sid,
      mode,
      usagePolicy: mode === "unlimited" ? "unlimited" : "metered",
    } satisfies StarInterviewUsageAccess,
  };
}

export async function chargeStarInterviewUsage(
  access: StarInterviewUsageAccess,
  input: { feature: StarInterviewFeature; meterKey: string; units: number },
): Promise<
  | { result: StarInterviewChargeResult }
  | { response: NextResponse }
> {
  const result = await consumeStarInterviewUsage({
    userId: access.userId,
    feature: input.feature,
    meterKey: input.meterKey,
    units: input.units,
    mode: access.mode,
  });
  if (result.allowed) return { result };
  return {
    response: NextResponse.json(
      {
        error: "诘星余额不足，请充值后继续。",
        code: "STAR_INTERVIEW_BALANCE_INSUFFICIENT",
        balanceFen: result.balanceFen,
        requiredFen: result.requiredFen,
        action: "OPEN_BILLING_IN_APP",
      },
      {
        status: 402,
        headers: {
          "Cache-Control": "no-store",
          ...starInterviewChargeHeaders(result),
        },
      },
    ),
  };
}

export function starInterviewUsageHeaders(access: StarInterviewUsageAccess) {
  return {
    "X-StarInterview-Access-Mode": access.mode,
    "X-StarInterview-Usage-Policy": access.usagePolicy,
  };
}

export function resolveStarInterviewAccessMode(
  user: Pick<User, "app_metadata">,
  role: ProfileRole,
): StarInterviewAccessMode {
  const explicitValue = user.app_metadata?.[STAR_INTERVIEW_ACCESS_KEY];
  if (typeof explicitValue === "boolean") {
    return explicitValue ? "unlimited" : "standard";
  }
  return role === "admin" ? "unlimited" : "standard";
}

function isDisabled(user: Pick<User, "banned_until">) {
  if (!user.banned_until) return false;
  return new Date(user.banned_until).getTime() > Date.now();
}
