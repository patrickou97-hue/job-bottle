import { inflateSync } from "node:zlib";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  SOURCE_DOCUMENT_ID,
  SOURCE_TAB_ID,
  SOURCE_VIEW_ID,
  assertNoJobIdentityConflicts,
  build27AutumnJobCandidates,
  collectSmartSheetModel,
  planJobChanges,
} from "./lib/job-sync-utils.mjs";

const SOURCE_URL =
  process.env.TENCENT_27_AUTUMN_DOC_URL ??
  `https://docs.qq.com/smartsheet/${SOURCE_DOCUMENT_ID}?tab=${SOURCE_TAB_ID}&viewId=${SOURCE_VIEW_ID}`;
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";
const SOURCE_CHUNK_ROWS = 1000;
const MAX_SOURCE_ROWS = 10000;
const DATABASE_PAGE_SIZE = 1000;
const UPSERT_BATCH_SIZE = 100;
const APPLY_CHANGES = process.argv.includes("--apply");

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}

export { fetchLiveSmartSheet };

async function main() {
  validateSourceUrl(SOURCE_URL);
  const source = await fetchLiveSmartSheet(SOURCE_URL);
  const model = collectSmartSheetModel(source.operationGroups);
  const parsed = build27AutumnJobCandidates(model);

  if (parsed.wrongSeasonRows.length > 0) {
    const sample = parsed.wrongSeasonRows
      .slice(0, 5)
      .map((row) => `第${row.rowNumber}条“${row.batchType}”`)
      .join("、");
    throw new Error(`检测到非27秋招数据（${sample}），本次零写入`);
  }
  if (parsed.candidates.length === 0) {
    throw new Error("27秋招有效岗位为0条，疑似源格式变化，本次零写入");
  }

  const supabase = createSyncClient();
  const existingJobs = await fetchExistingJobs(supabase);
  const plan = planJobChanges(parsed.candidates, existingJobs);
  assertNoJobIdentityConflicts(plan);
  const pending = [...plan.inserts, ...plan.updates];

  if (APPLY_CHANGES) {
    for (let index = 0; index < pending.length; index += UPSERT_BATCH_SIZE) {
      const batch = pending.slice(index, index + UPSERT_BATCH_SIZE);
      const { error } = await supabase.from("jobs").upsert(batch, { onConflict: "id" });
      if (error) throw error;
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: APPLY_CHANGES ? "apply" : "dry-run",
        source: {
          documentId: SOURCE_DOCUMENT_ID,
          tabId: SOURCE_TAB_ID,
          viewId: SOURCE_VIEW_ID,
          maxRows: source.maxRows,
          sourceRecords: model.records.size,
          valid27Jobs: parsed.candidates.length,
          invalidRows: parsed.invalidRows.length,
          invalidRowSample: parsed.invalidRows.slice(0, 5),
          wrongSeasonRows: parsed.wrongSeasonRows.length,
        },
        database: {
          existingJobs: existingJobs.length,
          inserts: plan.inserts.length,
          updates: plan.updates.length,
          unchanged: plan.unchanged,
          skippedPreviousImports: plan.previousImports,
          skippedSourceDuplicates: plan.sourceDuplicates,
          written: APPLY_CHANGES ? pending.length : 0,
          pendingSample: pending.slice(0, 10).map((job) => ({
            companyName: job.company_name,
            startDate: job.start_date,
            batchType: job.batch_type,
          })),
        },
      },
      null,
      2,
    ),
  );
}

