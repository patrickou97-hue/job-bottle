import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { authenticateStarInterviewRequest } from "@/lib/star-interview-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProfileRole } from "@/lib/types";

const STAR_INTERVIEW_ACCESS_KEY = "star_interview_unlimited_access";

export type StarInterviewFeature = "asr" | "completion";
export type StarInterviewAccessMode = "unlimited" | "standard";

export type StarInterviewUsageAccess = {
  userId: string;
  sessionId: string;
  mode: StarInterviewAccessMode;
  usagePolicy: "unlimited" | "metered_not_enforced";
};

type UsageDecision =
  | { allowed: true; reservationId: string | null }
  | { allowed: false; status: 402 | 429; error: string; retryAfter?: number };

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
  const [{ data: auth, error: authError }, { data: profile, error: profileError }] = await Promise.all([
    admin.auth.admin.getUserById(session.sub),
    admin.from("profiles").select("role").eq("id", session.sub).maybeSingle(),
  ]);
  if (authError || profileError || !auth.user || isDisabled(auth.user)) {
    return {
      response: NextResponse.json(
        { error: "当前账户不可用，请重新登录拾星或联系管理员。" },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      ),
    };
  }

  const mode = resolveStarInterviewAccessMode(
    auth.user,
    profile?.role ?? "user",
  );
  const usage = await reserveStarInterviewUsage({
    userId: session.sub,
    feature,
    mode,
  });
  if (!usage.allowed) {
    const headers: Record<string, string> = { "Cache-Control": "no-store" };
    if (usage.retryAfter) headers["Retry-After"] = String(usage.retryAfter);
    return {
      response: NextResponse.json(
        { error: usage.error, code: "STAR_INTERVIEW_USAGE_LIMIT" },
        { status: usage.status, headers },
      ),
    };
  }

  return {
    access: {
      userId: session.sub,
      sessionId: session.sid,
      mode,
      usagePolicy: mode === "unlimited" ? "unlimited" : "metered_not_enforced",
    } satisfies StarInterviewUsageAccess,
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

async function reserveStarInterviewUsage(input: {
  userId: string;
  feature: StarInterviewFeature;
  mode: StarInterviewAccessMode;
}): Promise<UsageDecision> {
  if (input.mode === "unlimited") {
    return { allowed: true, reservationId: null };
  }

  // Billing integration seam:
  // atomically reserve one ASR-duration or completion-token unit here, then
  // return 402/429 when the user's purchased balance or rate quota is exhausted.
  // Until the usage ledger ships, authenticated standard users remain enabled.
  return { allowed: true, reservationId: null };
}

function isDisabled(user: Pick<User, "banned_until">) {
  if (!user.banned_until) return false;
  return new Date(user.banned_until).getTime() > Date.now();
}
