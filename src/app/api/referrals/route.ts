import { NextRequest, NextResponse } from "next/server";
import type { ReferralCodeInput } from "@/lib/referral-codes";
import {
  ReferralSubmissionError,
  submitReferralCode,
} from "@/lib/referral-submission";
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

  try {
    const result = await submitReferralCode(user.id, input, request.signal);
    return NextResponse.json(result, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof ReferralSubmissionError) {
      const headers = error.status === 429 ? { "Retry-After": "600" } : undefined;
      return NextResponse.json({ error: error.message }, { status: error.status, headers });
    }
    console.error("[referral_submission]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "内推码上传失败，请稍后重试。" }, { status: 503 });
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