async function fetchLiveSmartSheet(sourceUrl) {
  const cookies = new Map();
  const pageResponse = await fetch(sourceUrl, {
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": USER_AGENT,
    },
    redirect: "follow",
  });
  if (!pageResponse.ok) throw new Error(`腾讯文档页面读取失败：HTTP ${pageResponse.status}`);
  captureCookies(pageResponse.headers, cookies);
  const html = await pageResponse.text();
  const opendocUrl = extractOpendocUrl(html, sourceUrl);
  validateOpendocUrl(opendocUrl);

  const operationGroups = [];
  let maxRows = null;
  for (let startRow = 0; maxRows === null || startRow < maxRows; startRow += SOURCE_CHUNK_ROWS) {
    const chunkUrl = new URL(opendocUrl);
    chunkUrl.searchParams.set("startrow", String(startRow));
    chunkUrl.searchParams.set("endrow", String(startRow + SOURCE_CHUNK_ROWS - 1));
    chunkUrl.searchParams.set("t", String(Date.now()));
    const payload = await fetchOpendocChunk(chunkUrl, sourceUrl, cookies);
    const textEntries = payload?.clientVars?.collab_client_vars?.initialAttributedText?.text;
    if (!Array.isArray(textEntries) || textEntries.length === 0) {
      throw new Error("腾讯文档返回空数据，已停止同步");
    }

    const chunkMaxRows = Math.max(...textEntries.map((entry) => Number(entry.max_row ?? 0)));
    if (!Number.isFinite(chunkMaxRows) || chunkMaxRows < 1 || chunkMaxRows > MAX_SOURCE_ROWS) {
      throw new Error(`腾讯文档行数异常：${chunkMaxRows}`);
    }
    maxRows = chunkMaxRows;
    for (const entry of textEntries) {
      const compressed = Buffer.from(String(entry.smartsheet ?? ""), "base64");
      if (compressed.length === 0) throw new Error("腾讯文档数据块为空，已停止同步");
      const operations = JSON.parse(inflateSync(compressed).toString("utf8"));
      if (!Array.isArray(operations)) throw new Error("腾讯文档数据块格式异常，已停止同步");
      operationGroups.push(...operations);
    }
  }

  return { maxRows, operationGroups };
}

async function fetchOpendocChunk(url, referer, cookies) {
  const response = await fetch(url, {
    headers: {
      accept: "*/*",
      cookie: serializeCookies(cookies),
      referer,
      "user-agent": USER_AGENT,
    },
  });
  captureCookies(response.headers, cookies);
  if (!response.ok) throw new Error(`腾讯文档数据读取失败：HTTP ${response.status}`);
  const body = await response.text();
  const prefix = "clientVarsCallback(";
  if (!body.startsWith(prefix) || !body.trimEnd().endsWith(")")) {
    throw new Error("腾讯文档数据响应格式异常，已停止同步");
  }
  return JSON.parse(body.slice(prefix.length, body.lastIndexOf(")")));
}

function extractOpendocUrl(html, sourceUrl) {
  const match = html.match(/src="(\/\/docs\.qq\.com\/dop-api\/opendoc[^\"]+)"/);
  if (!match) throw new Error("腾讯文档匿名数据入口未找到，已停止同步");
  const decoded = match[1].replaceAll("&amp;", "&");
  return new URL(decoded, sourceUrl);
}

function validateSourceUrl(value) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "docs.qq.com" ||
    url.pathname !== `/smartsheet/${SOURCE_DOCUMENT_ID}` ||
    url.searchParams.get("tab") !== SOURCE_TAB_ID ||
    url.searchParams.get("viewId") !== SOURCE_VIEW_ID
  ) {
    throw new Error("腾讯文档来源地址与锁定的27秋招视图不一致");
  }
}

function validateOpendocUrl(url) {
  if (
    url.protocol !== "https:" ||
    url.hostname !== "docs.qq.com" ||
    url.pathname !== "/dop-api/opendoc" ||
    url.searchParams.get("id") !== SOURCE_DOCUMENT_ID ||
    url.searchParams.get("tab") !== SOURCE_TAB_ID ||
    url.searchParams.get("viewId") !== SOURCE_VIEW_ID
  ) {
    throw new Error("腾讯文档数据入口与锁定的27秋招视图不一致");
  }
}

function captureCookies(headers, cookies) {
  const values = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [];
  for (const value of values) {
    const pair = value.split(";", 1)[0];
    const separator = pair.indexOf("=");
    if (separator <= 0) continue;
    cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
}

function serializeCookies(cookies) {
  return Array.from(cookies, ([name, value]) => `${name}=${value}`).join("; ");
}

function createSyncClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function fetchExistingJobs(supabase) {
  const rows = [];
  for (let from = 0; ; from += DATABASE_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("jobs")
      .select(
        "id,company_name,start_date,industry,batch_type,job_titles,job_categories,locations,apply_url,notes,tags,is_active",
      )
      .order("id", { ascending: true })
      .range(from, from + DATABASE_PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < DATABASE_PAGE_SIZE) return rows;
  }
}
