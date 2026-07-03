"use client";

import { useEffect } from "react";
import { getCompanyInitials } from "@/lib/utils";
import type { Job } from "@/lib/types";

export function CaptureAnimation({
  job,
  onDone,
}: {
  job: Job | null;
  onDone: () => void;
}) {
  useEffect(() => {
    if (!job) return;
    const timer = window.setTimeout(onDone, 980);
    return () => window.clearTimeout(timer);
  }, [job, onDone]);

  if (!job) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      <div className="capture-ring" />
      <div className="capture-star">
        <span>{getCompanyInitials(job.company_name)}</span>
      </div>
    </div>
  );
}
