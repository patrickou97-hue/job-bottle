export type FreshnessTier = "fresh" | "recent" | "old";

export function daysSinceSignal(dateLike: string, now = new Date()) {
  const time = new Date(dateLike).getTime();
  if (!Number.isFinite(time)) return 999;
  return Math.max(0, (now.getTime() - time) / 86_400_000);
}

export function freshnessTier(dateLike: string, now = new Date()): FreshnessTier {
  const days = daysSinceSignal(dateLike, now);
  if (days < 1) return "fresh";
  if (days <= 7) return "recent";
  return "old";
}

export function signalScore({
  replies,
  lastActivityAt,
  now = new Date(),
}: {
  replies: number;
  lastActivityAt: string;
  now?: Date;
}) {
  const activity = Math.log(Math.max(0, replies) + 1) * Math.exp(-daysSinceSignal(lastActivityAt, now) / 10);
  return Math.max(0, Math.min(5, Math.ceil(activity * 1.6)));
}

export function isFadingSignal(lastActivityAt: string, now = new Date()) {
  return daysSinceSignal(lastActivityAt, now) > 30;
}
