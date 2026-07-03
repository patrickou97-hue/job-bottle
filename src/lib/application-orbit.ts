import type { ApplicationStatus, ApplicationWithJob } from "@/lib/types";

const TERMINAL = new Set<ApplicationStatus>(["rejected", "withdrawn"]);

export type MomentumTier = "blue" | "neutral" | "red";

export function daysSince(dateLike: string, now = new Date()) {
  const time = new Date(dateLike).getTime();
  if (!Number.isFinite(time)) return 0;
  return Math.max(0, Math.floor((now.getTime() - time) / 86_400_000));
}

export function momentumTier(application: ApplicationWithJob, now = new Date()): MomentumTier {
  if (TERMINAL.has(application.status) || application.status === "offer") return "neutral";
  // FALLBACK-A: user_applications has no status_changed_at yet, so updated_at approximates status age.
  const days = daysSince(application.updated_at, now);
  if (days <= 7) return "blue";
  if (days < 15) return "neutral";
  return "red";
}
