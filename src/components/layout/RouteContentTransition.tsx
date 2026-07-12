"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { motionDuration, motionEase, pageVariants } from "@/lib/motion";

export function RouteContentTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();

  return (
    <AnimatePresence initial={false} mode="popLayout">
      <motion.main
        key={pathname}
        className="mx-auto w-full max-w-[1320px] px-4 pb-24 pt-8 sm:px-6 md:pb-10 lg:px-8 lg:py-10"
        variants={reducedMotion ? undefined : pageVariants}
        initial={reducedMotion ? { opacity: 0 } : "initial"}
        animate={reducedMotion ? { opacity: 1 } : "enter"}
        exit={reducedMotion ? { opacity: 0 } : "exit"}
        transition={{
          duration: reducedMotion ? motionDuration.instant : motionDuration.normal,
          ease: reducedMotion ? motionEase.standard : motionEase.enter,
        }}
      >
        {children}
      </motion.main>
    </AnimatePresence>
  );
}
