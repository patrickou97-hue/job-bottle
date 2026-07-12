import { APPLICATION_STATUS_LABELS } from "@/lib/constants";
import { JOB_CATEGORIES, normalizeJobCategories } from "@/lib/categories";
import { INDUSTRY_GROUPS, REGION_GROUPS, classifyJob } from "@/lib/galaxy-taxonomy";
import type { ApplicationStatus, Job, UserApplication } from "@/lib/types";

export type NebulaMode = "gateway" | "region" | "industry" | "category" | "captured";

export type NebulaCategory = {
  id: string;
  name: string;
  count: number;
  capturedCount?: number;
  imageSrc: string;
  variant: "region" | "industry" | "category" | "captured";
  jobIds: string[];
};

export type NebulaSelection = {
  id: string;
  name: string;
  mode: NebulaMode;
  jobIds: string[];
};

const REGION_IMAGE_BY_SLUG: Record<string, string> = {
  beijing: "/assets/nebula/nebula-role-fork.png",
  shanghai: "/assets/nebula/nebula-role-triad.png",
  shenzhen: "/assets/nebula/nebula-region-shenzhen.png",
  guangzhou: "/assets/nebula/nebula-region-guangzhou.png",
  chengdu: "/assets/nebula/nebula-region-chengdu.png",
  hangzhou: "/assets/nebula/nebula-role-spiral.png",
  hongkong: "/assets/nebula/nebula-role-crescent.png",
  national: "/assets/nebula/nebula-region-national.png",
  other: "/assets/nebula/nebula-role-ring.png",
};

const INDUSTRY_IMAGE_BY_SLUG: Record<string, string> = {
  internet: "/assets/nebula/nebula-role-cross.png",
  finance: "/assets/nebula/nebula-industry-consumer.png",
  consulting: "/assets/nebula/nebula-role-crescent.png",
  technology: "/assets/nebula/nebula-industry-healthcare.png",
  manufacturing: "/assets/nebula/nebula-industry-manufacturing.png",
  consumer: "/assets/nebula/nebula-role-fork.png",
  "real-estate": "/assets/nebula/nebula-region-chengdu.png",
  healthcare: "/assets/nebula/nebula-industry-energy.png",
  energy: "/assets/nebula/nebula-role-triad.png",
  other: "/assets/nebula/nebula-region-shenzhen.png",
};

const CATEGORY_IMAGES = [
  "/assets/nebula/nebula-role-fork.png",
  "/assets/nebula/nebula-role-triad.png",
  "/assets/nebula/nebula-role-crescent.png",
  "/assets/nebula/nebula-role-spiral.png",
  "/assets/nebula/nebula-role-cross.png",
  "/assets/nebula/nebula-role-ring.png",
  "/assets/nebula/nebula-region-shenzhen.png",
  "/assets/nebula/nebula-region-guangzhou.png",
  "/assets/nebula/nebula-region-chengdu.png",
  "/assets/nebula/nebula-region-national.png",
  "/assets/nebula/nebula-industry-manufacturing.png",
  "/assets/nebula/nebula-industry-consumer.png",
  "/assets/nebula/nebula-industry-healthcare.png",
  "/assets/nebula/nebula-industry-energy.png",
  "/assets/nebula/nebula-tech.png",
] as const;

