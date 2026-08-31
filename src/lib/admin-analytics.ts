import type { ApplicationStatus } from "@/lib/types";

export type AdminAnalyticsRange = 7 | 14 | 30 | 90;

export type AdminAnalyticsTrendPoint = {
  date: string;
  label: string;
  newUsers: number;
  activeUsers: number;
  events: number;
  applications: number;
  resumes: number;
};

export type AdminAnalyticsRank = {
  label: string;
  value: number;
  share: number;
  users?: number;
};

export type AdminAnalyticsFunnelStep = {
  label: string;
  value: number;
  rate: number;
};

export type AdminAnalyticsEvent = {
  name: string;
  label: string;
  count: number;
  users: number;
  lastSeen: string | null;
};

export type AdminAnalyticsResponse = {
  generatedAt: string;
  period: {
    rangeDays: AdminAnalyticsRange;
    start: string;
    end: string;
    previousStart: string;
    previousEnd: string;
  };
  summary: {
    totalUsers: number;
    newUsers: number;
    previousNewUsers: number;
    activeUsers: number;
    previousActiveUsers: number;
    events: number;
    previousEvents: number;
    applications: number;
    previousApplications: number;
    resumes: number;
    previousResumes: number;
    referralCodes: number;
    feedback: number;
    activeJobs: number;
    totalJobs: number;
  };
  trend: AdminAnalyticsTrendPoint[];
  activeSegments: AdminAnalyticsRank[];
  funnel: AdminAnalyticsFunnelStep[];
  applicationStatuses: Array<AdminAnalyticsRank & { status: ApplicationStatus }>;
  accountTypes: AdminAnalyticsRank[];
  topRoles: AdminAnalyticsRank[];
  topRegions: AdminAnalyticsRank[];
  topCompanies: AdminAnalyticsRank[];
  events: AdminAnalyticsEvent[];
  moderation: {
    activeReferralCodes: number;
    queuedReferralCodes: number;
    rejectedReferralCodes: number;
    unresolvedFeedback: number;
  };
  warnings: string[];
};

export async function fetchAdminAnalytics(range: AdminAnalyticsRange = 30) {
  const response = await fetch(`/api/admin/analytics?range=${range}`, { cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = payload && typeof payload === "object" && "error" in payload
      ? payload.error
      : null;
    throw new Error(typeof error === "string" ? error : "分析数据暂时无法读取，请稍后重试。");
  }
  return payload as AdminAnalyticsResponse;
}
