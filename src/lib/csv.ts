import { parse } from "papaparse";
import { readSheet, type Row } from "read-excel-file/browser";
import { normalizeJobCategories } from "@/lib/categories";
import { sanitizeApplicationUrl } from "@/lib/application-url";
import { getJobMergeFingerprint } from "@/lib/job-dedupe";
import { splitToTags, isValidHttpUrl } from "@/lib/utils";
import type { CsvImportPreviewRow } from "@/lib/types";

type RawCsvRow = Record<string, string | undefined>;
type RawImportRow = Record<string, string | undefined>;
type NumberedRawRow = {
  rowNumber: number;
  row: RawImportRow;
};

const headerAliases = {
  company_name: ["公司名称"],
  start_date: ["开启时间"],
  industry: ["所在行业"],
  batch_type: ["类型", "批次类型"],
  job_titles: ["招聘岗位"],
  locations: ["工作地点", "工作地点（超过8个城市标注为全国"],
  apply_url: ["投递链接"],
  notes: ["备注", "备注1", "备注2"],
};

function pick(row: RawCsvRow, aliases: string[]) {
  for (const alias of aliases) {
    const value = row[alias]?.trim();
    if (value) return value;
  }
  return "";
}

export async function parseJobsImportFile(file: File) {
  if (isExcelFile(file)) {
    return parseJobsExcel(file);
  }
  return parseJobsCsv(file);
}

export function parseJobsCsv(file: File) {
  return new Promise<CsvImportPreviewRow[]>((resolve, reject) => {
    parse<RawCsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete(result) {
        resolve(
          normalizeImportRows(
            result.data.map((row, index) => ({
              rowNumber: index + 2,
              row,
            })),
          ),
        );
      },
      error(error) {
        reject(error);
      },
    });
  });
}

async function parseJobsExcel(file: File) {
  const rows: Row[] = await readSheet(file);
  if (rows.length <= 1) return [];

  const headers = rows[0].map((cell) => stringifyCell(cell).trim());
  const numberedRows: NumberedRawRow[] = rows.slice(1).map((cells, index) => {
    const row: RawImportRow = {};
    headers.forEach((header, cellIndex) => {
      if (!header) return;
      row[header] = stringifyCell(cells[cellIndex]);
    });
    return {
      rowNumber: index + 2,
      row,
    };
  });

  return normalizeImportRows(numberedRows);
}

function normalizeImportRows(rows: NumberedRawRow[]) {
  const seen = new Map<string, number>();

  return rows.map(({ row, rowNumber }) => {
    const company = pick(row, headerAliases.company_name);
    const applyUrl = sanitizeApplicationUrl(pick(row, headerAliases.apply_url));
    const industry = pick(row, headerAliases.industry);
    const batchType = pick(row, headerAliases.batch_type);
    const locations = pick(row, headerAliases.locations);
    const notes = [
      pick(row, ["备注"]),
      pick(row, ["备注1"]),
      pick(row, ["备注2"]),
    ]
      .filter(Boolean)
      .join("；");
    const jobTitles = pick(row, headerAliases.job_titles) || null;
    const normalizedCategories = normalizeJobCategories(jobTitles);
    const preview: CsvImportPreviewRow = {
      rowNumber,
      company_name: company,
      start_date: pick(row, headerAliases.start_date) || null,
      industry: industry || null,
      batch_type: batchType || null,
      job_titles: jobTitles,
      job_categories: normalizedCategories.categories,
      locations: locations || null,
      apply_url: applyUrl,
      notes: notes || null,
      tags: splitToTags(industry, batchType, locations, jobTitles ?? ""),
      isValid: true,
      errors: [],
    };

    if (!preview.company_name) preview.errors.push("缺少公司名称");
    if (!preview.apply_url) preview.errors.push("缺少投递链接");
    if (preview.apply_url && !isValidHttpUrl(preview.apply_url)) {
      preview.errors.push("投递链接格式不正确");
    }
    const fingerprint = getJobMergeFingerprint(preview);
    const duplicateOf = seen.get(fingerprint);
    if (duplicateOf) {
      preview.duplicateOfRowNumber = duplicateOf;
      preview.errors.push(`与第 ${duplicateOf} 行岗位信息重复`);
    } else {
      seen.set(fingerprint, rowNumber);
    }
    preview.isValid = preview.errors.length === 0;
    return preview;
  });
}

export function getJobImportFingerprint(row: {
  apply_url: string;
  batch_type: string | null;
  company_name: string;
  industry: string | null;
  is_active?: boolean;
  job_categories?: string[];
  job_titles: string | null;
  locations: string | null;
  notes: string | null;
  start_date: string | null;
  tags?: string[];
}) {
  return [
    row.company_name,
    row.start_date,
    row.industry,
    row.batch_type,
    row.job_titles,
    normalizeList(row.job_categories),
    row.locations,
    normalizeUrl(row.apply_url),
    row.notes,
    normalizeList(row.tags),
    row.is_active === false ? "inactive" : "active",
  ]
    .map((value) => normalizeFingerprintValue(value))
    .join("||");
}

function normalizeList(value: string[] | undefined) {
  return [...(value ?? [])].map((item) => item.trim()).filter(Boolean).sort().join("、");
}

function normalizeUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function normalizeFingerprintValue(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function isExcelFile(file: File) {
  const name = file.name.toLowerCase();
  return name.endsWith(".xlsx") || name.endsWith(".xls");
}

function stringifyCell(cell: unknown) {
  if (cell === null || cell === undefined) return "";
  if (cell instanceof Date) return cell.toISOString().slice(0, 10);
  return String(cell);
}
