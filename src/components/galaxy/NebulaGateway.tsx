"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CirclesThreePlusIcon, ListBulletsIcon, XIcon } from "@phosphor-icons/react";
import { buildNebulaCategories, type NebulaCategory, type NebulaMode, type NebulaSelection } from "@/lib/nebula-groups";
import { NebulaDistributionMap } from "@/components/galaxy/NebulaDistributionMap";
import { NebulaCompanyField } from "@/components/galaxy/NebulaCompanyField";
import { NebulaDetailWindow } from "@/components/galaxy/NebulaDetailWindow";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
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
  const [showCompanyField, setShowCompanyField] = useState(false);
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
    setShowCompanyField(false);
    onSelectionChange(null);
  }

  function enterNebula(nebula: NebulaCategory) {
    setActiveNebula(nebula);
    setSelectedJob(null);
    setShowCompanyField(false);
    onSelectionChange({ id: nebula.id, name: nebula.name, mode, jobIds: nebula.jobIds });
  }

  function clearSelection() {
    setActiveNebula(null);
    setSelectedJob(null);
    setShowCompanyField(false);
    onSelectionChange(null);
  }

  function selectJob(job: Job) {
    setSelectedJob(job);
    onSelectJob(job);
  }

  return (
    <section className="relative min-h-[34rem] overflow-hidden rounded-[20px] border border-white/[0.08] bg-black/10 px-3 pb-24 pt-5 sm:px-5">
      <div className="flex min-h-11 justify-end">
        {activeNebula ? (
          <button
            type="button"
            className="text-action pressable inline-flex w-fit items-center gap-2 px-3 py-1.5 text-xs"
            onClick={clearSelection}
          >
            <XIcon aria-hidden="true" className="size-4" weight="bold" />
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
            className="relative min-h-[31rem] pt-1"
          >
            <div className="flex min-h-64 flex-col items-center justify-center">
              <motion.div
                initial={reducedMotion ? false : { scale: 0.72, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 120, damping: 22 }}
                className="relative h-56 w-full max-w-2xl sm:h-64"
              >
                <Image src={activeNebula.imageSrc} alt="" fill sizes="(max-width: 768px) 90vw, 640px" className="object-contain drop-shadow-[0_0_42px_rgba(126,124,181,.24)]" />
              </motion.div>
              <p className="-mt-4 text-lg font-semibold text-ink-primary">{activeNebula.name}</p>
              <p className="mt-1 text-xs text-ink-muted">{activeNebula.count} 个岗位</p>
            </div>
            <div className={`liquid-panel mt-5 grid overflow-hidden md:grid-cols-[minmax(0,1fr)_310px] ${showCompanyField ? "max-h-[30rem]" : "max-h-[16rem]"}`}>
              <div className="overflow-y-auto">
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.08] bg-[rgba(13,27,52,.92)] px-4 py-3 backdrop-blur-xl">
                  <span className="text-sm font-semibold text-ink-primary">{activeNebula.name}岗位</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-ink-muted">{activeJobs.length} 个结果</span>
                    <button
                      type="button"
                      className="pressable inline-flex min-h-8 items-center gap-1.5 rounded-[8px] border border-white/[0.08] bg-white/[0.05] px-2.5 text-xs text-ink-secondary hover:bg-white/[0.09] hover:text-ink-primary"
                      onClick={() => setShowCompanyField((visible) => !visible)}
                    >
                      {showCompanyField ? <ListBulletsIcon className="size-3.5" weight="bold" /> : <CirclesThreePlusIcon className="size-3.5" weight="bold" />}
                      {showCompanyField ? "岗位列表" : "公司星体"}
                    </button>
                  </div>
                </div>
                {showCompanyField ? (
                  <NebulaCompanyField
                    jobs={activeJobs}
                    applicationByJobId={applicationByJobId}
                    selectedJobId={selectedJob?.id ?? selectedJobId ?? focusedJobId}
                    hoveredJobId={hoveredJobId}
                    onSelect={selectJob}
                    onHover={onHoverJob}
                    onApply={onApply}
                  />
                ) : activeJobs.slice(0, 12).map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    className="data-row grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 text-left"
                    onClick={() => selectJob(job)}
                    onMouseEnter={() => onHoverJob(job)}
                    onMouseLeave={() => onHoverJob(null)}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink-primary">{job.job_titles || "招聘岗位"}</span>
                      <span className="mt-1 block truncate text-xs text-ink-muted">{job.company_name} · {job.locations || "地点待确认"}</span>
                    </span>
                    <span className="text-xs text-ink-muted">查看</span>
                  </button>
                ))}
              </div>
              <div className="hidden border-l border-white/[0.08] md:block">
                <NebulaDetailWindow
                  job={detailJob}
                  application={detailJob ? applicationByJobId.get(detailJob.id) ?? null : null}
                  onApply={onApply}
                />
              </div>
            </div>
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

      <div className="pointer-events-none absolute inset-x-0 bottom-5 z-30 flex justify-center px-3">
        <div className="apple-dock pointer-events-auto max-w-full overflow-x-auto">
          <SegmentedControl
            ariaLabel="岗位地图维度"
            className="border-0 bg-transparent shadow-none"
            options={MAP_MODES}
            value={mode}
            onChange={enterMode}
          />
        </div>
      </div>
    </section>
  );
}

const MAP_MODES = [
  { value: "region", label: "地区" },
  { value: "industry", label: "行业" },
  { value: "category", label: "职能" },
  { value: "captured", label: "我的投递" },
] satisfies Array<{ value: Exclude<NebulaMode, "gateway">; label: string }>;
