"use client";

import { useMemo, useState } from "react";
import { classifyJob } from "@/lib/galaxy-taxonomy";
import { buildClusterLayout } from "@/lib/star-layout";
import { OpportunityStar } from "@/components/opportunity/OpportunityStar";
import { OpportunityDetailPanel } from "@/components/opportunity/OpportunityDetailPanel";
import type { GalaxyKind } from "@/lib/galaxy-taxonomy";
import type { Job, UserApplication } from "@/lib/types";

const STARFIELD_WIDTH = 1040;
const STARFIELD_HEIGHT = 520;

export function OpportunityStarfield({
  jobs,
  applicationByJobId,
  onApply,
  kind,
  title = "岗位星图",
  hoveredJobId,
  focusedJobId,
  onHoverJob,
  onFocusJob,
}: {
  jobs: Job[];
  applicationByJobId: Map<string, UserApplication>;
  onApply: (job: Job) => void | Promise<void>;
  kind?: GalaxyKind;
  title?: string;
  hoveredJobId?: string | null;
  focusedJobId?: string | null;
  onHoverJob?: (job: Job | null) => void;
  onFocusJob?: (job: Job) => void;
}) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(jobs[0] ?? null);

  const groupLabels = useMemo(() => {
    const groups = new Map<string, string>();
    jobs.forEach((job) => {
      const group = kind ? classifyJob(job, kind) : null;
      groups.set(group?.slug ?? "all", group?.label ?? "当前结果");
    });
    return groups;
  }, [jobs, kind]);

  const starPositions = useMemo(() => {
    const layoutInput = jobs.map((job) => {
      const group = kind ? classifyJob(job, kind) : null;
      const application = applicationByJobId.get(job.id);
      return {
        id: job.id,
        groupKey: group?.slug ?? "all",
        companyName: job.company_name,
        status: application?.status,
      };
    });
    const layout = buildClusterLayout(layoutInput, {
      width: STARFIELD_WIDTH,
      height: STARFIELD_HEIGHT,
      cellWidth: 70,
      cellHeight: 76,
      maxVisiblePerCluster: 12,
    });
    const jobById = new Map(jobs.map((job) => [job.id, job]));
    return layout.map((item) => ({ ...item, job: jobById.get(item.id) ?? null }));
  }, [applicationByJobId, jobs, kind]);

  const clusterLabels = useMemo(() => {
    const labels = new Map<string, { groupKey: string; label: string; x: number; y: number; count: number }>();
    starPositions.forEach((item) => {
      const current = labels.get(item.groupKey) ?? {
        groupKey: item.groupKey,
        label: groupLabels.get(item.groupKey) ?? item.groupKey,
        x: 0,
        y: 0,
        count: 0,
      };
      current.x += item.x;
      current.y += item.y;
      current.count += 1;
      labels.set(item.groupKey, current);
    });
    return [...labels.values()].map((item) => ({
      ...item,
      x: item.x / item.count,
      y: item.y / item.count,
    }));
  }, [groupLabels, starPositions]);

  function selectJob(job: Job) {
    setSelectedJob(job);
    onFocusJob?.(job);
  }

  function focusAggregate(hiddenIds?: string[]) {
    const target = hiddenIds ? jobs.find((job) => hiddenIds.includes(job.id)) : null;
    if (target) selectJob(target);
  }

  const visibleStarCount = starPositions.filter((item) => item.job).length;
  const aggregateCount = starPositions.reduce((count, item) => count + (item.aggregateCount ?? 0), 0);

  const detailJob = selectedJob && jobs.some((job) => job.id === selectedJob.id) ? selectedJob : jobs[0] ?? null;
  const selectedJobId = focusedJobId ?? detailJob?.id ?? null;

  const statusText = useMemo(() => {
    if (aggregateCount === 0) return `${visibleStarCount} 颗岗位星`;
    return `${visibleStarCount} 颗亮星，${aggregateCount} 颗暗星已聚合`;
  }, [aggregateCount, visibleStarCount]);

  return (
    <section className="relative overflow-hidden p-1">
      <div className="section-heading mb-4">
        <div>
          <h2 className="section-title">{title}</h2>
        </div>
        <span className="text-xs text-ink-muted">{statusText}</span>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="relative h-[420px] overflow-hidden rounded-[18px] bg-black/10 xl:h-[520px]">
          <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle,rgba(201,197,228,.26)_0_1px,transparent_1.5px)] [background-size:96px_96px]" />
          {clusterLabels.map((cluster) => (
            <span
              key={cluster.groupKey}
              className="pointer-events-none absolute rounded-full bg-white/[0.025] px-2.5 py-1 text-[11px] text-ink-muted/70"
              style={{
                left: `${(cluster.x / STARFIELD_WIDTH) * 100}%`,
                top: `${(cluster.y / STARFIELD_HEIGHT) * 100}%`,
                transform: "translate(-50%, -170%)",
              }}
            >
              {cluster.label}
            </span>
          ))}
          {starPositions.map((item) => {
            if (!item.job) {
              return (
                <button
                  key={item.id}
                  type="button"
                  className="absolute flex items-center justify-center rounded-full bg-nebula-blue/8 text-xs font-medium text-ink-secondary shadow-[0_0_18px_rgba(126,124,181,0.16)] transition hover:scale-[1.05] hover:bg-nebula-blue/12 hover:text-nebula-silver"
                  style={{
                    width: item.size,
                    height: item.size,
                    left: `calc(${(item.x / STARFIELD_WIDTH) * 100}% - ${item.size / 2}px)`,
                    top: `calc(${(item.y / STARFIELD_HEIGHT) * 100}% - ${item.size / 2}px)`,
                  }}
                  onClick={() => focusAggregate(item.hiddenIds)}
                  title={`${groupLabels.get(item.groupKey) ?? item.groupKey} 还有 ${item.aggregateCount} 个岗位`}
                >
                  {item.label}
                </button>
              );
            }
            const application = applicationByJobId.get(item.job.id) ?? null;
            const highlighted = hoveredJobId === item.job.id || selectedJobId === item.job.id;
            return (
              <div
                key={item.id}
                className="absolute"
                style={{
                  left: `${(item.x / STARFIELD_WIDTH) * 100}%`,
                  top: `calc(${(item.y / STARFIELD_HEIGHT) * 100}% - ${item.size / 2}px)`,
                  transform: "translateX(-50%)",
                }}
              >
                <OpportunityStar
                  job={item.job}
                  application={application}
                  label={item.label}
                  size={item.size}
                  dimmed={Boolean(hoveredJobId && hoveredJobId !== item.job.id)}
                  highlighted={highlighted}
                  selected={selectedJobId === item.job.id}
                  onSelect={selectJob}
                  onApply={onApply}
                  onHover={onHoverJob}
                />
              </div>
            );
          })}
          {jobs.length === 0 ? (
            <div className="absolute inset-0 grid place-items-center text-sm text-ink-muted">暂无岗位</div>
          ) : null}
        </div>

        <OpportunityDetailPanel
          job={detailJob}
          application={detailJob ? applicationByJobId.get(detailJob.id) ?? null : null}
          onApply={onApply}
        />
      </div>
    </section>
  );
}
