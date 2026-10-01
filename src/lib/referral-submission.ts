import {
  getReferralMimoConfiguration,
  reviewReferralCodeWithMimo,
  type ReferralReviewRecord,
} from "@/lib/referral-moderation";
import {
  normalizeReferralCode,
  validateReferralCodeInput,
  type ReferralCodeInput,
  type ReferralCodeListItem,
} from "@/lib/referral-codes";
import { createAdminClient } from "@/lib/supabase/admin";

export class ReferralSubmissionError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ReferralSubmissionError";
  }
}

export async function submitReferralCode(
  userId: string,
  input: ReferralCodeInput,
  signal: AbortSignal,
): Promise<{
  item: ReferralCodeListItem;
  reviewStatus: "approved" | "removed" | "error" | "queued";
}> {
  const validationError = validateReferralCodeInput(input);
  if (validationError) throw new ReferralSubmissionError(validationError, 400);

  const admin = createAdminClient();
  const { data: inserted, error: insertError } = await admin.rpc(
    "create_referral_code_for_review",
    {
      p_user_id: userId,
      p_company_name: input.companyName.trim(),
      p_job_id: input.jobId || null,
      p_applicable_roles: input.applicableRoles ?? "",
      p_code: normalizeReferralCode(input.code),
      p_usage_note: input.usageNote ?? "",
      p_expires_at: input.expiresAt || null,
    },
  );
  const item = inserted?.[0] as ReferralCodeListItem | undefined;
  if (insertError || !item) {
    if (insertError?.code === "23505") {
      throw new ReferralSubmissionError("这个公司的同一内推码已经上传过了。", 409);
    }
    if (insertError?.message?.includes("referral_upload_rate_limit")) {
      throw new ReferralSubmissionError("上传较频繁，请十分钟后再试。", 429);
    }
    if (insertError?.message?.includes("referral_company_not_found")) {
      throw new ReferralSubmissionError("请选择岗位库中有效的公司和岗位。", 400);
    }
    logReferralServerError("insert", insertError);
    throw new ReferralSubmissionError("内推码上传失败，请稍后重试。", 503);
  }

  const { data: claimed, error: claimError } = await admin.rpc(
    "claim_referral_code_for_review",
    { p_id: item.id },
  );
  if (claimError || !claimed?.[0]) {
    logReferralServerError("claim", claimError);
    return { item, reviewStatus: "queued" };
  }

  const result = await runSingleReview(claimed[0] as ReferralReviewRecord, signal);
  const { data: completed, error: completeError } = await admin.rpc(
    "complete_referral_code_review",
    {
      p_id: item.id,
      p_outcome: result.outcome,
      p_category: result.category,
      p_confidence: result.confidence,
      p_reason: result.reason,
    },
  );
  if (completeError || completed !== true) {
    logReferralServerError("complete", completeError);
    return { item, reviewStatus: "error" };
  }
  return {
    item,
    reviewStatus: result.outcome === "rejected" ? "removed" : result.outcome,
  };
}

async function runSingleReview(record: ReferralReviewRecord, signal: AbortSignal) {
  const configuration = getReferralMimoConfiguration();
  if (!configuration) {
    return {
      outcome: "error" as const,
      category: "configuration_error",
      confidence: null,
      reason: "智能审核配置不可用，已转人工复核",
    };
  }
  try {
    return await reviewReferralCodeWithMimo(record, configuration, signal);
  } catch (error) {
    logReferralServerError("mimo", error);
    return {
      outcome: "error" as const,
      category: "upstream_error",
      confidence: null,
      reason: "智能审核未完成，已转人工复核",
    };
  }
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
