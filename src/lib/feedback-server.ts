import "server-only";

import { createHmac } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const FEEDBACK_TYPES = [
  "数据错误",
  "简历导出",
  "投递流程",
  "视觉体验",
  "其他建议",
] as const;

export async function createFeedback(input: {
  platform: "web" | "miniprogram";
  userId: string | null;
  category: unknown;
  content: unknown;
  contactEmail?: unknown;
  fingerprint: string;
}) {
  const category = FEEDBACK_TYPES.includes(
    input.category as (typeof FEEDBACK_TYPES)[number],
  )
    ? input.category as (typeof FEEDBACK_TYPES)[number]
    : null;
  const content =
    typeof input.content === "string" ? input.content.trim().slice(0, 5000) : "";
  const contactEmail =
    typeof input.contactEmail === "string"
      ? input.contactEmail.trim().slice(0, 160)
      : "";
  if (!category || content.length < 5) {
    return { ok: false as const, status: 400, error: "请填写至少 5 个字的反馈内容。" };
  }

  const fingerprintHash = createHmac(
    "sha256",
    requireFeedbackSecret(),
  ).update(input.fingerprint).digest("hex");
  const admin = createAdminClient();
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await admin
    .from("feedback_submissions")
    .select("id", { count: "exact", head: true })
    .eq("fingerprint_hash", fingerprintHash)
    .gte("created_at", since);
  if (countError) throw countError;
  if ((count ?? 0) >= 5) {
    return { ok: false as const, status: 429, error: "反馈提交较频繁，请稍后再试。" };
  }
  const { data, error } = await admin
    .from("feedback_submissions")
    .insert({
      user_id: input.userId,
      platform: input.platform,
      category,
      content,
      contact_email: contactEmail || null,
      fingerprint_hash: fingerprintHash,
    })
    .select("id")
    .single();
  if (error) throw error;
  return { ok: true as const, id: data.id };
}

function requireFeedbackSecret() {
  const secret =
    process.env.MINIPROGRAM_SESSION_SECRET ||
    process.env.WECHAT_WEB_LOGIN_HMAC_SECRET;
  if (!secret) throw new Error("Feedback secret is not configured.");
  return secret;
}
