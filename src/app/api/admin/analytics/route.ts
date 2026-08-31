import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { APPLICATION_STATUS_LABELS } from "@/lib/constants";
import { getAccountType } from "@/lib/account-identity";
import { requireAdminAccess } from "@/lib/admin-access";
import type { AdminAnalyticsRange, AdminAnalyticsResponse } from "@/lib/admin-analytics";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApplicationStatus, AnalyticsEvent, Database, Job, Profile, ReferralCode, ResumeRow, UserApplication, WechatIdentity } from "@/lib/types";

export const maxDuration = 60;

const PAGE_SIZE = 1000;
const MAX_ROWS = 100_000;
const APPLICATION_STATUSES = Object.keys(APPLICATION_STATUS_LABELS) as ApplicationStatus[];

type EventRow = Pick<AnalyticsEvent, "id" | "user_id" | "event" | "created_at">;
type ApplicationRow = Pick<UserApplication, "id" | "user_id" | "job_id" | "status" | "updated_at">;
type ResumeUsageRow = Pick<ResumeRow, "id" | "user_id" | "created_at" | "updated_at">;
type ProfileUsageRow = Pick<Profile, "id" | "target_roles" | "preferred_regions" | "city">;
type JobUsageRow = Pick<Job, "id" | "company_name" | "is_active">;
type ReferralUsageRow = Pick<ReferralCode, "id" | "user_id" | "is_active" | "review_status" | "created_at">;
type FeedbackUsageRow = Pick<Database["public"]["Tables"]["feedback_submissions"]["Row"], "id" | "user_id" | "created_at" | "resolved_at">;
type WechatUsageRow = Pick<WechatIdentity, "user_id">;

const EVENT_LABELS: Record<string, string> = {
  job_view: "查看岗位",
  job_saved: "收藏岗位",
  candidate_stage_updated: "更新候选阶段",
  application_recorded: "记录投递",
  application_status_updated: "更新投递状态",
  written_test_recorded: "记录笔试",
  interview_recorded: "记录面试",
  offer_recorded: "记录 Offer",
  resume_exported: "导出简历",
  resume_import_created: "导入简历",
  resume_translation_created: "生成简历译本",
  job_resume_created: "为岗位创建简历",
  bottle_view: "查看星瓶",
};

