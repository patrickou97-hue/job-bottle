import { createHash } from "node:crypto";

export const SOURCE_DOCUMENT_ID = "DY0VXc3BFTFJUbUhw";
export const SOURCE_TAB_ID = "t3r1vl";
export const SOURCE_VIEW_ID = "vdHovb";
export const SOURCE_SHEET_TITLE = "27秋招正式批+提前批";

const REQUIRED_FIELDS = {
  company_name: ["公司名称"],
  start_date: ["开启时间"],
  industry: ["所在行业"],
  batch_type: ["类型", "批次类型"],
  job_titles: ["招聘岗位"],
  locations: ["工作地点", "工作地点（超过8个城市标注为全国"],
  apply_url: ["投递链接"],
  notes_1: ["备注1"],
  notes_2: ["备注2"],
};

const JOB_CATEGORIES = new Set([
  "软件研发类",
  "硬件工程类",
  "产品类",
  "运营类",
  "市场类",
  "销售类",
  "生产制造类",
  "财务类",
  "人力类",
  "职能类",
  "设计类",
  "管培生",
  "教师类",
  "咨询类",
  "其他",
]);

const CATEGORY_ALIASES = new Map([
  ["软件研发", "软件研发类"],
  ["硬件工程", "硬件工程类"],
  ["产品", "产品类"],
  ["运营", "运营类"],
  ["市场", "市场类"],
  ["销售", "销售类"],
  ["生产制造", "生产制造类"],
  ["财务", "财务类"],
  ["人力", "人力类"],
  ["职能", "职能类"],
  ["设计", "设计类"],
  ["教师", "教师类"],
  ["咨询", "咨询类"],
]);

const SYNC_FIELDS = [
  "company_name",
  "start_date",
  "industry",
  "batch_type",
  "job_titles",
  "job_categories",
  "locations",
  "apply_url",
  "notes",
  "tags",
  "is_active",
];

export function collectSmartSheetModel(operationGroups) {
  let schema = null;
  const records = new Map();

  for (const operation of operationGroups.flat()) {
    if (operation?.t === 3005) {
      const operationSchema = operation?.c?.k3?.k3;
      if (operationSchema && typeof operationSchema === "object") schema = operationSchema;
    }
    if (operation?.t === 3028) {
      const operationRecords = operation?.c?.k2?.k1;
      if (!operationRecords || typeof operationRecords !== "object") continue;
      for (const [recordId, record] of Object.entries(operationRecords)) {
        records.set(recordId, record);
      }
    }
  }

  if (!schema) throw new Error("腾讯文档数据缺少字段定义，已停止同步");
  return { schema, records };
}

export function build27AutumnJobCandidates({ schema, records }) {
  const fields = resolveFields(schema);
  const candidates = [];
  const invalidRows = [];
  const wrongSeasonRows = [];
  let sourceRowNumber = 0;

  for (const [recordId, record] of records) {
    sourceRowNumber += 1;
    const values = record?.k1 ?? {};
    const row = Object.fromEntries(
      Object.entries(fields).map(([name, field]) => [name, readCellValue(field, values[field.id])]),
    );
    const hasBusinessData = [
      row.company_name,
      row.start_date,
      row.industry,
      row.batch_type,
      row.job_titles,
      row.locations,
      row.apply_url,
    ].some(Boolean);
    if (!hasBusinessData) continue;

    if (row.batch_type && !is27AutumnBatch(row.batch_type)) {
      wrongSeasonRows.push({ recordId, rowNumber: sourceRowNumber, batchType: row.batch_type });
      continue;
    }

    const errors = [];
    if (!row.company_name) errors.push("缺少公司名称");
    if (!row.apply_url) errors.push("缺少投递链接");
    if (!row.batch_type) errors.push("缺少批次类型");
    const applyUrl = sanitizeApplicationUrl(row.apply_url);
    if (applyUrl && !isValidHttpUrl(applyUrl)) errors.push("投递链接格式不正确");
    if (errors.length > 0) {
      invalidRows.push({
        recordId,
        rowNumber: sourceRowNumber,
        companyName: row.company_name || null,
        batchType: row.batch_type || null,
        errors,
      });
      continue;
    }

    const notes = [row.notes_1, row.notes_2].filter(Boolean).join("；") || null;
    const jobTitles = row.job_titles || null;
    const jobCategories = normalizeJobCategories(jobTitles);
    const payload = {
      id: deterministicSourceUuid(`${SOURCE_DOCUMENT_ID}:${SOURCE_TAB_ID}:${recordId}`),
      company_name: row.company_name,
      start_date: row.start_date || null,
      industry: row.industry || null,
      batch_type: row.batch_type,
      job_titles: jobTitles,
      job_categories: jobCategories,
      locations: row.locations || null,
      apply_url: applyUrl,
      notes,
      tags: splitToTags(row.industry, row.batch_type, row.locations, jobTitles),
      is_active: true,
    };
    candidates.push({ recordId, rowNumber: sourceRowNumber, payload });
  }

  return { candidates, invalidRows, wrongSeasonRows };
}

