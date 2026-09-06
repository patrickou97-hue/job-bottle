"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { getDeadlineInfo, getFitLabel, getMaterialReadiness } from "@/lib/career-workspace";
import { JobCard } from "@/components/jobs/JobCard";
import type { Job, Profile, UserApplication } from "@/lib/types";
import type { ResumeDocument } from "@/lib/resume";

export type VirtualJobListHandle = {
  scrollToJob: (jobId: string) => void;
};

type VirtualJobListProps = {
  jobs: Job[];
  applicationByJobId: Map<string, UserApplication>;
  profile: Profile | null;
  resumes: ResumeDocument[];
  hoveredJobId: string | null;
  focusedJobId: string | null;
  onApply: (job: Job) => Promise<void>;
  onOpenProgress: (job: Job) => void;
  onOpenReferral: (job: Job) => void;
  onHover: (job: Job | null) => void;
  onFocusJob: (job: Job) => void;
};

const ESTIMATED_ROW_HEIGHT = 118;

/**
 * Keeps the browser's native window scroll while mounting only the rows near
 * the viewport. The virtualizer owns the full-height spacer, so filtering,
 * back-navigation, and map-to-row positioning still feel like one list.
 */
export const VirtualJobList = forwardRef<VirtualJobListHandle, VirtualJobListProps>(
  function VirtualJobList({
    jobs,
    applicationByJobId,
    profile,
    resumes,
    hoveredJobId,
    focusedJobId,
    onApply,
    onOpenProgress,
    onOpenReferral,
    onHover,
    onFocusJob,
  }, ref) {
    const listRef = useRef<HTMLDivElement | null>(null);
    const hasMountedJobsRef = useRef(false);
    const [scrollMargin, setScrollMargin] = useState(0);
    const virtualizer = useWindowVirtualizer<HTMLDivElement>({
      count: jobs.length,
      estimateSize: () => ESTIMATED_ROW_HEIGHT,
      getItemKey: (index) => jobs[index]?.id ?? index,
      overscan: 8,
      scrollMargin,
      useFlushSync: false,
      // Keep row positions off the React render path while the user scrolls.
      directDomUpdates: true,
    });

    useLayoutEffect(() => {
      const node = listRef.current;
      if (!node) return;

      const updateScrollMargin = () => {
        setScrollMargin(Math.max(0, node.getBoundingClientRect().top + window.scrollY));
      };

      updateScrollMargin();
      window.addEventListener("resize", updateScrollMargin, { passive: true });
      return () => window.removeEventListener("resize", updateScrollMargin);
    }, []);

    useLayoutEffect(() => {
      if (!listRef.current) return;
      virtualizer.measure();

      // A changed result set should be immediately visible. The first mount
      // is intentionally exempt so browser back/forward scroll restoration
      // and an existing deep link keep their native position.
      if (hasMountedJobsRef.current) {
        const listTop = listRef.current.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: Math.max(0, listTop - 24), behavior: "auto" });
      }
      hasMountedJobsRef.current = true;
    }, [jobs, virtualizer]);

    const scrollToJob = useCallback((jobId: string) => {
      const index = jobs.findIndex((job) => job.id === jobId);
      if (index < 0) return;
      virtualizer.scrollToIndex(index, { align: "center", behavior: "smooth" });
    }, [jobs, virtualizer]);

    useImperativeHandle(ref, () => ({ scrollToJob }), [scrollToJob]);

    const setListRef = useCallback((node: HTMLDivElement | null) => {
      listRef.current = node;
      virtualizer.containerRef(node);
    }, [virtualizer]);

    return (
      <div
        ref={setListRef}
        className="list-surface relative w-full"
        style={{ minHeight: jobs.length ? undefined : 1 }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const job = jobs[virtualRow.index];
          if (!job) return null;

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 top-0 w-full"
            >
              <JobCard
                job={job}
                index={virtualRow.index}
                application={applicationByJobId.get(job.id) ?? null}
                deadline={getDeadlineInfo(job)}
                fitLabel={getFitLabel(job, profile)}
                material={getMaterialReadiness(job.id, resumes)}
                highlighted={hoveredJobId === job.id || focusedJobId === job.id}
                onApply={onApply}
                onOpenProgress={onOpenProgress}
                onOpenReferral={onOpenReferral}
                onHover={onHover}
                onFocusJob={onFocusJob}
              />
            </div>
          );
        })}
      </div>
    );
  },
);
