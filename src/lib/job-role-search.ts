import { EXTERNAL_REFERRAL_SOURCES } from "./referral-external-sources";
import type { Job } from "./types";

import type { RoleSource } from "./job-search-assistant";

export type EvidenceItem = { source: RoleSource; term: string };
export type RoleJudgment = EvidenceItem & { level: "named" | "related" | "category" };
export type RoleSearch = { name: string; exact: string[]; related: string[]; judgments?: RoleJudgment[] };
type RoleField = EvidenceItem & { url?: string };
type RoleMatch = RoleField & { level: RoleJudgment["level"]; rank?: number };
type Posting = Pick<Job, "company_name" | "batch_type" | "job_titles" | "keywords" | "responsibilities" | "job_categories">;

const referralRoles = new Map<string, RoleField[]>();
for (const record of EXTERNAL_REFERRAL_SOURCES) {
  // A company can run several campaigns in one year. Only attach a posting to its stated batch.
  const year = /(?:20)?(\d{2})\s*届/u.exec(record.applicable_roles)?.[1];
  const phase = /提前批|正式批/u.exec(record.usage_note)?.[0];
  if (!year || !phase) continue;
  const role = record.applicable_roles.replace(record.company_name, "").replace(/^\s*(?:20)?\d{2}\s*届\s*(?:校招)?\s*/u, "").trim();
  const key = record.company_name + "|" + year + "秋招" + phase;
  const entries = referralRoles.get(key) ?? [];
  if (role && !entries.some(entry => entry.term === role)) entries.push({ term: role, source: "内推资料", url: record.source_url });
  referralRoles.set(key, entries);
}

const cachedFields = new WeakMap<Posting, RoleField[]>();
export function jobRoleFields(job: Posting) {
  const cached = cachedFields.get(job);
  if (cached) return cached;
  const fields: RoleField[] = [];
  for (const title of (job.job_titles || "").split(/[,，、;；\n]/u)) {
    const primary = title.replace(/[（(][^（）()]*[)）]/gu, "").trim();
    if (primary) fields.push({ term: primary, source: primary.endsWith("类") ? "岗位大类" : "招聘岗位" });
    for (const note of title.matchAll(/[（(]([^（）()]*)[)）]/gu)) {
      for (const term of note[1].replace(/^(?:包含|包括|含)/u, "").split(/[\s/、]+/u).filter(Boolean)) {
        fields.push({ term, source: "大类说明" });
      }
    }
  }
  fields.push(...(referralRoles.get(job.company_name.trim() + "|" + job.batch_type?.trim()) ?? []));
  for (const term of job.keywords ?? []) {
    if (term.trim()) fields.push({ term: term.trim(), source: "招聘关键词" });
  }
  for (const term of job.job_categories ?? []) {
    if (term && term !== "其他" && !fields.some(field => field.term === term)) fields.push({ term, source: "岗位大类" });
  }
  for (const line of (job.responsibilities || "").split(/[。；;\n]/u)) {
    const term = line.trim().slice(0, 260);
    if (term) fields.push({ term, source: "岗位职责" });
  }
  cachedFields.set(job, fields);
  return fields;
}

export const roleLevelOrder = { named: 0, related: 1, category: 2 };
export function matchJobRole(job: Posting, search: RoleSearch): RoleMatch | undefined {
  let best: RoleMatch | undefined;
  for (const field of jobRoleFields(job)) {
    if (search.judgments) {
      const index = search.judgments.findIndex(item => item.source === field.source && item.term === field.term);
      const judgment = search.judgments[index];
      const rank = (judgment?.level === "named" ? 0 : 32) + index;
      if (judgment && (!best || rank < (best.rank ?? Infinity))) {
        best = { ...field, level: judgment.level, rank };
      }
      continue;
    }
    const exact = search.exact.includes(field.term) || field.term.toLowerCase() === search.name.toLowerCase();
    if (!exact && !search.related.includes(field.term)) continue;
    const level = (field.source === "大类说明" || field.source === "岗位大类") ? "category" :
      exact && field.source !== "招聘关键词" ? "named" : "related";
    if (!best || roleLevelOrder[level] < roleLevelOrder[best.level]) best = { ...field, level };
    if (level === "named") break;
  }
  return best;
}
