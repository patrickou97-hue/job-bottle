"use client";

import { useEffect } from "react";
import { getCompactCompanyLabelStyle, getCompanyInitials } from "@/lib/utils";
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
  const labelStyle = getCompactCompanyLabelStyle(label, 42, {
    minFontSize: 7,
    maxFontSize: 13,
    widthRatio: 0.66,
    heightRatio: 0.58,
  });

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      <div className="capture-ring" />
      <div className="capture-star">
        <span
          className="flex min-w-0 items-center justify-center overflow-hidden text-center"
          style={labelStyle}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
