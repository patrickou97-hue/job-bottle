import { NextResponse } from "next/server";
import { toMiniProgramJob } from "@/lib/miniprogram-api";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const DEFAULT_JOBS_PAGE_SIZE = 500;
const MAX_JOBS_PAGE_SIZE = 500;
const MIN_JOBS_PAGE_SIZE = 1;

type JobsCursor = { createdAt: string; id: string };

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const cursorValue = searchParams.get("cursor");
  const cursor = cursorValue ? decodeCursor(cursorValue) : null;
  const pageSizeValue = searchParams.get("limit");
  const pageSize = pageSizeValue === null
    ? DEFAULT_JOBS_PAGE_SIZE
    : parsePageSize(pageSizeValue);
  if (cursorValue && !cursor) {
    return NextResponse.json(
      { error: "岗位分页游标无效，请刷新后重试。", code: "INVALID_CURSOR" },
      { status: 400 },
    );
  }
  if (pageSize === null) {
    return NextResponse.json(
      { error: "岗位分页条数无效，请刷新后重试。", code: "INVALID_PAGE_SIZE" },
      { status: 400 },
    );
  }

  try {
    const admin = createAdminClient();
    let query = admin
      .from("jobs")
      .select("*", cursor ? {} : { count: "exact" })
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(pageSize + 1);
    if (cursor) {
      query = query.or(
        `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
      );
    }

    const { data, error, count } = await query;
    if (error) throw error;

    const page = data ?? [];
    const hasMore = page.length > pageSize;
    const jobs = page.slice(0, pageSize);
    const lastJob = jobs[jobs.length - 1];

    return NextResponse.json(
      {
        data: {
          jobs: jobs.map(toMiniProgramJob),
          nextCursor:
            hasMore && lastJob
              ? encodeCursor({ createdAt: lastJob.created_at, id: lastJob.id })
              : null,
          totalCount: cursor ? null : count,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "岗位暂时无法读取，请稍后重试。" },
      { status: 500 },
    );
  }
}

function parsePageSize(value: string): number | null {
  if (!/^\d+$/u.test(value)) return null;
  const pageSize = Number(value);
  return Number.isInteger(pageSize) &&
    pageSize >= MIN_JOBS_PAGE_SIZE &&
    pageSize <= MAX_JOBS_PAGE_SIZE
    ? pageSize
    : null;
}

function encodeCursor(cursor: JobsCursor) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeCursor(value: string): JobsCursor | null {
  if (value.length > 512 || !/^[A-Za-z0-9_-]+$/u.test(value)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as {
      createdAt?: unknown;
      id?: unknown;
    };
    if (
      typeof parsed.createdAt !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u.test(
        parsed.createdAt,
      ) ||
      !Number.isFinite(Date.parse(parsed.createdAt)) ||
      typeof parsed.id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(
        parsed.id,
      )
    ) {
      return null;
    }

    return { createdAt: parsed.createdAt, id: parsed.id };
  } catch {
    return null;
  }
}
