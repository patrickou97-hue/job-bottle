import { APPLICATION_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@/lib/types";

const statusClassName: Record<ApplicationStatus | "none", string> = {
  none: "border-ink-muted/25 bg-white/5 text-ink-muted",
  opened: "border-nebula-blue/20 bg-nebula-blue/8 text-nebula-silver",
  applied: "border-nebula-blue/28 bg-nebula-blue/10 text-nebula-silver",
  written_test: "border-nebula-blue/34 bg-nebula-blue/12 text-nebula-silver",
  first_round: "border-nebula-blue/40 bg-nebula-blue/14 text-nebula-silver shadow-star-sm",
  second_round: "border-nebula-silver/42 bg-nebula-blue/16 text-nebula-silver shadow-star-sm",
  final_round: "border-nebula-silver/55 bg-nebula-silver/12 text-nebula-silver shadow-star-md",
  offer: "border-aurum-300/55 bg-aurum-300/14 text-aurum-300 shadow-star-md",
  rejected: "border-slate-500/35 bg-slate-500/15 text-slate-300",
  withdrawn: "border-stone-500/35 bg-stone-500/12 text-stone-300",
};

export function StatusPill({
  status,
  className,
}: {
  status?: ApplicationStatus | null;
  className?: string;
}) {
  const key = status ?? "none";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        statusClassName[key],
        className,
      )}
    >
      {status ? APPLICATION_STATUS_LABELS[status] : "未收录"}
    </span>
  );
}
