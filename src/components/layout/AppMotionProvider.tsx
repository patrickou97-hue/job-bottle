"use client";

import { useEffect, type ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { motionDuration, motionEase } from "@/lib/motion";

export function AppMotionProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const update = () => { document.documentElement.dataset.motionPaused = String(document.hidden); };
    update();
    document.addEventListener("visibilitychange", update);
    return () => { document.removeEventListener("visibilitychange", update); delete document.documentElement.dataset.motionPaused; };
  }, []);
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
