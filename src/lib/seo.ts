import type { Job } from "@/lib/types";

export const SITE_URL = "https://www.starjob.space";
export const SITE_NAME = "拾星 StarJob";
export const DEFAULT_SHARE_IMAGE = "/assets/space-background-desktop.png";

export function getJobDisplayTitle(job: Job) {
  return `${job.company_name} ${job.job_titles || "校园招聘岗位"}`.trim();
}

export function getJobSeoDescription(job: Job) {
  const details = [
    job.locations ? `工作地点：${job.locations}` : null,
    job.batch_type ? `招聘批次：${job.batch_type}` : null,
    job.job_titles ? `岗位方向：${job.job_titles}` : null,
    job.opens_at || job.start_date ? `开启时间：${job.opens_at || job.start_date}` : null,
    job.closes_at ? `截止时间：${job.closes_at}` : null,
  ].filter(Boolean);

  return `${getJobDisplayTitle(job)}。${details.join("；")}。查看岗位信息和官方投递入口。`;
}

export function isJobOpenForSearch(job: Job, now = Date.now()) {
  if (!job.is_active) return false;
  if (!job.closes_at) return true;

  const closesAt = new Date(job.closes_at).getTime();
  return !Number.isFinite(closesAt) || closesAt >= now;
}

function splitLocations(locations: string | null) {
  return (locations ?? "")
    .split(/[、,，;；/|]/)
    .map((location) => location.trim())
    .filter(Boolean)
    .filter((location) => !/^(全国|全球|多地|不限)$/.test(location))
    .slice(0, 8);
}

function compactText(parts: Array<string | null | undefined>) {
  return parts.map((part) => part?.trim()).filter(Boolean).join("\n\n");
}

export function buildJobPosting(job: Job) {
  if (!isJobOpenForSearch(job)) return null;

  const locations = splitLocations(job.locations);
  const validThrough = job.closes_at && Number.isFinite(new Date(job.closes_at).getTime())
    ? job.closes_at
    : undefined;
  const description = compactText([
    job.responsibilities ? `工作职责\n${job.responsibilities}` : null,
    job.must_have ? `任职要求\n${job.must_have}` : null,
    job.preferred_qualifications ? `优先条件\n${job.preferred_qualifications}` : null,
    job.notes,
  ]) || getJobSeoDescription(job);

  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.job_titles || `${job.company_name}校园招聘岗位`,
    description,
    identifier: {
      "@type": "PropertyValue",
      name: job.company_name,
      value: job.id,
    },
    datePosted: job.created_at,
    ...(validThrough ? { validThrough } : {}),
    directApply: false,
    hiringOrganization: {
      "@type": "Organization",
      name: job.company_name,
      sameAs: job.apply_url,
      ...(job.logo_url ? { logo: job.logo_url } : {}),
    },
    ...(locations.length
      ? {
          jobLocation: locations.map((location) => ({
            "@type": "Place",
            address: {
              "@type": "PostalAddress",
              addressLocality: location,
              addressCountry: "CN",
            },
          })),
        }
      : {}),
    url: `${SITE_URL}/jobs/${job.id}`,
  };
}
