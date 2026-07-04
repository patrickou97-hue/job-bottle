import type { SupabaseClient } from "@supabase/supabase-js";
import { getDeadlineTime } from "@/lib/dates";
import { splitToTags } from "@/lib/utils";
import type { Database, Job, JobFilters, JobFormValues } from "@/lib/types";

const DEFAULT_JOBS_TIMEOUT_MS = 7000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

export async function fetchActiveJobs(supabase: SupabaseClient<Database>) {
  const query = supabase
    .from("jobs")
    .select("*")
    .eq("is_active", true)
    .order("updated_at", { ascending: false });
  const { data, error } = await withTimeout(
    Promise.resolve(query),
    DEFAULT_JOBS_TIMEOUT_MS,
    "读取岗位数据库超时。",
  );

  if (error) throw error;
  return (data ?? []) as Job[];
}

export async function fetchJobById(supabase: SupabaseClient<Database>, id: string) {
  const query = supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();
  const { data, error } = await withTimeout(
    Promise.resolve(query),
    DEFAULT_JOBS_TIMEOUT_MS,
    "读取岗位详情超时。",
  );

  if (error) throw error;
  return (data ?? null) as Job | null;
}

export async function fetchRelatedJobs(
  supabase: SupabaseClient<Database>,
  job: Job,
) {
  const [sameCompanyResult, sameIndustryResult] = await Promise.all([
    withTimeout(
      Promise.resolve(
        supabase
          .from("jobs")
          .select("*")
          .eq("is_active", true)
          .eq("company_name", job.company_name)
          .neq("id", job.id)
          .order("updated_at", { ascending: false })
          .limit(5),
      ),
      DEFAULT_JOBS_TIMEOUT_MS,
      "读取同公司岗位超时。",
    ),
    job.industry
      ? withTimeout(
          Promise.resolve(
            supabase
              .from("jobs")
              .select("*")
              .eq("is_active", true)
              .neq("id", job.id)
              .ilike("industry", `%${job.industry.split(",")[0].trim()}%`)
              .order("updated_at", { ascending: false })
              .limit(5),
          ),
          DEFAULT_JOBS_TIMEOUT_MS,
          "读取相近岗位超时。",
        )
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (sameCompanyResult.error) throw sameCompanyResult.error;
  if (sameIndustryResult.error) throw sameIndustryResult.error;

  return {
    sameCompany: (sameCompanyResult.data ?? []) as Job[],
    sameIndustry: (sameIndustryResult.data ?? []) as Job[],
  };
}

export async function fetchAllJobsForAdmin(supabase: SupabaseClient<Database>) {
  const query = supabase
    .from("jobs")
    .select("*")
    .order("updated_at", { ascending: false });
  const { data, error } = await withTimeout(
    Promise.resolve(query),
    DEFAULT_JOBS_TIMEOUT_MS,
    "读取岗位数据库超时。",
  );

  if (error) throw error;
  return (data ?? []) as Job[];
}

export function filterJobs(jobs: Job[], filters: JobFilters) {
  const keyword = filters.keyword.trim().toLowerCase();
  const filtered = jobs.filter((job) => {
    const keywordMatched =
      !keyword ||
      job.company_name.toLowerCase().includes(keyword) ||
      (job.job_titles ?? "").toLowerCase().includes(keyword);
    const industryMatched =
      !filters.industry ||
      (job.industry ?? "").split(",").map((v) => v.trim()).includes(filters.industry);
    const batchMatched =
      !filters.batchType || job.batch_type === filters.batchType;
    const locationMatched =
      !filters.location || (job.locations ?? "").includes(filters.location);
    const tagsMatched =
      filters.tags.length === 0 ||
      filters.tags.some((tag) => job.tags?.includes(tag));

    return (
      keywordMatched &&
      industryMatched &&
      batchMatched &&
      locationMatched &&
      tagsMatched
    );
  });

  return sortJobs(filtered, filters.sortBy);
}

function sortJobs(jobs: Job[], sortBy: JobFilters["sortBy"]) {
  const sorted = [...jobs];
  if (sortBy === "company_asc") {
    return sorted.sort((a, b) => a.company_name.localeCompare(b.company_name, "zh-CN"));
  }
  if (sortBy === "deadline_asc") {
    return sorted.sort((a, b) => {
      const aTime = getDeadlineTime(a);
      const bTime = getDeadlineTime(b);
      if (aTime !== bTime) return aTime - bTime;
      return a.company_name.localeCompare(b.company_name, "zh-CN");
    });
  }
  if (sortBy === "start_date_asc") {
    return sorted.sort((a, b) => {
      const aTime = parseLooseDate(a.start_date);
      const bTime = parseLooseDate(b.start_date);
      if (aTime !== bTime) return aTime - bTime;
      return a.company_name.localeCompare(b.company_name, "zh-CN");
    });
  }
  return sorted.sort((a, b) => {
    const aTime = new Date(a.updated_at).getTime();
    const bTime = new Date(b.updated_at).getTime();
    return bTime - aTime;
  });
}

function parseLooseDate(value: string | null) {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const normalized = value.replace(/[年月.]/g, "-").replace(/日/g, "").trim();
  const time = new Date(normalized).getTime();
  if (!Number.isNaN(time)) return time;
  const match = normalized.match(/(\d{4})[-/](\d{1,2})(?:[-/](\d{1,2}))?/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3] ?? 1)).getTime();
}

export function getJobFacetOptions(jobs: Job[]) {
  const industries = new Set<string>();
  const batchTypes = new Set<string>();
  const locations = new Set<string>();
  const tags = new Set<string>();

  jobs.forEach((job) => {
    if (job.industry) {
      job.industry.split(",").forEach((v) => {
        const trimmed = v.trim();
        if (trimmed) industries.add(trimmed);
      });
    }
    if (job.batch_type) batchTypes.add(job.batch_type);
    splitToTags(job.locations).forEach((location) => locations.add(location));
    job.tags?.forEach((tag) => tags.add(tag));
  });

  return {
    industries: Array.from(industries).sort(),
    batchTypes: Array.from(batchTypes).sort(),
    locations: Array.from(locations).sort(),
    tags: Array.from(tags).sort(),
  };
}

export function toJobPayload(values: JobFormValues) {
  return {
    company_name: values.company_name.trim(),
    start_date: values.start_date.trim() || null,
    industry: values.industry.trim() || null,
    batch_type: values.batch_type.trim() || null,
    job_titles: values.job_titles.trim() || null,
    locations: values.locations.trim() || null,
    apply_url: values.apply_url.trim(),
    notes: values.notes.trim() || null,
    logo_url: values.logo_url.trim() || null,
    tags: splitToTags(
      values.tags,
      values.industry,
      values.batch_type,
      values.locations,
      values.job_titles,
    ),
    is_active: values.is_active,
  };
}
