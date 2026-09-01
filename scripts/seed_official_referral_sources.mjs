import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { buildOfficialReferralSourceRows } from "../src/lib/referral-external-sources.ts";
import {
  SOURCE_DOCUMENT_ID,
  SOURCE_TAB_ID,
  SOURCE_VIEW_ID,
  build27AutumnJobCandidates,
  collectSmartSheetModel,
} from "./lib/job-sync-utils.mjs";
import { fetchLiveSmartSheet } from "./sync_27_autumn_jobs.mjs";

const APPLY_CHANGES = process.argv.includes("--apply");
const SOURCE_URL = `https://docs.qq.com/smartsheet/${SOURCE_DOCUMENT_ID}?tab=${SOURCE_TAB_ID}&viewId=${SOURCE_VIEW_ID}`;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}

async function main() {
  const source = await fetchLiveSmartSheet(SOURCE_URL);
  const model = collectSmartSheetModel(source.operationGroups);
  const parsed = build27AutumnJobCandidates(model);
  if (parsed.wrongSeasonRows.length > 0) throw new Error("检测到非27秋招数据，本次零写入");
  if (parsed.candidates.length === 0) throw new Error("27秋招有效岗位为0条，本次零写入");

  const verifiedAt = new Date().toISOString();
  const activeCompanies = new Set(parsed.candidates.map(({ payload }) => payload.company_name));
  const desired = buildOfficialReferralSourceRows(activeCompanies, verifiedAt);
  if (desired.length === 0) throw new Error("没有可与实时27秋招岗位匹配的官方来源码，本次零写入");
  for (const row of desired) validateSourceRow(row);

  const supabase = createSeedClient();
  const existing = await fetchExistingSources(supabase);
  const existingByKey = new Map(existing.map((row) => [row.source_key, row]));
  const inserts = desired.filter((row) => !existingByKey.has(row.source_key));
  const updates = desired.filter((row) => {
    const current = existingByKey.get(row.source_key);
    return current && hasSourceChanged(current, row);
  });

  if (APPLY_CHANGES && (inserts.length > 0 || updates.length > 0)) {
    const payload = desired.map(({ created_at: _createdAt, ...row }) => row);
    const { error } = await supabase
      .from("official_referral_sources")
      .upsert(payload, { onConflict: "source_key" });
    if (error) throw error;
  }

  console.log(JSON.stringify({
    mode: APPLY_CHANGES ? "apply" : "dry-run",
    source: {
      documentId: SOURCE_DOCUMENT_ID,
      tabId: SOURCE_TAB_ID,
      viewId: SOURCE_VIEW_ID,
      sourceRecords: model.records.size,
      valid27Jobs: parsed.candidates.length,
      invalidRows: parsed.invalidRows.length,
      wrongSeasonRows: parsed.wrongSeasonRows.length,
    },
    officialSources: {
      desired: desired.length,
      existing: existing.length,
      inserts: inserts.length,
      updates: updates.length,
      unchanged: desired.length - inserts.length - updates.length,
      written: APPLY_CHANGES ? inserts.length + updates.length : 0,
      publisherName: "拾星小助手整理",
    },
  }, null, 2));
}

function createSeedClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function fetchExistingSources(supabase) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("official_referral_sources")
      .select("source_key,publisher_name,company_name,job_id,applicable_roles,code,usage_note,source_platform,source_url,published_at,source_verified_at,is_active,created_at,updated_at")
      .order("source_key", { ascending: true })
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) return rows;
  }
}

function hasSourceChanged(current, desired) {
  return [
    "publisher_name", "company_name", "job_id", "applicable_roles", "code", "usage_note",
    "source_platform", "source_url", "published_at", "is_active",
  ].some((key) => (current[key] ?? null) !== (desired[key] ?? null));
}

function validateSourceRow(row) {
  if (row.publisher_name !== "拾星小助手整理") throw new Error(`来源发布者异常：${row.source_key}`);
  if (!/^(小红书|牛客|力扣)$/.test(row.source_platform)) throw new Error(`来源平台异常：${row.source_key}`);
  if (!/^https:\/\//.test(row.source_url)) throw new Error(`来源链接异常：${row.source_key}`);
  if (!/^[A-Za-z0-9_-]{2,64}={0,2}$/.test(row.code)) throw new Error(`内推码格式异常：${row.source_key}`);
  if (!/^starjob-official:.{16,}$/.test(row.source_key)) throw new Error(`来源键异常：${row.source_key}`);
  if (!/(27|2027)/.test(`${row.applicable_roles} ${row.usage_note}`)) throw new Error(`来源批次异常：${row.source_key}`);
  const digest = createHash("sha256").update(row.source_key).digest("hex");
  if (digest.length !== 64) throw new Error("来源键校验失败");
}
