import { NextResponse } from "next/server";
import { deriveTencentReferralCodes } from "@/lib/referral-source.mjs";
import { buildExternalReferralRows } from "@/lib/referral-external-sources";
import { createAdminClient } from "@/lib/supabase/admin";
import type { OfficialReferralSource } from "@/lib/types";
import { unstable_cache } from "next/cache";
import { createPublicServerClient } from "@/lib/supabase/public-server";

export const runtime = "nodejs";

// The synchronized job library is the source of active 27-autumn companies.
// Never crawl the full Tencent sheet on a user's page-opening request.
const readSources = unstable_cache(async () => {
  const signal = AbortSignal.timeout(4500);
  const [sourceJobs, officialRows] = await Promise.all([
    fetchSourceJobs(signal),
    fetchOfficialReferralSources(signal),
  ]);
  const activeCompanies = new Set(sourceJobs.map((job) => job.company_name));
  const tencentRows = deriveTencentReferralCodes(sourceJobs).map((row) => ({ ...row, job_id: null }));
  const persisted = officialRows.filter((row) => activeCompanies.has(row.company_name));
  const externalRows = persisted.length > 0
    ? persisted.map(toExternalReferralRow)
    : buildExternalReferralRows(activeCompanies);
  return dedupeRows([...tencentRows, ...externalRows]);
}, ["public-referral-sources-v2"], { revalidate: 300 });

// Coalesce concurrent cold requests as well as using Next's persistent cache.
let pending: ReturnType<typeof readSources> | null = null;

export async function GET(request: Request) {
  const companyName = new URL(request.url).searchParams.get("company")?.trim() || "";
  try {
    pending ??= readSources().finally(() => { pending = null; });
    const allRows = await pending;
    const rows = companyName ? allRows.filter((row) => row.company_name === companyName) : allRows;
    return NextResponse.json({ rows }, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=300" },
    });
  } catch {
    return NextResponse.json({ error: "公开来源暂时无法读取，请稍后重试。" }, {
      status: 503, headers: { "Cache-Control": "no-store" },
    });
  }
}

async function fetchSourceJobs(signal: AbortSignal) {
  const client = createPublicServerClient();
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client.from("jobs")
      .select("id,company_name,batch_type,job_titles,apply_url,created_at,updated_at")
      .eq("is_active", true).like("batch_type", "27秋招%")
      .order("id").range(from, from + 999).abortSignal(signal);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) return rows;
  }
}

async function fetchOfficialReferralSources(signal: AbortSignal): Promise<OfficialReferralSource[]> {
  try {
    const admin = createAdminClient();
    const rows: OfficialReferralSource[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await admin.from("official_referral_sources")
        .select("id,publisher_name,company_name,job_id,applicable_roles,code,usage_note,source_platform,source_url,published_at,source_verified_at,is_active,created_at,updated_at,source_key")
        .eq("is_active", true).order("source_verified_at", { ascending: false })
        .order("id").range(from, from + 999).abortSignal(signal);
      if (error) return [];
      rows.push(...(data ?? []) as OfficialReferralSource[]);
      if ((data?.length ?? 0) < 1000) return rows;
    }
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
