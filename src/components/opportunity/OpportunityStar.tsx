"use client";

import { getCompanyShortLabel, cn } from "@/lib/utils";
import type { ApplicationStatus, Job, UserApplication } from "@/lib/types";

const STATUS_STYLE: Partial<Record<ApplicationStatus, string>> = {
  opened: "shadow-[0_0_18px_rgba(16,38,74,0.28)]",
  applied: "shadow-[0_0_22px_rgba(30,59,102,0.32)]",
  written_test: "ring-1 ring-nebula-blue/28",
  first_round: "ring-2 ring-nebula-blue/24",
  second_round: "ring-2 ring-nebula-silver/28 shadow-[0_0_24px_rgba(243,198,77,0.3)]",
  final_round: "animate-pulse ring-2 ring-nebula-silver/34",
  offer: "shadow-[0_0_30px_rgba(243,198,77,0.38)]",
  rejected: "opacity-45 grayscale",
  withdrawn: "opacity-35",
};

export function OpportunityStar({
  job,
  application,
  label,
  size,
  dimmed = false,
  highlighted = false,
  selected = false,
  onSelect,
  onApply,
  onHover,
  compact = false,
}: {
  job: Job;
  application?: UserApplication | null;
  label?: string;
  size?: number;
  dimmed?: boolean;
  highlighted?: boolean;
  selected?: boolean;
  compact?: boolean;
  onSelect: (job: Job) => void;
  onApply?: (job: Job) => void;
  onHover?: (job: Job | null) => void;
}) {
  const captured = Boolean(application);
  const status = application?.status;
  const starSize = size ?? (compact ? 34 : captured ? 44 : 38);
  const displayLabel = label ?? getCompanyShortLabel(job.company_name, 3);
  const batchRing =
    job.batch_type?.includes("提前") ? "border-dashed" : job.batch_type?.includes("补录") ? "animate-pulse" : "";

  return (
    <div
      className={cn(
        "group relative flex flex-col items-center transition",
        dimmed ? "opacity-26" : "opacity-100",
        highlighted ? "z-20 scale-[1.04]" : "",
      )}
      style={{ width: Math.max(starSize + 28, 68) }}
    >
      <button
        type="button"
        className={cn(
          "pressable relative flex items-center justify-center rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-nebula-silver/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
          dimmed ? "" : "hover:scale-[1.08]",
          captured ? "ring-1 ring-nebula-silver/24" : "ring-1 ring-white/[0.08]",
          selected ? "ring-2 ring-nebula-silver/35" : "",
          highlighted ? "ring-1 ring-nebula-blue/30" : "",
          batchRing,
          status ? STATUS_STYLE[status] : "shadow-[0_0_14px_rgba(243,198,77,0.18)]",
        )}
        style={{
          width: starSize,
          height: starSize,
          background:
            status === "offer"
              ? "radial-gradient(circle at 35% 28%, rgba(255,249,227,0.94), rgba(243,198,77,0.68) 30%, rgba(30,59,102,0.9) 74%)"
              : captured
                ? "radial-gradient(circle at 35% 28%, rgba(255,249,227,0.8), rgba(243,198,77,0.56) 30%, rgba(16,38,74,0.92) 74%)"
                : "radial-gradient(circle at 35% 28%, rgba(216,225,239,0.52), rgba(30,59,102,0.46) 32%, rgba(6,19,40,0.94) 76%)",
        }}
        onClick={() => onSelect(job)}
        onDoubleClick={() => onApply?.(job)}
        onMouseEnter={() => onHover?.(job)}
        onMouseLeave={() => onHover?.(null)}
        onFocus={() => onHover?.(job)}
        onBlur={() => onHover?.(null)}
        aria-label={job.company_name}
        title={`${job.company_name} · ${job.job_titles ?? "岗位"}`}
      >
        <span className="absolute left-[25%] top-[22%] size-1.5 rounded-full bg-[#FFF9E3]/90 shadow-[0_0_10px_rgba(255,249,227,0.48)]" />
        {job.batch_type?.includes("实习") ? (
          <span className="absolute -right-1 top-1 size-1.5 rounded-full bg-nebula-silver/70 shadow-[0_0_8px_rgba(237,242,248,0.38)]" />
        ) : null}
      </button>
      <span className="mt-2 max-w-[82px] truncate whitespace-nowrap text-center text-xs leading-none text-ink-secondary transition group-hover:text-nebula-silver">
        {displayLabel}
      </span>
      <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 hidden w-44 -translate-x-1/2 rounded-2xl bg-[#10264A]/72 px-3 py-2 text-left text-xs leading-5 text-ink-secondary shadow-[0_18px_48px_rgba(0,0,0,0.32)] backdrop-blur-xl group-hover:block group-focus-within:block">
        <span className="block truncate text-nebula-silver">{job.company_name}</span>
        <span className="block truncate text-ink-muted">{job.job_titles || "岗位待补充"}</span>
        <span className="block truncate text-ink-muted">{job.locations || "地点待补充"}</span>
      </span>
    </div>
  );
}
