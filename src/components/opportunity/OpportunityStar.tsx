"use client";

import { getCompactCompanyLabelStyle, getCompanyShortLabel, cn } from "@/lib/utils";
import type { ApplicationStatus, Job, UserApplication } from "@/lib/types";

const STATUS_STYLE: Partial<Record<ApplicationStatus, string>> = {
  opened: "shadow-[0_0_18px_rgba(126,158,214,0.22)]",
  applied: "shadow-[0_0_22px_rgba(165,190,224,0.28)]",
  written_test: "ring-1 ring-nebula-blue/28",
  first_round: "ring-2 ring-nebula-blue/24",
  second_round: "ring-2 ring-nebula-silver/28 shadow-[0_0_24px_rgba(165,190,224,0.26)]",
  final_round: "animate-pulse ring-2 ring-nebula-silver/34",
  offer: "shadow-[0_0_30px_rgba(222,197,137,0.28)]",
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
  const labelStyle = getCompactCompanyLabelStyle(displayLabel, starSize, {
    minFontSize: 6,
    maxFontSize: 10,
    widthRatio: 0.62,
    heightRatio: 0.54,
  });
  const batchRing =
    job.batch_type?.includes("提前") ? "border-dashed" : job.batch_type?.includes("补录") ? "animate-pulse" : "";

  return (
    <button
      type="button"
      className={cn(
        "group relative flex items-center justify-center rounded-full font-medium outline-none transition",
        dimmed ? "opacity-26" : "opacity-100 hover:scale-[1.08]",
        captured ? "border border-nebula-silver/28" : "border border-white/[0.08]",
        selected ? "ring-2 ring-nebula-silver/35" : "",
        highlighted ? "z-20 scale-[1.08] ring-1 ring-nebula-blue/30" : "",
        batchRing,
        status ? STATUS_STYLE[status] : "shadow-[0_0_14px_rgba(112,143,185,0.14)]",
      )}
      style={{
        width: starSize,
        height: starSize,
        background:
          status === "offer"
            ? "radial-gradient(circle at 35% 28%, rgba(255,250,224,0.9), rgba(196,171,102,0.56) 30%, rgba(18,16,28,0.88) 74%)"
            : captured
              ? "radial-gradient(circle at 35% 28%, rgba(255,255,255,0.76), rgba(126,158,214,0.48) 30%, rgba(11,17,31,0.9) 74%)"
              : "radial-gradient(circle at 35% 28%, rgba(226,236,252,0.48), rgba(75,100,138,0.34) 32%, rgba(8,13,25,0.92) 76%)",
      }}
      onClick={() => onSelect(job)}
      onDoubleClick={() => onApply?.(job)}
      onMouseEnter={() => onHover?.(job)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(job)}
      onBlur={() => onHover?.(null)}
      aria-label={`${job.company_name} 星体`}
      title={`${job.company_name} · ${job.job_titles ?? "岗位"}`}
    >
      <span
        className="relative z-10 flex min-w-0 items-center justify-center overflow-hidden text-center tracking-normal text-nebula-silver/88"
        style={labelStyle}
      >
        {displayLabel}
      </span>
      {job.batch_type?.includes("实习") ? (
        <span className="absolute -right-1 top-1 size-1.5 rounded-full bg-nebula-silver/70 shadow-[0_0_8px_rgba(226,236,252,0.35)]" />
      ) : null}
      <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 hidden w-44 -translate-x-1/2 rounded-2xl border border-white/[0.06] bg-[#040814]/72 px-3 py-2 text-left text-xs leading-5 text-ink-secondary shadow-[0_18px_48px_rgba(0,0,0,0.38)] backdrop-blur-xl group-hover:block group-focus:block">
        <span className="block truncate text-nebula-silver">{job.company_name}</span>
        <span className="block truncate text-ink-muted">{job.job_titles || "岗位待补充"}</span>
        <span className="block truncate text-ink-muted">{job.locations || "地点待补充"}</span>
      </span>
    </button>
  );
}
