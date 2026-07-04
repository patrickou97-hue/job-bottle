export const JOB_CATEGORIES = [
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
] as const;

export type JobCategory = (typeof JOB_CATEGORIES)[number];

export type NormalizedJobCategories = {
  categories: JobCategory[];
  unknownValues: string[];
};

const CATEGORY_SET = new Set<string>(JOB_CATEGORIES);

const CATEGORY_ALIASES: Record<string, JobCategory> = {
  软件研发: "软件研发类",
  硬件工程: "硬件工程类",
  产品: "产品类",
  运营: "运营类",
  市场: "市场类",
  销售: "销售类",
  生产制造: "生产制造类",
  财务: "财务类",
  人力: "人力类",
  职能: "职能类",
  设计: "设计类",
  教师: "教师类",
  咨询: "咨询类",
};

export function normalizeJobCategories(value?: string | null): NormalizedJobCategories {
  const categories: JobCategory[] = [];
  const unknownValues: string[] = [];
  const tokens = splitCategoryText(value);

  tokens.forEach((token) => {
    const normalized = normalizeCategoryToken(token);
    if (!normalized) return;
    if (!categories.includes(normalized)) categories.push(normalized);
    if (normalized === "其他" && !CATEGORY_SET.has(token) && !CATEGORY_ALIASES[token]) {
      unknownValues.push(token);
    }
  });

  return { categories, unknownValues };
}

export function jobMatchesSelectedCategories(
  jobCategories: readonly string[] | null | undefined,
  selectedCategories: readonly string[],
) {
  if (selectedCategories.length === 0) return true;
  return selectedCategories.some((category) => jobCategories?.includes(category));
}

export function serializeJobCategories(categories: readonly string[]) {
  return categories.join(",");
}

export function parseJobCategoriesParam(value?: string | null) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => JOB_CATEGORIES.includes(item as JobCategory));
}

function splitCategoryText(value?: string | null) {
  return (value ?? "")
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeCategoryToken(value: string): JobCategory | null {
  const withoutComment = value
    .replace(/（[^）]*）/g, "")
    .replace(/\([^)]*\)/g, "")
    .trim();
  if (!withoutComment) return null;
  if (CATEGORY_SET.has(withoutComment)) return withoutComment as JobCategory;
  if (CATEGORY_ALIASES[withoutComment]) return CATEGORY_ALIASES[withoutComment];
  return "其他";
}
