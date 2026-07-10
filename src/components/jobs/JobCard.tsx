"use client";

import Link from "next/link";
import { ArrowUpRight, FileText } from "lucide-react";
import { StatusPill } from "@/components/applications/StatusPill";
import type { MaterialReadiness } from "@/lib/career-workspace";
import { cn } from "@/lib/utils";
import type { Job, UserApplication } from "@/lib/types";

export function JobCard({
  job,
  application,
  deadline = null,
  fitLabel = null,
  material,
  index,
  highlighted = false,
  onApply,
  onOpenProgress,
  onHover,
  onFocusJob,
}: {
  job: Job;
  application?: UserApplication | null;
  deadline?: { label: string; urgent: boolean } | null;
  fitLabel?: string | null;
  material?: MaterialReadiness;
  index?: number;
  highlighted?: boolean;
  onApply: (job: Job) => Promise<void>;
  onOpenProgress?: (job: Job) => void;
  onHover?: (job: Job | null) => void;
  onFocusJob?: (job: Job) => void;
}) {
  return (
    <div
      id={`job-row-${job.id}`}
      className={cn(
        "data-row group grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 text-sm sm:grid-cols-[34px_minmax(0,1fr)_auto] sm:px-4",
        highlighted ? "selected" : "",
      )}
      onMouseEnter={() => onHover?.(job)}
      onMouseLeave={() => onHover?.(null)}
    >
      <span className="text-right text-xs tabular-nums text-[color:var(--text-disabled)]">
        {typeof index === "number" ? String(index + 1).padStart(2, "0") : ""}
      </span>

      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <Link
            href={`/jobs/${job.id}`}
            className="truncate text-[15px] font-semibold leading-6 text-[color:var(--text-primary)] transition hover:text-nebula-silver"
            onFocus={() => onHover?.(job)}
            onBlur={() => onHover?.(null)}
            onClick={() => onFocusJob?.(job)}
          >
            {job.company_name}
          </Link>
          <span className="truncate text-xs text-[color:var(--text-secondary)]">{job.job_titles || "岗位待补充"}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--text-muted)]">
          <span>{job.industry || "暂无行业"}</span>
          <span>{job.locations || "地点待补充"}</span>
          {deadline ? <span className={deadline.urgent ? "text-amber-200" : ""}>{deadline.label}</span> : null}
          {fitLabel ? <span className="text-nebula-silver">{fitLabel}</span> : null}
          {application && material ? (
            <span className={material.ready ? "inline-flex items-center gap-1 text-emerald-200/80" : "inline-flex items-center gap-1"}>
              <FileText aria-hidden="true" className="size-3" />
              {material.label}
            </span>
          ) : null}
        </div>
      </div>

      {application ? (
        <button
          type="button"
          className="job-row-action pressable inline-flex shrink-0 items-center gap-1.5 px-3 py-2 text-xs"
          onClick={() => onOpenProgress?.(job)}
        >
          <StatusPill status={application.status} className="px-2 py-1 text-[11px]" />
          <span className="hidden sm:inline">更新进度</span>
        </button>
      ) : (
        <button
          type="button"
          className="job-row-action pressable inline-flex shrink-0 items-center gap-1.5 px-3 py-2 text-xs"
          onClick={() => {
            onFocusJob?.(job);
            void onApply(job);
          }}
        >
          <ArrowUpRight aria-hidden="true" className="size-4" />
          <span>开始投递</span>
        </button>
      )}
    </div>
  );
}