export async function GET(request: NextRequest) {
  const access = await requireAdminAccess();
  if ("response" in access) return access.response;

  const range = parseRange(request.nextUrl.searchParams.get("range"));
  const now = new Date();
  const end = now.toISOString();
  const startDate = startOfUtcDay(addDays(now, -range));
  const previousStartDate = addDays(startDate, -range);
  const previousStart = previousStartDate.toISOString();
  const warnings: string[] = [];

  try {
    const admin = createAdminClient();
    const authUsers = await readAuthUsers(admin);
    const [events, applications, resumes, profiles, jobs, referrals, feedback, wechatIdentities] = await Promise.all([
      optionalRows(readEvents(admin, previousStart, end), "事件埋点", warnings),
      optionalRows(readApplications(admin, previousStart, end), "投递记录", warnings),
      optionalRows(readResumes(admin, previousStart, end), "简历记录", warnings),
      optionalRows(readProfiles(admin), "用户画像", warnings),
      optionalRows(readJobs(admin), "岗位目录", warnings),
      optionalRows(readReferrals(admin, previousStart, end), "内推码", warnings),
      optionalRows(readFeedback(admin, previousStart, end), "反馈记录", warnings),
      optionalRows(readWechatIdentities(admin), "微信身份", warnings),
    ]);

    const response = buildAnalytics({
      authUsers,
      events,
      applications,
      resumes,
      profiles,
      jobs,
      referrals,
      feedback,
      wechatIdentities,
      range,
      now,
      start: startDate,
      previousStart: previousStartDate,
      warnings,
    });
    return NextResponse.json(response);
  } catch (error) {
    console.error("[admin_analytics]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "分析数据暂时无法读取，请稍后重试。" }, { status: 500 });
  }
}

function buildAnalytics(input: {
  authUsers: User[];
  events: EventRow[];
  applications: ApplicationRow[];
  resumes: ResumeUsageRow[];
  profiles: ProfileUsageRow[];
  jobs: JobUsageRow[];
  referrals: ReferralUsageRow[];
  feedback: FeedbackUsageRow[];
  wechatIdentities: WechatUsageRow[];
  range: AdminAnalyticsRange;
  now: Date;
  start: Date;
  previousStart: Date;
  warnings: string[];
}): AdminAnalyticsResponse {
  const { authUsers, events, applications, resumes, profiles, jobs, referrals, feedback, wechatIdentities } = input;
  const periodEnd = input.now.getTime();
  const periodStart = input.start.getTime();
  const previousStart = input.previousStart.getTime();
  const currentEvents = events.filter((row) => isBetween(row.created_at, periodStart, periodEnd));
  const previousEvents = events.filter((row) => isBetween(row.created_at, previousStart, periodStart));
  const currentApplications = applications.filter((row) => isBetween(row.updated_at, periodStart, periodEnd));
  const previousApplications = applications.filter((row) => isBetween(row.updated_at, previousStart, periodStart));
  const currentResumes = resumes.filter((row) => isBetween(row.created_at, periodStart, periodEnd));
  const previousResumes = resumes.filter((row) => isBetween(row.created_at, previousStart, periodStart));
  const currentReferrals = referrals.filter((row) => isBetween(row.created_at, periodStart, periodEnd));
  const currentFeedback = feedback.filter((row) => isBetween(row.created_at, periodStart, periodEnd));
  const activeUserIds = unique(currentEvents.map((row) => row.user_id).filter(isNonEmpty));
  const previousActiveUserIds = new Set(previousEvents.map((row) => row.user_id).filter(isNonEmpty));
  const returningUserIds = activeUserIds.filter((id) => previousActiveUserIds.has(id));
  const newUsers = authUsers.filter((user) => isBetween(user.created_at, periodStart, periodEnd)).length;
  const previousNewUsers = authUsers.filter((user) => isBetween(user.created_at, previousStart, periodStart)).length;
  const wechatUserIds = new Set(wechatIdentities.map((item) => item.user_id));

  const eventUsers = new Set(currentEvents.map((row) => row.user_id).filter(isNonEmpty));
  const resumeUsers = new Set(currentResumes.map((row) => row.user_id));
  const applicationUsers = new Set(currentApplications.map((row) => row.user_id));
  const engagedUsers = new Set([...eventUsers, ...resumeUsers, ...applicationUsers]);
  const interviewUsers = new Set(
    currentApplications
      .filter((row) => ["written_test", "first_round", "second_round", "final_round", "offer"].includes(row.status))
      .map((row) => row.user_id),
  );
  const offerUsers = new Set(currentApplications.filter((row) => row.status === "offer").map((row) => row.user_id));

  return {
    generatedAt: input.now.toISOString(),
    period: {
      rangeDays: input.range,
      start: input.start.toISOString(),
      end: input.now.toISOString(),
      previousStart: input.previousStart.toISOString(),
      previousEnd: input.start.toISOString(),
    },
    summary: {
      totalUsers: authUsers.length,
      newUsers,
      previousNewUsers,
      activeUsers: activeUserIds.length,
      previousActiveUsers: previousActiveUserIds.size,
      events: currentEvents.length,
      previousEvents: previousEvents.length,
      applications: currentApplications.length,
      previousApplications: previousApplications.length,
      resumes: currentResumes.length,
      previousResumes: previousResumes.length,
      referralCodes: currentReferrals.length,
      feedback: currentFeedback.length,
      activeJobs: jobs.filter((job) => job.is_active).length,
      totalJobs: jobs.length,
    },
    trend: buildTrend({
      authUsers,
      events,
      applications,
      resumes,
      start: input.start,
      range: input.range,
    }),
    activeSegments: buildSegments({
      totalUsers: authUsers.length,
      activeUsers: activeUserIds.length,
      returningUsers: returningUserIds.length,
      onePeriodUsers: Math.max(0, activeUserIds.length - returningUserIds.length),
    }),
    funnel: buildFunnel([
      ["产生数据", engagedUsers.size],
      ["创建简历", resumeUsers.size],
      ["记录投递", applicationUsers.size],
      ["进入面试", interviewUsers.size],
      ["获得 Offer", offerUsers.size],
    ]),
    applicationStatuses: buildApplicationStatuses(currentApplications),
    accountTypes: buildAccountTypes(authUsers, wechatUserIds),
    topRoles: buildProfileBreakdown(profiles, "target_roles"),
    topRegions: buildProfileBreakdown(profiles, "preferred_regions"),
    topCompanies: buildCompanyBreakdown(currentApplications, jobs),
    events: buildEventSummaries(currentEvents),
    moderation: {
      activeReferralCodes: currentReferrals.filter((row) => row.is_active).length,
      queuedReferralCodes: currentReferrals.filter((row) => row.review_status === "queued").length,
      rejectedReferralCodes: currentReferrals.filter((row) => row.review_status === "rejected" || !row.is_active).length,
      unresolvedFeedback: currentFeedback.filter((row) => !row.resolved_at).length,
    },
    warnings: input.warnings,
  };
}

function buildTrend(input: {
  authUsers: User[];
  events: EventRow[];
  applications: ApplicationRow[];
  resumes: ResumeUsageRow[];
  start: Date;
  range: AdminAnalyticsRange;
}) {
  return Array.from({ length: input.range }, (_, index) => {
    const dayStart = addDays(input.start, index);
    const dayEnd = addDays(dayStart, 1);
    const start = dayStart.getTime();
    const end = dayEnd.getTime();
    const dayEvents = input.events.filter((row) => isBetween(row.created_at, start, end));
    return {
      date: dayStart.toISOString().slice(0, 10),
      label: formatDateLabel(dayStart),
      newUsers: input.authUsers.filter((user) => isBetween(user.created_at, start, end)).length,
      activeUsers: unique(dayEvents.map((row) => row.user_id).filter(isNonEmpty)).length,
      events: dayEvents.length,
      applications: input.applications.filter((row) => isBetween(row.updated_at, start, end)).length,
      resumes: input.resumes.filter((row) => isBetween(row.created_at, start, end)).length,
    };
  });
}

function buildSegments(input: { totalUsers: number; activeUsers: number; returningUsers: number; onePeriodUsers: number }) {
  return [
    { label: "本期活跃", value: input.activeUsers, share: ratio(input.activeUsers, input.totalUsers) },
    { label: "回访用户", value: input.returningUsers, share: ratio(input.returningUsers, input.totalUsers) },
    { label: "首次活跃", value: input.onePeriodUsers, share: ratio(input.onePeriodUsers, input.totalUsers) },
    { label: "本期未使用", value: Math.max(0, input.totalUsers - input.activeUsers), share: ratio(Math.max(0, input.totalUsers - input.activeUsers), input.totalUsers) },
  ];
}

function buildFunnel(steps: Array<[string, number]>) {
  const base = steps[0]?.[1] ?? 0;
  return steps.map(([label, value]) => ({ label, value, rate: ratio(value, base) }));
}

function buildApplicationStatuses(rows: ApplicationRow[]) {
  const total = rows.length;
  return APPLICATION_STATUSES
    .map((status) => {
      const value = rows.filter((row) => row.status === status).length;
      return {
        status,
        label: APPLICATION_STATUS_LABELS[status],
        value,
        share: ratio(value, total),
      };
    })
    .filter((item) => item.value > 0)
    .sort((left, right) => right.value - left.value);
}

function buildAccountTypes(users: User[], wechatUserIds: Set<string>) {
  const counts = new Map<string, number>();
  users.forEach((user) => {
    const label = getAccountTypeLabel(getAccountType(user.email, wechatUserIds.has(user.id)));
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });
  return buildRank(counts, users.length, 4);
}

function buildProfileBreakdown(rows: ProfileUsageRow[], key: "target_roles" | "preferred_regions") {
  const counts = new Map<string, number>();
  rows.forEach((profile) => {
    unique((profile[key] ?? []).map((value) => value.trim()).filter(Boolean)).forEach((value) => {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    });
  });
  return buildRank(counts, Array.from(counts.values()).reduce((sum, value) => sum + value, 0), 6);
}

function buildCompanyBreakdown(rows: ApplicationRow[], jobs: JobUsageRow[]) {
  const jobCompanies = new Map(jobs.map((job) => [job.id, job.company_name]));
  const counts = new Map<string, { value: number; users: Set<string> }>();
  rows.forEach((row) => {
    const label = jobCompanies.get(row.job_id) ?? "岗位已下线";
    const entry = counts.get(label) ?? { value: 0, users: new Set<string>() };
    entry.value += 1;
    entry.users.add(row.user_id);
    counts.set(label, entry);
  });
  const total = rows.length;
  return Array.from(counts.entries())
    .map(([label, entry]) => ({ label, value: entry.value, share: ratio(entry.value, total), users: entry.users.size }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 6);
}

function buildEventSummaries(rows: EventRow[]) {
  const groups = new Map<string, { count: number; users: Set<string>; lastSeen: string | null }>();
  rows.forEach((row) => {
    const entry = groups.get(row.event) ?? { count: 0, users: new Set<string>(), lastSeen: null };
    entry.count += 1;
    if (row.user_id) entry.users.add(row.user_id);
    if (!entry.lastSeen || new Date(row.created_at).getTime() > new Date(entry.lastSeen).getTime()) entry.lastSeen = row.created_at;
    groups.set(row.event, entry);
  });
  return Array.from(groups.entries())
    .map(([name, entry]) => ({ name, label: EVENT_LABELS[name] ?? humanizeEventName(name), count: entry.count, users: entry.users.size, lastSeen: entry.lastSeen }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 8);
}

function buildRank(counts: Map<string, number>, denominator: number, limit: number) {
  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value, share: ratio(value, denominator) }))
    .sort((left, right) => right.value - left.value)
    .slice(0, limit);
}