export function buildNebulaGateways(jobs: Job[], applications: UserApplication[]): NebulaCategory[] {
  const capturedJobIds = new Set(applications.map((application) => application.job_id));
  const capturedCount = (jobIds: string[]) => jobIds.filter((id) => capturedJobIds.has(id)).length;
  const regionJobIds = jobs.filter((job) => classifyJob(job, "region").slug !== "other").map((job) => job.id);
  const industryJobIds = jobs.filter((job) => classifyJob(job, "industry").slug !== "other").map((job) => job.id);
  const categoryJobIds = jobs.filter((job) => getJobCategories(job).length > 0).map((job) => job.id);
  const capturedJobList = applications.map((application) => application.job_id);

  return [
    {
      id: "region",
      name: "地区星系",
      count: regionJobIds.length,
      capturedCount: capturedCount(regionJobIds),
      imageSrc: "/assets/nebula/nebula-region.png",
      variant: "region",
      jobIds: regionJobIds,
    },
    {
      id: "industry",
      name: "行业星系",
      count: industryJobIds.length,
      capturedCount: capturedCount(industryJobIds),
      imageSrc: "/assets/nebula/nebula-industry.png",
      variant: "industry",
      jobIds: industryJobIds,
    },
    {
      id: "category",
      name: "岗位星系",
      count: categoryJobIds.length,
      capturedCount: capturedCount(categoryJobIds),
      imageSrc: "/assets/nebula/nebula-batch.png",
      variant: "category",
      jobIds: categoryJobIds,
    },
    {
      id: "captured",
      name: "已捕获星系",
      count: capturedJobList.length,
      capturedCount: capturedJobList.length,
      imageSrc: "/assets/nebula/nebula-captured.png",
      variant: "captured",
      jobIds: capturedJobList,
    },
  ];
}

export function buildNebulaCategories(
  mode: Exclude<NebulaMode, "gateway">,
  jobs: Job[],
  applications: UserApplication[],
): NebulaCategory[] {
  const capturedJobIds = new Set(applications.map((application) => application.job_id));
  if (mode === "region") {
    return REGION_GROUPS.map((group) => {
      const groupJobs = jobs.filter((job) => classifyJob(job, "region").slug === group.slug);
      return {
        id: group.slug,
        name: group.label,
        count: groupJobs.length,
        capturedCount: groupJobs.filter((job) => capturedJobIds.has(job.id)).length,
        imageSrc: REGION_IMAGE_BY_SLUG[group.slug] ?? "/assets/nebula/nebula-region.png",
        variant: "region" as const,
        jobIds: groupJobs.map((job) => job.id),
      };
    }).filter((item) => item.count > 0);
  }

  if (mode === "industry") {
    return INDUSTRY_GROUPS.map((group) => {
      const groupJobs = jobs.filter((job) => classifyJob(job, "industry").slug === group.slug);
      return {
        id: group.slug,
        name: group.label,
        count: groupJobs.length,
        capturedCount: groupJobs.filter((job) => capturedJobIds.has(job.id)).length,
        imageSrc: INDUSTRY_IMAGE_BY_SLUG[group.slug] ?? "/assets/nebula/nebula-industry.png",
        variant: "industry" as const,
        jobIds: groupJobs.map((job) => job.id),
      };
    }).filter((item) => item.count > 0);
  }

  if (mode === "category") {
    return JOB_CATEGORIES.map((category, index) => {
      const groupJobs = jobs.filter((job) => getJobCategories(job).includes(category));
      return {
        id: category,
        name: `${category}星云`,
        count: groupJobs.length,
        capturedCount: groupJobs.filter((job) => capturedJobIds.has(job.id)).length,
        imageSrc: CATEGORY_IMAGES[index % CATEGORY_IMAGES.length],
        variant: "category" as const,
        jobIds: groupJobs.map((job) => job.id),
      };
    }).filter((item) => item.count > 0);
  }

  const byStatus = new Map<ApplicationStatus, string[]>();
  applications.forEach((application) => {
    const current = byStatus.get(application.status) ?? [];
    current.push(application.job_id);
    byStatus.set(application.status, current);
  });
  return Array.from(byStatus.entries()).map(([status, jobIds]) => ({
    id: status,
    name: `${APPLICATION_STATUS_LABELS[status]}星云`,
    count: jobIds.length,
    capturedCount: jobIds.length,
    imageSrc: "/assets/nebula/nebula-captured.png",
    variant: "captured" as const,
    jobIds,
  }));
}

function getJobCategories(job: Job) {
  return job.job_categories?.length
    ? job.job_categories
    : normalizeJobCategories(job.job_titles).categories;
}
