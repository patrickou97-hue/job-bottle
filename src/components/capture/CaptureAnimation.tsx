"use client";

import { useEffect } from "react";
import { motion, useReducedMotion } from "motion/react";
import { motionDuration, motionEase } from "@/lib/motion";
import { getCompactCompanyLabelStyle, getCompanyInitials } from "@/lib/utils";
import type { Job } from "@/lib/types";

export function CaptureAnimation({
  job,
  onDone,
}: {
  job: Job | null;
  onDone: () => void;
}) {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!job) return;
    const timer = window.setTimeout(
      onDone,
      reducedMotion ? motionDuration.fast * 1000 + 80 : motionDuration.immersive * 1000 + 60,
    );
    return () => window.clearTimeout(timer);
  }, [job, onDone, reducedMotion]);

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
      <motion.div
        className="capture-ring"
        initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.38 }}
        animate={{
          opacity: reducedMotion ? [0, 0.42, 0] : [0, 0.82, 0],
          scale: reducedMotion ? 1 : [0.38, 1, 1.45],
        }}
        transition={{
          duration: reducedMotion ? motionDuration.fast : 0.82,
          ease: motionEase.standard,
          times: reducedMotion ? [0, 0.45, 1] : [0, 0.24, 1],
        }}
      />
      <motion.div
        className="capture-star"
        initial={{ opacity: 0, x: 0, y: 0, scale: reducedMotion ? 1 : 0.65 }}
        animate={reducedMotion
          ? { opacity: [0, 1, 0] }
          : {
              opacity: [0, 1, 0],
              x: [0, -8, "34vw"],
              y: [0, -12, "-34vh"],
              scale: [0.65, 1.08, 0.36],
            }}
        transition={{
          duration: reducedMotion ? motionDuration.fast : motionDuration.immersive,
          ease: motionEase.emphasized,
          times: [0, 0.18, 1],
        }}
      >
        <span
          className="flex min-w-0 items-center justify-center overflow-hidden text-center"
          style={labelStyle}
        >
          {label}
        </span>
      </motion.div>
    </div>
  );
}
