"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Building2, BriefcaseBusiness, MapPin, Orbit, X } from "lucide-react";
import { buildNebulaCategories, type NebulaCategory, type NebulaMode, type NebulaSelection } from "@/lib/nebula-groups";
import { NebulaDistributionMap } from "@/components/galaxy/NebulaDistributionMap";
import { NebulaCompanyField } from "@/components/galaxy/NebulaCompanyField";
import { NebulaDetailWindow } from "@/components/galaxy/NebulaDetailWindow";
import type { ApplicationWithJob, Job, UserApplication } from "@/lib/types";

export function NebulaGateway({
  jobs,
  applications,
  applicationByJobId,
  selectedJobId,
  focusedJobId,
  hoveredJobId,
  onSelectJob,
  onHoverJob,
  onApply,
  onSelectionChange,
}: {
  jobs: Job[];
  applications: ApplicationWithJob[];
  applicationByJobId: Map<string, UserApplication>;
  selectedJobId?: string | null;
  focusedJobId?: string | null;
  hoveredJobId?: string | null;
  onSelectJob: (job: Job) => void;
  onHoverJob: (job: Job | null) => void;
  onApply: (job: Job) => void | Promise<void>;
  onSelectionChange: (selection: NebulaSelection | null) => void;
}) {
  const reducedMotion = useReducedMotion();
  const [mode, setMode] = useState<Exclude<NebulaMode, "gateway">>("industry");
  const [activeNebula, setActiveNebula] = useState<NebulaCategory | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const userApplications = useMemo<UserApplication[]>(
    () =>
      applications.map((application) => ({
        id: application.id,
        user_id: application.user_id,
        job_id: application.job_id,
        status: application.status,
        progress_note: application.progress_note,
        applied_at: application.applied_at,
        updated_at: application.updated_at,
      })),
    [applications],
  );
  const categoryNodes = useMemo(() => buildNebulaCategories(mode, jobs, userApplications), [jobs, mode, userApplications]);
  const activeJobs = useMemo(() => {
    if (!activeNebula) return [];
    const ids = new Set(activeNebula.jobIds);
    return jobs.filter((job) => ids.has(job.id));
  }, [activeNebula, jobs]);
  const focusedJob = focusedJobId ? activeJobs.find((job) => job.id === focusedJobId) ?? null : null;
  const detailJob =
    selectedJob && activeJobs.some((job) => job.id === selectedJob.id)
      ? selectedJob
      : focusedJob;

  function enterMode(nextMode: Exclude<NebulaMode, "gateway">) {
    setMode(nextMode);
    setActiveNebula(null);
    setSelectedJob(null);
    onSelectionChange(null);
  }

  function enterNebula(nebula: NebulaCategory) {
    setActiveNebula(nebula);
    setSelectedJob(null);
    onSelectionChange({ id: nebula.id, name: nebula.name, mode, jobIds: nebula.jobIds });
  }

  function clearSelection() {
    setActiveNebula(null);
    setSelectedJob(null);
    onSelectionChange(null);
  }

  function selectJob(job: Job) {
    setSelectedJob(job);
    onSelectJob(job);
  }

  return (
    <section className="relative overflow-hidden border-y border-white/[0.1] py-5">
      <div className="flex flex-col gap-4 border-b border-white/[0.08] pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex w-fit bg-black/15 p-1" aria-label="岗位地图维度">
          {MAP_MODES.map((item) => {
            const Icon = item.icon;
            const active = mode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={active ? "pressable inline-flex h-9 items-center gap-1.5 bg-white/[0.1] px-3 text-xs text-ink-primary" : "pressable inline-flex h-9 items-center gap-1.5 px-3 text-xs text-ink-muted hover:text-ink-primary"}
                onClick={() => enterMode(item.id)}
                aria-pressed={active}
              >
                <Icon aria-hidden="true" className="size-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>
        {activeNebula ? (
          <button
            type="button"
            className="text-action pressable inline-flex w-fit items-center gap-2 px-3 py-1.5 text-xs"
            onClick={clearSelection}
          >
            <X aria-hidden="true" className="size-4" />
            清除选区
          </button>
        ) : null}
      </div>

      <AnimatePresence mode="wait">
        {activeNebula ? (
          <motion.div
            key={`field-${activeNebula.id}`}
            initial={reducedMotion ? false : { opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.52, ease: "easeOut" }}
            className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]"
          >
            <div>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-nebula-silver">{activeNebula.name} · 公司分布</span>
                <span className="text-xs text-ink-muted">下方清单同步显示 {activeNebula.count} 个岗位</span>
              </div>
              <NebulaCompanyField
                jobs={activeJobs}
                applicationByJobId={applicationByJobId}
                selectedJobId={focusedJobId ?? selectedJobId ?? detailJob?.id}
                hoveredJobId={hoveredJobId}
                onSelect={selectJob}
                onHover={onHoverJob}
                onApply={onApply}
              />
            </div>
            <NebulaDetailWindow
              job={detailJob}
              application={detailJob ? applicationByJobId.get(detailJob.id) ?? null : null}
              onApply={onApply}
            />
          </motion.div>
        ) : (
          <motion.div
            key={`distribution-${mode}`}
            initial={reducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.42, ease: "easeOut" }}
            className="pt-5"
          >
            <NebulaDistributionMap nodes={categoryNodes} onSelect={enterNebula} />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

const MAP_MODES = [
  { id: "region", label: "地区", icon: MapPin },
  { id: "industry", label: "行业", icon: Building2 },
  { id: "category", label: "职能", icon: BriefcaseBusiness },
  { id: "captured", label: "我的投递", icon: Orbit },
] satisfies Array<{ id: Exclude<NebulaMode, "gateway">; label: string; icon: typeof MapPin }>;