export function planJobChanges(candidates, existingJobs) {
  const existingById = new Map(existingJobs.map((job) => [job.id, job]));
  const existingByFingerprint = new Map();
  const existingByLegacyIdentity = new Map();
  for (const job of existingJobs) {
    const fingerprint = getJobMergeFingerprint(job);
    const ids = existingByFingerprint.get(fingerprint) ?? new Set();
    ids.add(job.id);
    existingByFingerprint.set(fingerprint, ids);
    for (const identity of getLegacyIdentityFingerprints(job)) {
      const identityIds = existingByLegacyIdentity.get(identity) ?? new Set();
      identityIds.add(job.id);
      existingByLegacyIdentity.set(identity, identityIds);
    }
  }

  const sourceFingerprints = new Set();
  const inserts = [];
  const updates = [];
  const identityConflicts = [];
  let sourceDuplicates = 0;
  let previousImports = 0;
  let unchanged = 0;

  for (const candidate of candidates) {
    const fingerprint = getJobMergeFingerprint(candidate.payload);
    if (sourceFingerprints.has(fingerprint)) {
      sourceDuplicates += 1;
      continue;
    }
    sourceFingerprints.add(fingerprint);

    const current = existingById.get(candidate.payload.id);
    if (current) {
      const changedFields = getCoreIdentityChanges(candidate.payload, current);
      if (changedFields.length > 0) {
        identityConflicts.push({
          recordId: candidate.recordId,
          rowNumber: candidate.rowNumber,
          jobId: candidate.payload.id,
          changedFields,
        });
        continue;
      }
    }
    const matchingExistingIds = existingByFingerprint.get(fingerprint) ?? new Set();
    const matchingOtherJob = Array.from(matchingExistingIds).some((id) => id !== candidate.payload.id);
    if (matchingOtherJob) {
      previousImports += 1;
      continue;
    }
    if (current) {
      if (areSyncFieldsEqual(candidate.payload, current)) unchanged += 1;
      else updates.push(candidate.payload);
      continue;
    }
    const matchesLegacyImport = getLegacyIdentityFingerprints(candidate.payload).some((identity) =>
      existingByLegacyIdentity.has(identity),
    );
    if (matchingExistingIds.size > 0 || matchesLegacyImport) {
      previousImports += 1;
      continue;
    }
    inserts.push(candidate.payload);
  }

  return { inserts, updates, identityConflicts, sourceDuplicates, previousImports, unchanged };
}

export function assertNoJobIdentityConflicts(plan) {
  if (!Array.isArray(plan?.identityConflicts) || plan.identityConflicts.length === 0) return;
  const sample = plan.identityConflicts
    .slice(0, 5)
    .map((conflict) => {
      const location = conflict.recordId
        ? `记录${conflict.recordId}`
        : `第${conflict.rowNumber ?? "?"}条`;
      return `${location}:${conflict.changedFields.join("/")}`;
    })
    .join("、");
  throw new Error(
    `检测到同一腾讯源记录核心身份变化（${sample}），共${plan.identityConflicts.length}条，本次零写入`,
  );
}

export function getJobMergeFingerprint(row) {
  return [
    normalizeFingerprintValue(row.company_name),
    normalizeUrl(row.apply_url),
    normalizeDelimitedValue(row.job_titles, false),
    normalizeDelimitedValue(row.locations, true),
    normalizeFingerprintValue(row.batch_type),
  ].join("||");
}

