import type { Job } from "@/lib/types";

const SHANGHAI_TIME_ZONE = "Asia/Shanghai";
const DAY_MS = 24 * 60 * 60 * 1000;

const datePartsFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: SHANGHAI_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const dateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: SHANGHAI_TIME_ZONE,
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export type DeadlineTone = "none" | "passed" | "neutral" | "amber" | "coral" | "urgent";

export function formatShanghaiDateTime(value?: string | null) {
  if (!value) return "暂无";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateTimeFormatter.format(date);
}

export function formatShanghaiDate(value?: string | null) {
  if (!value) return "暂无";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return datePartsFormatter.format(date);
}

export function getJobDeadline(job: Job) {
  return job.closes_at ?? null;
}

export function getDeadlineTime(job: Job) {
  const deadline = getJobDeadline(job);
  if (!deadline) return Number.MAX_SAFE_INTEGER;
  const time = new Date(deadline).getTime();
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
}

export function daysUntilShanghai(value?: string | null, now = new Date()) {
  if (!value) return null;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;
  const todayKey = shanghaiDayKey(now);
  const targetKey = shanghaiDayKey(target);
  return Math.ceil((targetKey - todayKey) / DAY_MS);
}

export function getDeadlineTone(value?: string | null, now = new Date()): DeadlineTone {
  const days = daysUntilShanghai(value, now);
  if (days === null) return "none";
  if (days < 0) return "passed";
  if (days <= 2) return "urgent";
  if (days <= 7) return "coral";
  if (days <= 14) return "amber";
  return "neutral";
}

export function getDeadlineLabel(value?: string | null, now = new Date()) {
  const days = daysUntilShanghai(value, now);
  if (days === null) return "截止待补充";
  if (days < 0) return "已截止";
  if (days === 0) return "今天截止";
  return `${days} 天`;
}

function shanghaiDayKey(date: Date) {
  const parts = datePartsFormatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  return Date.UTC(year, month - 1, day);
}
