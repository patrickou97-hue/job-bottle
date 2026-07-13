import { APPLICATION_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@/lib/types";

const statusClassName: Record<ApplicationStatus | "none", string> = {
  none: "text-ink-muted",
  opened: "text-[color:var(--aurora)]",
  applied: "text-[color:var(--aurora)]",
  written_test: "text-[color:var(--aurora)]",
  first_round: "text-[color:var(--aurora)]",
  second_round: "text-[color:var(--aurora)]",
  final_round: "text-[color:var(--aurora)]",
  offer: "text-[color:var(--ok)]",
  rejected: "text-[color:var(--text-danger)]",
  withdrawn: "text-ink-muted",
};

export function StatusPill({
  status,
  label,
  className,
}: {
  status?: ApplicationStatus | null;
  label?: string;
  className?: string;
}) {
  const key = status ?? "none";
  return (
    <span
      className={cn(
        "status-pill inline-flex w-auto shrink-0 items-center whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium leading-none",
        statusClassName[key],
        className,
      )}
    >
      {label ?? (status ? APPLICATION_STATUS_LABELS[status] : "未收录")}
    </span>
  );
}
