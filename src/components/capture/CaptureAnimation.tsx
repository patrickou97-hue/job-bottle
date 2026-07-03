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
  const label = getCompanyInitials(job.company_name);
  const fontSize = Array.from(label).length >= 4 ? 11 : 14;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      <div className="capture-ring" />
      <div className="capture-star">
        <span
          className="flex max-w-[76%] items-center justify-center break-all text-center leading-[0.9]"
          style={{ fontSize }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
