import { APPLICATION_STATUS_LABELS } from "@/lib/constants";
import { INDUSTRY_GROUPS, REGION_GROUPS, classifyJob } from "@/lib/galaxy-taxonomy";
import type { ApplicationStatus, Job, UserApplication } from "@/lib/types";

export type NebulaMode = "gateway" | "region" | "industry" | "batch" | "captured";

export type NebulaCategory = {
  id: string;
  name: string;
  count: number;
  capturedCount?: number;
  imageSrc: string;
  variant: "region" | "industry" | "batch" | "captured";
  jobIds: string[];
};

export type NebulaSelection = {
  id: string;
  name: string;
  mode: NebulaMode;
  jobIds: string[];
};

const REGION_IMAGE_BY_SLUG: Record<string, string> = {
  beijing: "/assets/nebula/nebula-beijing.png",
  shanghai: "/assets/nebula/nebula-shanghai.png",
};

const INDUSTRY_IMAGE_BY_SLUG: Record<string, string> = {
  internet: "/assets/nebula/nebula-internet.png",
  finance: "/assets/nebula/nebula-finance.png",
  consulting: "/assets/nebula/nebula-consulting.png",
  technology: "/assets/nebula/nebula-tech.png",
};

export function buildNebulaGateways(jobs: Job[], applications: UserApplication[]): NebulaCategory[] {
  const capturedJobIds = new Set(applications.map((application) => application.job_id));
  const capturedCount = (jobIds: string[]) => jobIds.filter((id) => capturedJobIds.has(id)).length;
  const regionJobIds = jobs.filter((job) => classifyJob(job, "region").slug !== "other").map((job) => job.id);
  const industryJobIds = jobs.filter((job) => classifyJob(job, "industry").slug !== "other").map((job) => job.id);
  const batchJobIds = jobs.filter((job) => Boolean(job.batch_type)).map((job) => job.id);
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
      id: "batch",
      name: "批次星系",
      count: batchJobIds.length,
      capturedCount: capturedCount(batchJobIds),
      imageSrc: "/assets/nebula/nebula-batch.png",
      variant: "batch",
      jobIds: batchJobIds,
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

  if (mode === "batch") {
    const batchNames = Array.from(new Set(jobs.map((job) => job.batch_type).filter(Boolean))) as string[];
    return batchNames.sort().map((batch) => {
      const groupJobs = jobs.filter((job) => job.batch_type === batch);
      return {
        id: batch,
        name: `${batch}星云`,
        count: groupJobs.length,
        capturedCount: groupJobs.filter((job) => capturedJobIds.has(job.id)).length,
        imageSrc: "/assets/nebula/nebula-batch.png",
        variant: "batch" as const,
        jobIds: groupJobs.map((job) => job.id),
      };
    });
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
