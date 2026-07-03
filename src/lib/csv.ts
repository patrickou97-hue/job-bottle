import { parse } from "papaparse";
import { splitToTags, isValidHttpUrl } from "@/lib/utils";
import type { CsvImportPreviewRow } from "@/lib/types";

type RawCsvRow = Record<string, string | undefined>;

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

export function parseJobsCsv(file: File) {
  return new Promise<CsvImportPreviewRow[]>((resolve, reject) => {
    parse<RawCsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete(result) {
        const rows = result.data.map((row, index) => {
          const company = pick(row, headerAliases.company_name);
          const applyUrl = pick(row, headerAliases.apply_url);
          const notes = [
            pick(row, ["备注"]),
            pick(row, ["备注1"]),
            pick(row, ["备注2"]),
          ]
            .filter(Boolean)
            .join("；");
          const preview: CsvImportPreviewRow = {
            rowNumber: index + 2,
            company_name: company,
            start_date: pick(row, headerAliases.start_date) || null,
            industry: pick(row, headerAliases.industry) || null,
            batch_type: pick(row, headerAliases.batch_type) || null,
            job_titles: pick(row, headerAliases.job_titles) || null,
            locations: pick(row, headerAliases.locations) || null,
            apply_url: applyUrl,
            notes: notes || null,
            tags: splitToTags(
              pick(row, headerAliases.industry),
              pick(row, headerAliases.batch_type),
              pick(row, headerAliases.locations),
              pick(row, headerAliases.job_titles),
            ),
            isValid: true,
            errors: [],
          };

          if (!preview.company_name) preview.errors.push("缺少公司名称");
          if (!preview.apply_url) preview.errors.push("缺少投递链接");
          if (preview.apply_url && !isValidHttpUrl(preview.apply_url)) {
            preview.errors.push("投递链接格式不正确");
          }
          preview.isValid = preview.errors.length === 0;
          return preview;
        });

        resolve(rows);
      },
      error(error) {
        reject(error);
      },
    });
  });
}
