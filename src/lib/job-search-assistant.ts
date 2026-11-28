import { z } from "zod";
import type { JobFilters, JobDiscoveryScope } from "./types";

const term = z.string().trim().max(120);
const values = z.array(term).max(200);
const scopes = z.enum(["all", "recent", "recent_preference", "with_referral"]);
const views = z.enum(["all", "applied", "unapplied"]);
const filterFields = {
  keyword: term, location: term, industry: term, batchType: term,
  categories: z.array(term).max(20), tags: z.array(term).max(50),
  sortBy: z.enum(["start_date_desc", "updated_desc", "start_date_asc", "company_asc"]),
};
export const searchState = z.object({ ...filterFields, scope: scopes, view: views }).strict();
export type SearchState = JobFilters & { scope: JobDiscoveryScope; view: z.infer<typeof views> };
export const searchOptions = z.object({
  locations: z.array(term).max(1500), industries: values, batchTypes: values, categories: values, hasPreferences: z.boolean(),
}).strict();
export const searchQuestion = z.object({
  message: z.string().trim().min(1).max(500), current: searchState,
  options: searchOptions, companies: z.array(term).max(4).optional(), focusedCompany: term.optional(), clarification: z.string().max(800).optional(),
}).strict();

export const searchIntent = z.discriminatedUnion("action", [
  z.object({ action: z.literal("clarify"), question: z.string().trim().min(1).max(240) }).strict(),
  z.object({ action: z.literal("company"), name: term.min(1), topic: z.enum(["overview", "business", "roles", "locations", "requirements", "deadline", "salary"]) }).strict(),
  ...(["filter", "recommend"] as const).map(action => z.object({ action: z.literal(action), reset: z.boolean().optional(), changes: searchState.omit({ tags: true }).partial() }).strict()),
]);

export function resolveSearch(input: z.infer<typeof searchQuestion>, intent: z.infer<typeof searchIntent>) {
  if (intent.action === "clarify" || intent.action === "company") return intent;
  const next: SearchState = intent.reset ? {
    keyword: "", industry: "", batchType: "", location: "", categories: [], tags: [],
    sortBy: "start_date_desc", scope: "all", view: "all",
  } : { ...input.current };
  Object.assign(next, intent.changes);
  const allowed = input.options;
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
