import { NextRequest, NextResponse } from "next/server";
import {
  getReferralMimoConfiguration,
  reviewReferralCodeWithMimo,
  type ReferralReviewRecord,
  type ReferralReviewResult,
} from "@/lib/referral-moderation";
import { normalizeReferralCode, validateReferralCodeInput, type ReferralCodeInput } from "@/lib/referral-codes";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 8_000) {
    return NextResponse.json({ error: "内推码内容过长，请精简后重试。" }, { status: 413 });
  }

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "请先登录，再上传内推码。" }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as Partial<ReferralCodeInput> | null;
  const input = parseInput(body);
  if (!input) return NextResponse.json({ error: "请检查内推码信息。" }, { status: 400 });
  const validationError = validateReferralCodeInput(input);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const admin = createAdminClient();
  const companyName = input.companyName.trim();
  const jobId = input.jobId || null;
  const { data: inserted, error: insertError } = await admin.rpc("create_referral_code_for_review", {
    p_user_id: user.id,
    p_company_name: companyName,
    p_job_id: jobId,
    p_applicable_roles: input.applicableRoles ?? "",
    p_code: normalizeReferralCode(input.code),
    p_usage_note: input.usageNote ?? "",
    p_expires_at: input.expiresAt || null,
  });
  const item = inserted?.[0];
  if (insertError || !item) {
    if (insertError?.code === "23505") {
      return NextResponse.json({ error: "这个公司的同一内推码已经上传过了。" }, { status: 409 });
    }
    if (insertError?.message?.includes("referral_upload_rate_limit")) {
      return NextResponse.json({ error: "上传较频繁，请十分钟后再试。" }, { status: 429, headers: { "Retry-After": "600" } });
    }
    if (insertError?.message?.includes("referral_company_not_found")) {
      return NextResponse.json({ error: "请选择岗位库中有效的公司和岗位。" }, { status: 400 });
    }
    logReferralServerError("insert", insertError);
    return NextResponse.json({ error: "内推码上传失败，请稍后重试。" }, { status: 503 });
  }

  // The row is public before the single MiMo call begins. The claim records the
  // attempt first, so neither this route nor the scheduled sweeper can call the
  // model twice for the same code.
  const { data: claimed, error: claimError } = await admin.rpc("claim_referral_code_for_review", { p_id: item.id });
  if (claimError || !claimed?.[0]) {
    logReferralServerError("claim", claimError);
    return jsonCreated(item, "queued");
  }

  const result = await runSingleReview(claimed[0] as ReferralReviewRecord, request.signal);
  const { data: completed, error: completeError } = await admin.rpc("complete_referral_code_review", {
    p_id: item.id,
    p_outcome: result.outcome,
    p_category: result.category,
    p_confidence: result.confidence,
    p_reason: result.reason,
  });
  if (completeError || completed !== true) {
    logReferralServerError("complete", completeError);
    return jsonCreated(item, "error");
  }
  return jsonCreated(item, result.outcome === "rejected" ? "removed" : result.outcome);
}

async function runSingleReview(record: ReferralReviewRecord, signal: AbortSignal): Promise<ReferralReviewResult> {
  const configuration = getReferralMimoConfiguration();
  if (!configuration) {
    return { outcome: "error", category: "configuration_error", confidence: null, reason: "智能审核配置不可用，已转人工复核" };
  }
  try {
    return await reviewReferralCodeWithMimo(record, configuration, signal);
  } catch (error) {
    logReferralServerError("mimo", error);
    return { outcome: "error", category: "upstream_error", confidence: null, reason: "智能审核未完成，已转人工复核" };
  }
}

function parseInput(value: Partial<ReferralCodeInput> | null): ReferralCodeInput | null {
  if (!value || typeof value.companyName !== "string" || typeof value.code !== "string") return null;
  return {
    companyName: value.companyName,
    jobId: typeof value.jobId === "string" ? value.jobId : null,
    applicableRoles: typeof value.applicableRoles === "string" ? value.applicableRoles : "",
    code: value.code,
    usageNote: typeof value.usageNote === "string" ? value.usageNote : "",
    expiresAt: typeof value.expiresAt === "string" ? value.expiresAt : "",
  };
}

function jsonCreated(item: unknown, reviewStatus: "approved" | "removed" | "error" | "queued") {
  return NextResponse.json(
    { item, reviewStatus },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}

function logReferralServerError(scope: string, error: unknown) {
  const details = error && typeof error === "object"
    ? {
        code: "code" in error ? String(error.code) : undefined,
        name: "name" in error ? String(error.name) : undefined,
        status: "status" in error ? Number(error.status) : undefined,
      }
    : {};
  console.error(`[referral_${scope}]`, details);
}
