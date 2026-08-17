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
  custom = false,
  className,
}: {
  status?: ApplicationStatus | null;
  label?: string;
  custom?: boolean;
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
      data-status={key}
      data-custom={custom ? "true" : "false"}
    >
      {custom ? <span aria-hidden="true" className="mr-1 size-1.5 rotate-45 rounded-[1px] bg-current" /> : null}
      {label ?? (status ? APPLICATION_STATUS_LABELS[status] : "未收录")}
    </span>
  );
}
