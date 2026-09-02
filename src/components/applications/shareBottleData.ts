import type { ApplicationStatus, ApplicationWithJob } from "@/lib/types";

export const DEFAULT_SHARE_POSTER_OVERRIDES = {
  title: "我的星光瓶",
  subtitle: "每一步努力，都在收藏未来的你",
  footerNote: "记录你的秋招旅程，分享每一颗努力的星",
  showBottle: true,
  showStats: true,
  showCompanies: true,
  companyLimit: 10,
} as const;

export type SharePosterOverrides = {
  title?: string;
  subtitle?: string;
  footerNote?: string;
  showBottle?: boolean;
  showStats?: boolean;
  showCompanies?: boolean;
  companyLimit?: number;
};

export type ShareCompanyEntry = {
  companyName: string;
  applicationCount: number;
  status: ApplicationStatus;
};

export type SharePosterModel = {
  title: string;
  subtitle: string;
  footerNote: string;
  showBottle: boolean;
  showStats: boolean;
  showCompanies: boolean;
  companyLimit: number;
  totalApplications: number;
  totalCompanies: number;
  overflowCompanyCount: number;
  companies: ShareCompanyEntry[];
  offerCount: number;
  appliedCount: number;
  interviewCount: number;
};

const STATUS_RANK: Record<ApplicationStatus, number> = {
  opened: 1,
  applied: 2,
  written_test: 3,
  first_round: 4,
  second_round: 5,
  final_round: 6,
  offer: 7,
  rejected: 0,
  withdrawn: 0,
};

export function buildSharePosterModel(
  applications: ApplicationWithJob[],
  overrides: SharePosterOverrides = {},
): SharePosterModel {
  const companies = getShareCompanyEntries(applications);
  const companyLimit = clampCompanyLimit(overrides.companyLimit);
  const visibleCompanies = companies.slice(0, companyLimit);

  return {
    title: cleanPosterText(overrides.title, DEFAULT_SHARE_POSTER_OVERRIDES.title, 32),
    subtitle: cleanPosterText(overrides.subtitle, DEFAULT_SHARE_POSTER_OVERRIDES.subtitle, 58),
    footerNote: cleanPosterText(overrides.footerNote, DEFAULT_SHARE_POSTER_OVERRIDES.footerNote, 44),
    showBottle: overrides.showBottle ?? DEFAULT_SHARE_POSTER_OVERRIDES.showBottle,
    showStats: overrides.showStats ?? DEFAULT_SHARE_POSTER_OVERRIDES.showStats,
    showCompanies: overrides.showCompanies ?? DEFAULT_SHARE_POSTER_OVERRIDES.showCompanies,
    companyLimit,
    totalApplications: applications.length,
    totalCompanies: companies.length,
    overflowCompanyCount: Math.max(0, companies.length - visibleCompanies.length),
    companies: visibleCompanies,
    offerCount: applications.filter((application) => application.status === "offer").length,
    appliedCount: applications.filter(
      (application) => application.status !== "opened" && application.status !== "withdrawn",
    ).length,
    interviewCount: applications.filter((application) =>
      ["first_round", "second_round", "final_round"].includes(application.status),
    ).length,
  };
}

export function getShareCompanyEntries(applications: ApplicationWithJob[]) {
  const grouped = new Map<string, ShareCompanyEntry>();

  applications.forEach((application) => {
    const companyName = application.job.company_name?.trim();
    if (!companyName) return;

    const key = companyName.toLocaleLowerCase();
    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, {
        companyName,
        applicationCount: 1,
        status: application.status,
      });
      return;
    }

    current.applicationCount += 1;
    if (STATUS_RANK[application.status] > STATUS_RANK[current.status]) {
      current.status = application.status;
    }
  });

  return Array.from(grouped.values());
}

export function getShareDensityLabel(totalApplications: number, totalCompanies: number) {
  if (totalApplications > 60 || totalCompanies > 24) return "高密度星瓶 · 企业已合并展示";
  if (totalApplications > 30 || totalCompanies > 12) return "星瓶已进入密集模式";
  return "每颗星对应一条投递记录";
}

function clampCompanyLimit(value: number | undefined) {
  if (!Number.isFinite(value)) return DEFAULT_SHARE_POSTER_OVERRIDES.companyLimit;
  return Math.min(12, Math.max(5, Math.round(value ?? DEFAULT_SHARE_POSTER_OVERRIDES.companyLimit)));
}

function cleanPosterText(value: string | undefined, fallback: string, maxLength: number) {
  const trimmed = value?.trim();
  return (trimmed || fallback).slice(0, maxLength);
}
