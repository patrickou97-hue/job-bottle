import { z } from "zod";
import type { JobFilters, JobDiscoveryScope } from "./types";

export const roleSources = ["招聘岗位", "内推资料", "招聘关键词", "大类说明", "岗位大类", "岗位职责"] as const;
export type RoleSource = typeof roleSources[number];
const evidenceItem = z.object({ source: z.enum(roleSources), term: z.string().min(1).max(260) });
const verdict = z.object({ level: z.enum(["named", "related", "category"]) });
const evidenceIds = z.array(z.number().int().nonnegative()).max(32);
const term = z.string().trim().max(120);
const values = z.array(term).max(200);
const scopes = z.enum(["all", "recent", "recent_preference", "with_referral"]);
const views = z.enum(["all", "applied", "unapplied"]);
const roleTerms = z.array(z.string().trim().min(1).max(80)).max(16);
const role = z.object({ name: term.min(1), exact: roleTerms, related: roleTerms, judgments: z.array(evidenceItem.extend(verdict.shape)).max(32).optional() }).strict();
const filterFields = {
  role: role.nullable().optional(),
  employerGroup: z.enum(["global500_tech", ""]).optional(),
  keyword: term, location: term, industry: term, batchType: term,
  categories: z.array(term).max(20), tags: z.array(term).max(50),
  sortBy: z.enum(["start_date_desc", "updated_desc", "start_date_asc", "company_asc"]),
};
export const searchState = z.object({ ...filterFields, scope: scopes, view: views }).strict();
export type SearchState = JobFilters & { scope: JobDiscoveryScope; view: z.infer<typeof views> };
export const searchOptions = z.object({
  roleEvidence: z.array(evidenceItem).max(1600).optional(),
  roleTerms: z.array(z.string().min(1).max(80)).max(1200).optional(),
  locations: z.array(term).max(1500), industries: values, batchTypes: values, categories: values, hasPreferences: z.boolean(),
}).strict();
export const searchQuestion = z.object({
  message: z.string().trim().min(1).max(500), current: searchState,
  options: searchOptions, companies: z.array(term).max(4).optional(), focusedCompany: term.optional(), clarification: z.string().max(800).optional(),
}).strict();

export const searchIntent = z.discriminatedUnion("action", [
  z.object({ action: z.literal("clarify"), question: z.string().trim().min(1).max(240) }).strict(),
  z.object({ action: z.literal("company"), name: term.min(1), searchNames: z.array(term.min(2)).max(3).optional(), background: z.string().trim().max(500).optional(), topic: z.enum(["overview", "business", "roles", "locations", "requirements", "deadline", "salary"]) }).strict(),
  ...(["filter", "recommend"] as const).map(action => z.object({ action: z.literal(action), reset: z.boolean().optional(), changes: searchState.omit({ tags: true, role: true }).partial().extend({
    role: z.object({ name: term.min(1), exact: roleTerms.default([]), related: roleTerms.default([]), decisions: evidenceIds.optional(), direct: evidenceIds.optional() }).strict().nullable().optional(),
  }) }).strict()),
]);

// Fast path only for an entire unambiguous request. Extra conditions stay with the intent parser.
export function directRankedProductIntent(message: string) {
  const text = message.replace(/\s+/gu, "").replace(/^(?:(?:请|帮我|给我|我想要?|想要|推荐|找|看|一些|几个|一下|有没有|有哪些))+/u, "");
  if (!/^(?:2026年?)?(?:财富)?(?:世界|全球)(?:五百|500)强(?:的)?科技(?:公司|企业)?(?:的)?产品(?:类)?岗(?:位)?[？?。！!]*$/u.test(text)) return;
  return { action: "recommend" as const, changes: { employerGroup: "global500_tech" as const, categories: ["产品类"], role: null } };
}

export function resolveSearch(input: z.infer<typeof searchQuestion>, intent: z.infer<typeof searchIntent>) {
  if (intent.action === "clarify" || intent.action === "company") return intent;
  const next: SearchState = intent.reset ? {
    keyword: "", industry: "", batchType: "", location: "", categories: [], tags: [],
    sortBy: "start_date_desc", scope: "all", view: "all",
  } : { ...input.current };
  const { role: requestedRole, ...changes } = intent.changes;
  Object.assign(next, changes);
  if (requestedRole === null) next.role = null;
  if (requestedRole) {
    const { name, exact, related } = requestedRole;
    next.role = { name, exact, related };
    if (input.options.roleEvidence?.length && requestedRole.decisions) {
      const selected = new Set<number>();
      next.role.judgments = requestedRole.decisions.flatMap(id => {
        const entry = input.options.roleEvidence?.[id];
        if (!entry || selected.has(id)) return [];
        selected.add(id);
        const level = entry.source === "岗位大类" || entry.source === "大类说明" ? "category" :
          requestedRole.direct?.includes(id) && (entry.source === "内推资料" || entry.source === "招聘岗位") ? "named" : "related";
        return [{ ...entry, level }];
      });
    }
  }
  if (/(?:世界|全球)\s*(?:500|五百)\s*强/iu.test(input.message) && /科技/u.test(input.message) &&
      next.employerGroup !== "global500_tech") {
    return { action: "clarify" as const, question: "要按 2026 年《财富》世界500强中已核实的科技公司筛选吗？" };
  }
  const allowed = input.options;
  if (next.role) {
    const vocabulary = new Set(allowed.roleTerms);
    const exact = next.role.exact.filter(word => vocabulary.has(word));
    const related = next.role.related.filter(word => vocabulary.has(word) && !exact.includes(word));
    next.role = { ...next.role, exact, related };
    if (next.keyword && next.keyword === next.role.name) next.keyword = "";
  }
  if ((next.location && !allowed.locations.includes(next.location)) ||
      (next.industry && !allowed.industries.includes(next.industry)) ||
      (next.batchType && !allowed.batchTypes.includes(next.batchType)) ||
      next.categories.some(category => !allowed.categories.includes(category))) {
    return { action: "clarify" as const, question: "岗位库还没有这项筛选条件。想换个地点、岗位关键词或招聘批次吗？" };
  }
  if (next.scope === "recent_preference" && !allowed.hasPreferences) {
    return { action: "clarify" as const, question: "你还没有填写求职偏好。想在哪个城市找什么岗位？" };
  }
  return { action: intent.action, state: next };
}
