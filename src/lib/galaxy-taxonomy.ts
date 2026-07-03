import { splitToTags } from "@/lib/utils";
import type { Job } from "@/lib/types";

export type GalaxyKind = "region" | "industry";

export type GalaxyGroup = {
  slug: string;
  label: string;
  shortLabel: string;
  keywords: string[];
  tone: string;
}

export const REGION_GROUPS: GalaxyGroup[] = [
  { slug: "beijing", label: "北京星云", shortLabel: "北京", keywords: ["北京"], tone: "rgba(118,154,205,0.34)" },
  { slug: "shanghai", label: "上海星云", shortLabel: "上海", keywords: ["上海"], tone: "rgba(120,178,198,0.30)" },
  { slug: "shenzhen", label: "深圳星云", shortLabel: "深圳", keywords: ["深圳"], tone: "rgba(106,158,184,0.32)" },
  { slug: "guangzhou", label: "广州星云", shortLabel: "广州", keywords: ["广州"], tone: "rgba(120,144,190,0.28)" },
  { slug: "chengdu", label: "成都星云", shortLabel: "成都", keywords: ["成都"], tone: "rgba(144,148,192,0.26)" },
  { slug: "hangzhou", label: "杭州星云", shortLabel: "杭州", keywords: ["杭州"], tone: "rgba(112,168,184,0.29)" },
  { slug: "hongkong", label: "香港星云", shortLabel: "香港", keywords: ["香港", "HK"], tone: "rgba(155,164,204,0.26)" },
  { slug: "national", label: "全国星云", shortLabel: "全国", keywords: ["全国", "不限", "远程"], tone: "rgba(166,177,205,0.24)" },
  { slug: "other", label: "其他地区", shortLabel: "其他", keywords: [], tone: "rgba(132,145,174,0.22)" },
];

export const INDUSTRY_GROUPS: GalaxyGroup[] = [
  { slug: "internet", label: "互联网星云", shortLabel: "互联网", keywords: ["互联网", "电商", "平台", "游戏", "社交"], tone: "rgba(112,154,205,0.32)" },
  { slug: "finance", label: "金融星云", shortLabel: "金融", keywords: ["金融", "银行", "证券", "保险", "基金", "投行"], tone: "rgba(155,166,196,0.27)" },
  { slug: "consulting", label: "咨询星云", shortLabel: "咨询", keywords: ["咨询", "顾问"], tone: "rgba(125,145,190,0.28)" },
  { slug: "technology", label: "科技星云", shortLabel: "科技", keywords: ["科技", "AI", "人工智能", "芯片", "半导体", "云"], tone: "rgba(106,174,198,0.30)" },
  { slug: "manufacturing", label: "制造星云", shortLabel: "制造", keywords: ["制造", "汽车", "工业", "硬件"], tone: "rgba(135,156,185,0.25)" },
  { slug: "consumer", label: "消费星云", shortLabel: "消费", keywords: ["消费", "零售", "快消", "品牌"], tone: "rgba(151,155,190,0.25)" },
  { slug: "real-estate", label: "地产/基建星云", shortLabel: "地产", keywords: ["地产", "基建", "建筑"], tone: "rgba(132,142,170,0.22)" },
  { slug: "healthcare", label: "医疗健康星云", shortLabel: "医疗", keywords: ["医疗", "健康", "医药", "生物"], tone: "rgba(118,168,178,0.26)" },
  { slug: "energy", label: "能源星云", shortLabel: "能源", keywords: ["能源", "电力", "新能源"], tone: "rgba(138,159,186,0.24)" },
  { slug: "other", label: "其他行业", shortLabel: "其他", keywords: [], tone: "rgba(132,145,174,0.22)" },
];

export function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function getGalaxyGroups(kind: GalaxyKind) {
  return kind === "region" ? REGION_GROUPS : INDUSTRY_GROUPS;
}

export function getGalaxyGroup(kind: GalaxyKind, slug: string) {
  return getGalaxyGroups(kind).find((group) => group.slug === slug) ?? getGalaxyGroups(kind).at(-1)!;
}

export function classifyJob(job: Job, kind: GalaxyKind) {
  const groups = getGalaxyGroups(kind);
  const source =
    kind === "region"
      ? splitToTags(job.locations, job.tags?.join(",")).join(" ")
      : splitToTags(job.industry, job.tags?.join(","), job.job_titles).join(" ");
  const normalized = source.toLowerCase();
  const matched = groups.find(
    (group) =>
      group.slug !== "other" &&
      group.keywords.some((keyword) => normalized.includes(keyword.toLowerCase())),
  );
  return matched ?? groups.find((group) => group.slug === "other")!;
}

export function filterJobsByGalaxy(jobs: Job[], kind: GalaxyKind, slug: string) {
  return jobs.filter((job) => classifyJob(job, kind).slug === slug);
}

export function buildGalaxyStats(jobs: Job[], capturedJobIds: Set<string>, kind: GalaxyKind) {
  return getGalaxyGroups(kind).map((group) => {
    const groupJobs = jobs.filter((job) => classifyJob(job, kind).slug === group.slug);
    return {
      ...group,
      jobCount: groupJobs.length,
      capturedCount: groupJobs.filter((job) => capturedJobIds.has(job.id)).length,
    };
  });
}
