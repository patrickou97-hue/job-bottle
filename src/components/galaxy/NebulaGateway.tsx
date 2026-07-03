"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { buildNebulaCategories, buildNebulaGateways, type NebulaCategory, type NebulaMode, type NebulaSelection } from "@/lib/nebula-groups";
import { NebulaNode } from "@/components/galaxy/NebulaNode";
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
  const [mode, setMode] = useState<NebulaMode>("gateway");
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
  const gatewayNodes = useMemo(() => buildNebulaGateways(jobs, userApplications), [jobs, userApplications]);
  const categoryNodes = useMemo(() => {
    if (mode === "gateway") return [];
    return buildNebulaCategories(mode, jobs, userApplications);
  }, [jobs, mode, userApplications]);
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

  function back() {
    if (activeNebula) {
      setActiveNebula(null);
      setSelectedJob(null);
      onSelectionChange(null);
      return;
    }
    setMode("gateway");
    onSelectionChange(null);
  }

  function selectJob(job: Job) {
    setSelectedJob(job);
    onSelectJob(job);
  }

  return (
    <section className="surface-subtle relative overflow-hidden rounded-[28px] p-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink-primary">岗位星体观测</h2>
        </div>
        {mode !== "gateway" ? (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-ink-secondary transition hover:bg-white/[0.04] hover:text-nebula-silver"
            onClick={back}
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            返回星云入口
          </button>
        ) : null}
      </div>

      <AnimatePresence mode="wait">
        {mode === "gateway" ? (
          <motion.div
            key="gateway"
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.42, ease: "easeOut" }}
            className="grid min-h-[520px] items-center gap-5 md:grid-cols-2 xl:grid-cols-4"
          >
            {gatewayNodes.map((node) => (
              <NebulaNode
                key={node.id}
                {...node}
                onClick={() => enterMode(node.id as Exclude<NebulaMode, "gateway">)}
              />
            ))}
          </motion.div>
        ) : activeNebula ? (
          <motion.div
            key={`field-${activeNebula.id}`}
            initial={reducedMotion ? false : { opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.52, ease: "easeOut" }}
            className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]"
          >
            <div>
              <div className="mb-3 flex items-baseline justify-between">
                <span className="text-sm font-medium text-nebula-silver">{activeNebula.name}</span>
                <span className="text-xs text-ink-muted">{activeNebula.count} 个岗位</span>
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
            key={`categories-${mode}`}
            initial={reducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.42, ease: "easeOut" }}
            className="grid min-h-[520px] items-center gap-x-5 gap-y-2 md:grid-cols-2 xl:grid-cols-3"
          >
            {categoryNodes.map((node) => (
              <NebulaNode key={node.id} {...node} compact onClick={() => enterNebula(node)} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