function parseRange(value: string | null): AdminAnalyticsRange {
  if (value === "7" || value === "14" || value === "90") return Number(value) as AdminAnalyticsRange;
  return 30;
}

function startOfUtcDay(value: Date) {
  const result = new Date(value);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

function addDays(value: Date, days: number) {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function isBetween(value: string | null | undefined, start: number, end: number) {
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && timestamp >= start && timestamp < end;
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function isNonEmpty(value: string | null): value is string {
  return Boolean(value);
}

function ratio(value: number, denominator: number) {
  return denominator > 0 ? Math.round((value / denominator) * 1000) / 10 : 0;
}

function formatDateLabel(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", timeZone: "UTC" }).format(value);
}

function getAccountTypeLabel(value: ReturnType<typeof getAccountType>) {
  if (value === "wechat") return "微信登录";
  if (value === "linked") return "微信已绑定";
  return "邮箱登录";
}

function humanizeEventName(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

async function readAuthUsers(admin: ReturnType<typeof createAdminClient>) {
  const users: User[] = [];
  for (let page = 1; page <= MAX_ROWS / PAGE_SIZE; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < PAGE_SIZE) return users;
  }
  throw new Error("用户数量超过当前分析页的安全读取上限。");
}

async function readEvents(admin: ReturnType<typeof createAdminClient>, start: string, end: string) {
  return readPaged<EventRow>((from, to) => admin.from("events").select("id,user_id,event,created_at").gte("created_at", start).lt("created_at", end).order("created_at", { ascending: true }).range(from, to));
}

async function readApplications(admin: ReturnType<typeof createAdminClient>, start: string, end: string) {
  return readPaged<ApplicationRow>((from, to) => admin.from("user_applications").select("id,user_id,job_id,status,updated_at").gte("updated_at", start).lt("updated_at", end).order("updated_at", { ascending: true }).range(from, to));
}

async function readResumes(admin: ReturnType<typeof createAdminClient>, start: string, end: string) {
  return readPaged<ResumeUsageRow>((from, to) => admin.from("resumes").select("id,user_id,created_at,updated_at").gte("created_at", start).lt("created_at", end).order("created_at", { ascending: true }).range(from, to));
}

async function readProfiles(admin: ReturnType<typeof createAdminClient>) {
  return readPaged<ProfileUsageRow>((from, to) => admin.from("profiles").select("id,target_roles,preferred_regions,city").range(from, to));
}

async function readJobs(admin: ReturnType<typeof createAdminClient>) {
  return readPaged<JobUsageRow>((from, to) => admin.from("jobs").select("id,company_name,is_active").range(from, to));
}

async function readReferrals(admin: ReturnType<typeof createAdminClient>, start: string, end: string) {
  return readPaged<ReferralUsageRow>((from, to) => admin.from("referral_codes").select("id,user_id,is_active,review_status,created_at").gte("created_at", start).lt("created_at", end).order("created_at", { ascending: true }).range(from, to));
}

async function readFeedback(admin: ReturnType<typeof createAdminClient>, start: string, end: string) {
  return readPaged<FeedbackUsageRow>((from, to) => admin.from("feedback_submissions").select("id,user_id,created_at,resolved_at").gte("created_at", start).lt("created_at", end).order("created_at", { ascending: true }).range(from, to));
}

async function readWechatIdentities(admin: ReturnType<typeof createAdminClient>) {
  return readPaged<WechatUsageRow>((from, to) => admin.from("wechat_identities").select("user_id").range(from, to));
}

async function readPaged<T>(load: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>) {
  const rows: T[] = [];
  for (let offset = 0; offset < MAX_ROWS; offset += PAGE_SIZE) {
    const result = await load(offset, offset + PAGE_SIZE - 1);
    if (result.error) throw new Error(result.error.message);
    const page = Array.isArray(result.data) ? result.data as T[] : [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
  throw new Error("分析数据超过当前页面的安全读取上限。");
}

async function optionalRows<T>(promise: Promise<T[]>, label: string, warnings: string[]) {
  try {
    return await promise;
  } catch (error) {
    console.error("[admin_analytics_source]", label, error instanceof Error ? error.message : "unknown error");
    warnings.push(`${label}暂时不可用，相关指标未纳入统计。`);
    return [];
  }
}