export function deterministicSourceUuid(value) {
  const bytes = Buffer.from(createHash("sha256").update(value).digest().subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function sanitizeApplicationUrl(value) {
  try {
    const decodedValue = value.replaceAll("&amp;", "&").replaceAll("&#38;", "&").trim();
    const url = new URL(decodedValue);
    if (url.protocol !== "http:" && url.protocol !== "https:") return value.trim();
    for (const key of Array.from(url.searchParams.keys())) {
      if (["click_id", "clickid", "cid"].includes(key.toLowerCase())) url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return value.trim();
  }
}

export function is27AutumnBatch(value) {
  return /^27秋招(?:\s|$|提前批|正式批)/.test(String(value ?? "").trim());
}

function resolveFields(schema) {
  const schemaEntries = Object.entries(schema);
  return Object.fromEntries(
    Object.entries(REQUIRED_FIELDS).map(([canonicalName, aliases]) => {
      const match = schemaEntries.find(([, field]) => aliases.includes(String(field?.k30 ?? "").trim()));
      if (!match) throw new Error(`腾讯文档缺少必要字段：${aliases[0]}，已停止同步`);
      const [id, definition] = match;
      const optionList = definition?.[`k${definition?.k31}`]?.k3;
      const options = new Map(
        (Array.isArray(optionList) ? optionList : []).map((option) => [option.k1, String(option.k2 ?? "").trim()]),
      );
      return [canonicalName, { id, definition, options }];
    }),
  );
}

function readCellValue(field, cell) {
  if (!cell || typeof cell !== "object") return "";
  if (Array.isArray(cell.k1)) {
    return cell.k1
      .map((part) => String(part?.k3 || part?.k2 || "").trim())
      .filter(Boolean)
      .join("");
  }
  const selected = cell[`k${field.definition?.k31}`] ?? cell.k9 ?? cell.k17;
  if (Array.isArray(selected)) {
    return selected
      .map((optionId) => field.options.get(optionId) ?? String(optionId ?? "").trim())
      .filter(Boolean)
      .join(",");
  }
  return "";
}

function normalizeJobCategories(value) {
  const normalized = [];
  for (const token of String(value ?? "")
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean)) {
    const withoutComment = token
      .replace(/（[^）]*）/g, "")
      .replace(/\([^)]*\)/g, "")
      .trim();
    if (!withoutComment) continue;
    const category = JOB_CATEGORIES.has(withoutComment)
      ? withoutComment
      : CATEGORY_ALIASES.get(withoutComment) ?? "其他";
    if (!normalized.includes(category)) normalized.push(category);
  }
  return normalized;
}

function splitToTags(...values) {
  const tokens = values
    .flatMap((value) =>
      String(value ?? "")
        .split(/[,，、/|｜\s]+/g)
        .map((item) => item.trim())
        .filter(Boolean),
    )
    .filter((item) => item.length <= 16);
  return Array.from(new Set(tokens)).slice(0, 18);
}

function areSyncFieldsEqual(left, right) {
  return SYNC_FIELDS.every((field) => normalizeComparable(left[field]) === normalizeComparable(right[field]));
}

function getCoreIdentityChanges(incoming, current) {
  const fields = [];
  if (normalizeFingerprintValue(incoming.company_name) !== normalizeFingerprintValue(current.company_name)) {
    fields.push("公司名称");
  }
  if (normalizeUrl(incoming.apply_url) !== normalizeUrl(current.apply_url)) {
    fields.push("投递链接");
  }
  if (normalizeFingerprintValue(incoming.batch_type) !== normalizeFingerprintValue(current.batch_type)) {
    fields.push("批次类型");
  }
  return fields;
}

function normalizeComparable(value) {
  if (Array.isArray(value)) return [...value].map(normalizeFingerprintValue).sort().join("|");
  if (typeof value === "boolean") return value ? "true" : "false";
  return normalizeFingerprintValue(value);
}

function normalizeUrl(value) {
  try {
    const url = new URL(sanitizeApplicationUrl(String(value ?? "")));
    url.searchParams.sort();
    return url.toString().replace(/\/+$/, "").toLowerCase();
  } catch {
    return sanitizeApplicationUrl(String(value ?? "")).replace(/\/+$/, "").toLowerCase();
  }
}

function normalizeFingerprintValue(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function normalizeDelimitedValue(value, splitWhitespace) {
  const separator = splitWhitespace ? /[,，、/|｜\s]+/g : /[,，、/|｜]+/g;
  return String(value ?? "")
    .split(separator)
    .map(normalizeFingerprintValue)
    .filter(Boolean)
    .sort()
    .join(",");
}

function getLegacyIdentityFingerprints(row) {
  const company = normalizeFingerprintValue(row.company_name);
  const batch = normalizeFingerprintValue(row.batch_type);
  const url = normalizeUrl(row.apply_url);
  const startDate = normalizeFingerprintValue(row.start_date);
  return [
    url ? `company-url:${company}||${url}||${batch}` : "",
    startDate ? `company-date:${company}||${startDate}||${batch}` : "",
  ].filter(Boolean);
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
