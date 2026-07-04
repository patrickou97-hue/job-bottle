"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { buildClusterLayout } from "@/lib/star-layout";
import { OpportunityStar } from "@/components/opportunity/OpportunityStar";
import type { Job, UserApplication } from "@/lib/types";

const FIELD_WIDTH = 860;
const FIELD_HEIGHT = 450;

export function NebulaCompanyField({
  jobs,
  applicationByJobId,
  selectedJobId,
  hoveredJobId,
  onSelect,
  onHover,
  onApply,
}: {
  jobs: Job[];
  applicationByJobId: Map<string, UserApplication>;
  selectedJobId?: string | null;
  hoveredJobId?: string | null;
  onSelect: (job: Job) => void;
  onHover: (job: Job | null) => void;
  onApply: (job: Job) => void | Promise<void>;
}) {
  const [expandedJobs, setExpandedJobs] = useState<Job[] | null>(null);
  const positions = useMemo(() => {
    const layout = buildClusterLayout(
      jobs.map((job) => ({
        id: job.id,
        groupKey: "selected",
        companyName: job.company_name,
        status: applicationByJobId.get(job.id)?.status,
      })),
      {
        width: FIELD_WIDTH,
        height: FIELD_HEIGHT,
        cellWidth: 72,
        cellHeight: 72,
        maxVisiblePerCluster: 48,
      },
    );
    const jobById = new Map(jobs.map((job) => [job.id, job]));
    return layout.map((item) => ({ ...item, job: jobById.get(item.id) ?? null }));
  }, [applicationByJobId, jobs]);

  return (
    <div className="relative h-[420px] overflow-hidden bg-black/10 xl:h-[470px]">
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle,rgba(214,228,255,.30)_0_1px,transparent_1.5px)] [background-size:88px_88px]" />
      <div className="absolute inset-8 rounded-full bg-nebula-blue/[0.025] blur-3xl" />
      {positions.map((item) => {
        if (!item.job) {
          const hiddenJobs = (item.hiddenIds ?? [])
            .map((jobId) => jobs.find((job) => job.id === jobId))
            .filter((job): job is Job => Boolean(job));

          return (
            <button
              key={item.id}
              type="button"
              className="absolute flex items-center justify-center rounded-full bg-nebula-blue/8 text-xs font-medium text-ink-secondary shadow-[0_0_18px_rgba(112,143,185,0.12)] transition hover:scale-[1.06] hover:bg-nebula-blue/12 hover:text-nebula-silver"
              style={{
                width: item.size,
                height: item.size,
                left: `calc(${(item.x / FIELD_WIDTH) * 100}% - ${item.size / 2}px)`,
                top: `calc(${(item.y / FIELD_HEIGHT) * 100}% - ${item.size / 2}px)`,
              }}
              onClick={() => setExpandedJobs(hiddenJobs)}
            >
              {item.label}
            </button>
          );
        }

        const active = selectedJobId === item.job.id || hoveredJobId === item.job.id;
        return (
          <div
            key={item.id}
            className="absolute"
            style={{
              left: `calc(${(item.x / FIELD_WIDTH) * 100}% - ${item.size / 2}px)`,
              top: `calc(${(item.y / FIELD_HEIGHT) * 100}% - ${item.size / 2}px)`,
            }}
          >
            <OpportunityStar
              job={item.job}
              application={applicationByJobId.get(item.job.id) ?? null}
              label={item.label}
              size={item.size}
              highlighted={active}
              selected={selectedJobId === item.job.id}
              dimmed={Boolean(hoveredJobId && hoveredJobId !== item.job.id)}
              onSelect={onSelect}
              onHover={onHover}
              onApply={onApply}
            />
          </div>
        );
      })}
      {jobs.length === 0 ? (
        <div className="absolute inset-0 grid place-items-center text-sm text-ink-muted">暂无岗位</div>
      ) : null}
      {expandedJobs ? (
        <div className="absolute inset-x-4 bottom-4 z-40 bg-[#040814]/90 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-nebula-silver">
              还有 {expandedJobs.length} 个岗位
            </span>
            <button
              type="button"
              className="rounded-full p-1.5 text-ink-muted transition hover:bg-white/[0.05] hover:text-nebula-silver"
              onClick={() => setExpandedJobs(null)}
              aria-label="关闭聚合岗位"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
          <div className="max-h-52 overflow-y-auto pr-1">
            {expandedJobs.map((job) => (
              <button
                key={job.id}
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left text-sm transition hover:bg-white/[0.04]"
                onClick={() => {
                  setExpandedJobs(null);
                  onSelect(job);
                }}
              >
                <span className="min-w-0">
                  <span className="block truncate text-ink-primary">{job.company_name}</span>
                  <span className="block truncate text-xs text-ink-muted">{job.job_titles || "岗位待补充"}</span>
                </span>
                <span className="shrink-0 text-xs text-ink-muted">{job.locations || "暂无地点"}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
