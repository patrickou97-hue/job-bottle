import { getDeadlineLabel, getDeadlineTone, getJobDeadline } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { Job } from "@/lib/types";

const TONE_CLASS = {
  none: "border-white/[0.07] text-ink-muted",
  passed: "border-white/[0.08] text-ink-muted",
  neutral: "border-white/[0.1] text-ink-secondary",
  amber: "border-[color:var(--warn)]/40 text-[color:var(--warn)]",
  coral: "border-[color:var(--danger)]/40 text-[color:var(--danger)]",
  urgent: "border-[color:var(--danger)]/50 text-[color:var(--danger)] motion-safe:animate-pulse",
} as const;

export function DeadlineChip({ job, compact = false }: { job: Job; compact?: boolean }) {
  const deadline = getJobDeadline(job);
  const tone = getDeadlineTone(deadline);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border bg-white/[0.025] tabular-nums",
        compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        TONE_CLASS[tone],
      )}
      title={deadline ? `截止时间：${deadline}` : "暂无截止时间"}
    >
      {getDeadlineLabel(deadline)}
    </span>
  );
}
