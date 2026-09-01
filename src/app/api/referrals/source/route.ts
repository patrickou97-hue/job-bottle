import { NextResponse } from "next/server";
import { deriveTencentReferralCodes } from "@/lib/referral-source.mjs";
import { buildExternalReferralRows } from "@/lib/referral-external-sources";
import { createAdminClient } from "@/lib/supabase/admin";
import type { OfficialReferralSource } from "@/lib/types";
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
      const persistedOfficialRows = await fetchOfficialReferralSources(activeCompanies);
      const externalRows = persistedOfficialRows.length > 0
        ? persistedOfficialRows.map((row) => toExternalReferralRow(row))
        : buildExternalReferralRows(activeCompanies, fetchedAt);
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

async function fetchOfficialReferralSources(activeCompanies: Set<string>): Promise<OfficialReferralSource[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("official_referral_sources")
      .select("id,publisher_name,company_name,job_id,applicable_roles,code,usage_note,source_platform,source_url,published_at,source_verified_at,is_active,created_at,updated_at,source_key")
      .eq("is_active", true)
      .order("source_verified_at", { ascending: false });
    if (error || !data) return [];
    return (data as OfficialReferralSource[]).filter((row) => activeCompanies.has(row.company_name));
  } catch {
    return [];
  }
}

function toExternalReferralRow(record: OfficialReferralSource) {
  return {
    id: `external-referral-${record.source_key}`,
    publisher_name: record.publisher_name,
    company_name: record.company_name,
    job_id: record.job_id,
    applicable_roles: record.applicable_roles,
    code: record.code,
    usage_note: record.usage_note ?? "使用前请在官方投递页确认有效性。",
    expires_at: null,
    created_at: record.created_at,
    updated_at: record.updated_at,
    source_type: "public_post" as const,
    source_job_ids: [] as string[],
    source_urls: [record.source_url],
    source_platform: record.source_platform,
    source_url: record.source_url,
    published_at: record.published_at,
    source_verified_at: record.source_verified_at,
  };
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
