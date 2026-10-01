import { NextRequest, NextResponse } from "next/server";
import {
  validateReferralCodeInput,
  type ReferralCodeInput,
} from "@/lib/referral-codes";
import { authenticateMiniProgramRequest } from "@/lib/miniprogram-auth";
import {
  ReferralSubmissionError,
  submitReferralCode,
} from "@/lib/referral-submission";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PUBLIC_REFERRAL_COLUMNS =
  "id,company_name,job_id,applicable_roles,code,usage_note,expires_at,created_at,updated_at";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("mode");
  const admin = createAdminClient();

  if (mode === "companies") {
    const query = params.get("q")?.trim() ?? "";
    if (!query || query.length > 80) {
      return NextResponse.json({ error: "请输入 1–80 个字的公司关键词。" }, { status: 400 });
    }
    try {
      const pattern = `%${escapeLikePattern(query)}%`;
      const { data, error } = await admin
        .from("jobs")
        .select("company_name")
        .eq("is_active", true)
        .ilike("company_name", pattern)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const companies = [...new Set((data ?? []).map((item) => item.company_name))]
        .sort((left, right) => left.localeCompare(right, "zh-CN"))
        .slice(0, 20);
      return NextResponse.json({ data: { companies } }, { headers: noStore() });
    } catch {
      return NextResponse.json({ error: "公司列表暂时无法读取，请稍后重试。" }, { status: 503 });
    }
  }

  if (mode === "jobs") {
    const companyName = params.get("companyName")?.trim() ?? "";
    if (!companyName || companyName.length > 80) {
      return NextResponse.json({ error: "公司名称无效。" }, { status: 400 });
    }
    try {
      const { data, error } = await admin
        .from("jobs")
        .select("id,company_name,job_titles,job_categories")
        .eq("is_active", true)
        .eq("company_name", companyName)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return NextResponse.json(
        {
          data: {
            jobs: (data ?? []).map((job) => ({
              id: job.id,
              title: job.job_titles || job.job_categories?.join("、") || "岗位信息待补充",
            })),
          },
        },
        { headers: noStore() },
      );
    } catch {
      return NextResponse.json({ error: "公司岗位暂时无法读取，请稍后重试。" }, { status: 503 });
    }
  }

  try {
    const { data, error } = await admin
      .from("referral_codes")
      .select(PUBLIC_REFERRAL_COLUMNS)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1000);
    if (error) throw error;

    const sourceRows = await getPublicSourceRows(request);
    const communityRows = data ?? [];
    const knownCodes = new Set(
      communityRows.map((item) => referralKey(item.company_name, item.code)),
    );
    const uniqueSourceRows = sourceRows.filter((item) => {
      const key = referralKey(item.company_name, item.code);
      if (knownCodes.has(key)) return false;
      knownCodes.add(key);
      return true;
    });

    return NextResponse.json(
      { data: { items: [...uniqueSourceRows, ...communityRows] } },
      { headers: noStore() },
    );
  } catch {
    return NextResponse.json(
      { error: "内推码广场暂时无法读取，请稍后重试。" },
      { status: 503, headers: noStore() },
    );
  }
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > 8_000) {
    return NextResponse.json({ error: "提交内容过长，请精简后重试。" }, { status: 413 });
  }

  const identity = authenticateMiniProgramRequest(request);
  if (!identity) return unauthorized();

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "提交内容无效。" }, { status: 400 });

  if (body.action === "report") {
    return reportReferralCode(identity.sub, body);
  }

  if (body.action !== "create") {
    return NextResponse.json({ error: "操作类型无效。" }, { status: 400 });
  }

  const input = parseReferralInput(body);
  if (!input) return NextResponse.json({ error: "请检查内推码信息。" }, { status: 400 });
  const validationError = validateReferralCodeInput(input);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  try {
    const result = await submitReferralCode(identity.sub, input, request.signal);
    return NextResponse.json(result, {
      status: 201,
      headers: noStore(),
    });
  } catch (error) {
    if (error instanceof ReferralSubmissionError) {
      const headers = error.status === 429 ? { "Retry-After": "600" } : noStore();
      return NextResponse.json({ error: error.message }, { status: error.status, headers });
    }
    console.error("[miniprogram_referral_submission]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "内推码上传失败，请稍后重试。" }, { status: 503 });
  }
}

async function reportReferralCode(userId: string, body: Record<string, unknown>) {
  const referralCodeId = typeof body.referralCodeId === "string" ? body.referralCodeId : "";
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!isUuid(referralCodeId)) {
    return NextResponse.json({ error: "这条内推码无法举报。" }, { status: 400 });
  }
  if (reason.length < 2 || reason.length > 300) {
    return NextResponse.json({ error: "请填写 2–300 字的举报原因。" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { data: item, error: itemError } = await admin
      .from("referral_codes")
      .select("id")
      .eq("id", referralCodeId)
      .eq("is_active", true)
      .maybeSingle();
    if (itemError) throw itemError;
    if (!item) return NextResponse.json({ error: "内推码已下架或不存在。" }, { status: 404 });

    const { error } = await admin.from("referral_code_reports").insert({
      referral_code_id: referralCodeId,
      reporter_id: userId,
      reason,
    });
    if (error?.code === "23505") {
      return NextResponse.json({ error: "你已经举报过这条内推码了。" }, { status: 409 });
    }
    if (error) throw error;
    return NextResponse.json({ data: { submitted: true } }, { headers: noStore() });
  } catch {
    return NextResponse.json({ error: "举报未提交，请稍后重试。" }, { status: 503 });
  }
}

async function getPublicSourceRows(request: NextRequest) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6_000);
  try {
    const sourceUrl = new URL("/api/referrals/source", request.url);
    const response = await fetch(sourceUrl, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) return [];
    const payload = await response.json().catch(() => null) as { rows?: unknown } | null;
    return Array.isArray(payload?.rows)
      ? payload.rows.filter(isPublicSourceRow)
      : [];
  } catch {
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

function isPublicSourceRow(value: unknown): value is Record<string, unknown> & {
  company_name: string;
  code: string;
} {
  return Boolean(
    value &&
    typeof value === "object" &&
    "company_name" in value &&
    typeof value.company_name === "string" &&
    "code" in value &&
    typeof value.code === "string",
  );
}

function parseReferralInput(body: Record<string, unknown>): ReferralCodeInput | null {
  if (typeof body.companyName !== "string" || typeof body.code !== "string") return null;
  return {
    companyName: body.companyName,
    jobId: typeof body.jobId === "string" ? body.jobId : null,
    applicableRoles: typeof body.applicableRoles === "string" ? body.applicableRoles : "",
    code: body.code,
    usageNote: typeof body.usageNote === "string" ? body.usageNote : "",
    expiresAt: typeof body.expiresAt === "string" ? body.expiresAt : "",
  };
}

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/gu, "\\$&");
}

function referralKey(companyName: string, code: string) {
  return `${companyName.toLocaleLowerCase("zh-CN")}\u0000${code.toLocaleLowerCase("en-US")}`;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(value);
}

function unauthorized() {
  return NextResponse.json({ error: "登录状态已失效，请重新登录。" }, { status: 401 });
}

function noStore() {
  return { "Cache-Control": "private, no-store" };
}
