import { APPLICATION_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@/lib/types";

const statusClassName: Record<ApplicationStatus | "none", string> = {
  none: "text-ink-muted",
  opened: "text-nebula-silver",
  applied: "text-nebula-silver",
  written_test: "text-nebula-silver",
  first_round: "text-nebula-silver shadow-star-sm",
  second_round: "text-nebula-silver shadow-star-sm",
  final_round: "text-nebula-silver shadow-star-md",
  offer: "text-aurum-300 shadow-star-md",
  rejected: "text-slate-300",
  withdrawn: "text-stone-300",
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
        "status-pill inline-flex w-auto shrink-0 items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium leading-none",
        statusClassName[key],
        className,
      )}
    >
      {status ? APPLICATION_STATUS_LABELS[status] : "未收录"}
    </span>
  );
}
