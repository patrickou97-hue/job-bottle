"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { motionDuration, motionEase } from "@/lib/motion";

export function AppMotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{
        duration: motionDuration.normal,
        ease: motionEase.standard,
      }}
    >
      {children}
    </MotionConfig>
  );
}
