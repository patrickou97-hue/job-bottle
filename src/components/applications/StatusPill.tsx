import { APPLICATION_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@/lib/types";

const statusClassName: Record<ApplicationStatus | "none", string> = {
  none: "bg-white/[0.045] text-ink-muted",
  opened: "bg-nebula-blue/8 text-nebula-silver",
  applied: "bg-nebula-blue/10 text-nebula-silver",
  written_test: "bg-nebula-blue/12 text-nebula-silver",
  first_round: "bg-nebula-blue/14 text-nebula-silver shadow-star-sm",
  second_round: "bg-nebula-blue/16 text-nebula-silver shadow-star-sm",
  final_round: "bg-nebula-silver/12 text-nebula-silver shadow-star-md",
  offer: "bg-aurum-300/14 text-aurum-300 shadow-star-md",
  rejected: "bg-slate-500/15 text-slate-300",
  withdrawn: "bg-stone-500/12 text-stone-300",
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
        "inline-flex w-auto shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium",
        statusClassName[key],
        className,
      )}
    >
      {status ? APPLICATION_STATUS_LABELS[status] : "未收录"}
    </span>
  );
}
