import { NextResponse } from "next/server";
import { deriveTencentReferralCodes } from "@/lib/referral-source.mjs";
import { buildExternalReferralRows } from "@/lib/referral-external-sources";
import {
  SOURCE_DOCUMENT_ID,
  SOURCE_TAB_ID,
  SOURCE_VIEW_ID,
  build27AutumnJobCandidates,
  collectSmartSheetModel,
} from "../../../../../scripts/lib/job-sync-utils.mjs";
import { fetchLiveSmartSheet } from "../../../../../scripts/sync_27_autumn_jobs.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_TTL_MS = 3 * 60 * 60 * 1000;
const SOURCE_URL = `https://docs.qq.com/smartsheet/${SOURCE_DOCUMENT_ID}?tab=${SOURCE_TAB_ID}&viewId=${SOURCE_VIEW_ID}`;
type SourceReferralRow = ReturnType<typeof deriveTencentReferralCodes>[number] | ReturnType<typeof buildExternalReferralRows>[number];
let cache: { expiresAt: number; rows: SourceReferralRow[] } | null = null;

export async function GET(request: Request) {
  const companyName = new URL(request.url).searchParams.get("company")?.trim() || "";
  const now = Date.now();
  if (!cache || cache.expiresAt <= now) {
    try {
      const source = await fetchLiveSmartSheet(SOURCE_URL);
      const parsed = build27AutumnJobCandidates(collectSmartSheetModel(source.operationGroups));
      if (parsed.wrongSeasonRows.length > 0) throw new Error("wrong-season");
      if (parsed.candidates.length === 0) throw new Error("empty-source");
      const fetchedAt = new Date().toISOString();
      const sourceJobs = parsed.candidates.map(({ payload }) => ({
        ...payload,
        created_at: fetchedAt,
        updated_at: fetchedAt,
      }));
      const tencentRows = deriveTencentReferralCodes(sourceJobs).map((row) => ({ ...row, job_id: null }));
      const activeCompanies = new Set(sourceJobs.map((job) => job.company_name));
      const externalRows = buildExternalReferralRows(activeCompanies, fetchedAt);
      const rows = dedupeRows([...tencentRows, ...externalRows]);
      cache = { expiresAt: now + CACHE_TTL_MS, rows };
    } catch {
      return NextResponse.json(
        { error: "腾讯文档来源暂时无法核验，已停止读取来源内推码。" },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
  }

  const rows = companyName
    ? cache.rows.filter((row) => row.company_name === companyName)
    : cache.rows;
  return NextResponse.json(
    { rows },
    { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" } },
  );
}

function dedupeRows<T extends { company_name: string; code: string; source_urls?: string[] }>(rows: T[]) {
  const seen = new Map<string, T>();
  for (const row of rows) {
    const key = `${row.company_name.toLocaleLowerCase("zh-CN")}\u0000${row.code.toLocaleLowerCase("en-US")}`;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, row);
      continue;
    }
    if (row.source_urls?.length && existing.source_urls) {
      seen.set(key, { ...existing, source_urls: [...new Set([...existing.source_urls, ...row.source_urls])] });
    }
  }
  return [...seen.values()];
}
