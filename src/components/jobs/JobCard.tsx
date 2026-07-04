"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { DeadlineChip } from "@/components/jobs/DeadlineChip";
import { StatusPill } from "@/components/applications/StatusPill";
import { cn } from "@/lib/utils";
import type { Job, UserApplication } from "@/lib/types";

export function JobCard({
  job,
  application,
  index,
  highlighted = false,
  onApply,
  onOpenProgress,
  onHover,
  onFocusJob,
}: {
  job: Job;
  application?: UserApplication | null;
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
        "data-row group grid cursor-pointer grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 px-4 text-sm md:grid-cols-[34px_minmax(0,1fr)_112px_auto]",
        highlighted ? "selected" : "",
      )}
      role="button"
      tabIndex={0}
      onClick={() => {
        onFocusJob?.(job);
        if (application && onOpenProgress) {
          onOpenProgress(job);
          return;
        }
        onApply(job);
      }}
      onMouseEnter={() => onHover?.(job)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(job)}
      onBlur={() => onHover?.(null)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          (e.currentTarget as HTMLElement).click();
        }
      }}
    >
      <span className="text-right text-xs tabular-nums text-[color:var(--text-disabled)]">
        {typeof index === "number" ? String(index + 1).padStart(2, "0") : ""}
      </span>

      {/* Company + industry */}
      <div className="min-w-0">
        <div className="flex min-w-0 items-baseline gap-3">
          <Link
            href={`/jobs/${job.id}`}
            className="truncate text-[15px] font-medium leading-6 text-[color:var(--text-primary)] transition hover:text-nebula-silver"
            onClick={(event) => event.stopPropagation()}
          >
            {job.company_name}
          </Link>
          <span className="hidden truncate text-xs text-[color:var(--text-muted)] md:inline">
            {job.job_titles || "岗位待补充"}
          </span>
        </div>
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-[color:var(--text-muted)]">
          <span className="truncate">{job.industry || "暂无行业"}</span>
          <span className="text-[color:var(--text-disabled)]">·</span>
          <span className="truncate">{job.locations || "地点待补充"}</span>
          <span className="text-[color:var(--text-disabled)]">·</span>
          <span className="shrink-0">{job.batch_type || "暂无批次"}</span>
          <span className="hidden text-[color:var(--text-disabled)] sm:inline">·</span>
          <span className="hidden shrink-0 sm:inline">{job.start_date || "时间待补充"}</span>
        </div>
      </div>

      <div className="hidden justify-self-end md:block">
        <DeadlineChip job={job} compact />
      </div>

      {/* Status or apply */}
      {application ? (
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[rgba(159,180,206,0.18)] px-3 py-1 text-xs text-[color:var(--light-silver)] transition hover:bg-[color:var(--surface-hover-bg)]"
          onClick={(e) => {
            e.stopPropagation();
            onOpenProgress?.(job);
          }}
        >
          <StatusPill status={application.status} />
          <span className="hidden sm:inline">查看进度</span>
        </button>
      ) : (
        <span className="inline-flex shrink-0 items-center gap-1 text-xs text-[color:var(--text-muted)] transition-colors group-hover:text-[color:var(--light-silver)]">
          <ExternalLink aria-hidden="true" className="size-4" />
          <span className="hidden sm:inline">去官网投递</span>
        </span>
      )}
    </div>
  );
}
