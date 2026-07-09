import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Job } from "@/lib/types";

export type DuplicateJobGroup = {
  fingerprint: string;
  jobs: Job[];
};

export type MergeDuplicateJobsResult = {
  groups_merged: number;
  jobs_removed: number;
  applications_moved: number;
  applications_removed: number;
};

type JobFingerprintInput = {
  company_name: string;
  apply_url: string;
  job_titles: string | null;
  locations: string | null;
  batch_type: string | null;
};

export function getJobMergeFingerprint(row: JobFingerprintInput) {
  return [
    row.company_name,
    normalizeUrl(row.apply_url),
    row.job_titles,
    row.locations,
    row.batch_type,
  ]
    .map((value) => normalizeFingerprintValue(value))
    .join("||");
}

export function findDuplicateJobGroups(jobs: Job[]) {
  const groups = new Map<string, Job[]>();

  jobs.forEach((job) => {
    const fingerprint = getJobMergeFingerprint(job);
    const current = groups.get(fingerprint) ?? [];
    current.push(job);
    groups.set(fingerprint, current);
  });

  return Array.from(groups.entries())
    .filter(([, group]) => group.length > 1)
    .map(([fingerprint, group]) => ({
      fingerprint,
      jobs: [...group].sort((a, b) => {
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }),
    }));
}

export async function mergeDuplicateJobs(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase.rpc("merge_duplicate_jobs");
  if (error) throw error;

  return (data?.[0] ?? {
    groups_merged: 0,
    jobs_removed: 0,
    applications_moved: 0,
    applications_removed: 0,
  }) as MergeDuplicateJobsResult;
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
