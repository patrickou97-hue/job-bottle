import { JobCard } from "@/components/jobs/JobCard";
import type { Job, UserApplication } from "@/lib/types";

export function OpportunitySignalList({
  jobs,
  applicationByJobId,
  onApply,
  onOpenProgress,
  hoveredJobId,
  focusedJobId,
  onHoverJob,
  onFocusJob,
}: {
  jobs: Job[];
  applicationByJobId: Map<string, UserApplication>;
  onApply: (job: Job) => Promise<void> | void;
  onOpenProgress?: (job: Job) => void;
  hoveredJobId?: string | null;
  focusedJobId?: string | null;
  onHoverJob?: (job: Job | null) => void;
  onFocusJob?: (job: Job) => void;
}) {
  return (
    <section className="overflow-hidden">
      <div className="px-4 py-3 text-sm font-medium text-ink-secondary">
        岗位列表
      </div>
      <div className="divide-y divide-white/[0.04]">
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            application={applicationByJobId.get(job.id) ?? null}
            highlighted={hoveredJobId === job.id || focusedJobId === job.id}
            onApply={async (target) => {
              await onApply(target);
            }}
            onOpenProgress={onOpenProgress}
            onHover={onHoverJob}
            onFocusJob={onFocusJob}
          />
        ))}
      </div>
    </section>
  );
}
