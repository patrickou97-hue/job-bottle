import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/types";
import type { AdminFeedbackPlatform, AdminFeedbackStatus } from "@/lib/admin-feedback";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const RECENT_DAYS = 7;

type FeedbackRow = Database["public"]["Tables"]["feedback_submissions"]["Row"];

export async function GET(request: NextRequest) {
  const access = await requireAdminAccess();
  if ("response" in access) return access.response;

  const params = request.nextUrl.searchParams;
  const pageSize = parseBoundedInteger(params.get("pageSize"), DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
  const requestedPage = parseBoundedInteger(params.get("page"), 1, 1, Number.MAX_SAFE_INTEGER);
  const status = parseStatus(params.get("status"));
  const platform = parsePlatform(params.get("platform"));
  const query = normalizeQuery(params.get("query"));

  try {
    const admin = createAdminClient();
    const [listResult, metrics] = await Promise.all([
      listFeedback(admin, { page: requestedPage, pageSize, query, status, platform }),
      readMetrics(admin),
    ]);
    const totalFiltered = listResult.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
    const page = Math.min(requestedPage, totalPages);

    if (page !== requestedPage) {
      const corrected = await listFeedback(admin, { page, pageSize, query, status, platform });
      return NextResponse.json({
        feedback: corrected.rows.map(toAdminFeedbackItem),
        page,
        pageSize,
        totalFiltered,
        totalPages,
        metrics,
      }, { headers: { "Cache-Control": "private, no-store" } });
    }

    return NextResponse.json({
      feedback: listResult.rows.map(toAdminFeedbackItem),
      page,
      pageSize,
      totalFiltered,
      totalPages,
      metrics,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[admin_feedback]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "反馈记录暂时无法读取，请稍后重试。" }, { status: 500 });
  }
}

async function listFeedback(
  admin: ReturnType<typeof createAdminClient>,
  input: { page: number; pageSize: number; query: string; status: AdminFeedbackStatus; platform: AdminFeedbackPlatform },
) {
  let builder = admin
    .from("feedback_submissions")
    .select("id,user_id,platform,category,content,contact_email,created_at,resolved_at", { count: "exact" });
  if (input.status === "open") builder = builder.is("resolved_at", null);
  if (input.status === "resolved") builder = builder.not("resolved_at", "is", null);
  if (input.platform !== "all") builder = builder.eq("platform", input.platform);
  if (input.query) {
    const pattern = `%${escapeIlike(input.query)}%`;
    builder = builder.or(`content.ilike.${pattern},category.ilike.${pattern},contact_email.ilike.${pattern}`);
  }
  const from = (input.page - 1) * input.pageSize;
  const { data, count, error } = await builder
    .order("created_at", { ascending: false })
    .range(from, from + input.pageSize - 1);
  if (error) throw error;
  return { rows: (data ?? []) as FeedbackRow[], count };
}

async function readMetrics(admin: ReturnType<typeof createAdminClient>) {
  const recentStart = new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const [total, open, resolved, recent] = await Promise.all([
    admin.from("feedback_submissions").select("id", { count: "exact", head: true }),
    admin.from("feedback_submissions").select("id", { count: "exact", head: true }).is("resolved_at", null),
    admin.from("feedback_submissions").select("id", { count: "exact", head: true }).not("resolved_at", "is", null),
    admin.from("feedback_submissions").select("id", { count: "exact", head: true }).gte("created_at", recentStart),
  ]);
  for (const result of [total, open, resolved, recent]) {
    if (result.error) throw result.error;
  }
  return {
    total: total.count ?? 0,
    open: open.count ?? 0,
    resolved: resolved.count ?? 0,
    recent: recent.count ?? 0,
  };
}

function toAdminFeedbackItem(row: FeedbackRow) {
  return {
    id: row.id,
    userId: row.user_id,
    platform: row.platform,
    category: row.category,
    content: row.content,
    contactEmail: row.contact_email,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}

function parseStatus(value: string | null): AdminFeedbackStatus {
  return value === "open" || value === "resolved" ? value : "all";
}

function parsePlatform(value: string | null): AdminFeedbackPlatform {
  return value === "web" || value === "miniprogram" ? value : "all";
}

function parseBoundedInteger(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function normalizeQuery(value: string | null) {
  return typeof value === "string" ? value.trim().slice(0, 80) : "";
}

function escapeIlike(value: string) {
  return value.replace(/[\\%_(),]/g, "\\$&");
}
