"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { motionDuration, motionEase, pageVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function RouteContentTransition({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();

  return (
    <motion.main
      key={pathname}
      id="main-content"
      tabIndex={-1}
      className={cn(
        "mx-auto w-full max-w-[1320px] px-4 pb-24 pt-8 sm:px-6 md:pb-10 lg:px-8 lg:py-10",
        className,
      )}
      variants={reducedMotion ? undefined : pageVariants}
      initial={reducedMotion ? false : "initial"}
      animate={reducedMotion ? { opacity: 1 } : "enter"}
      transition={{
        duration: reducedMotion ? motionDuration.instant : motionDuration.fast,
        ease: reducedMotion ? motionEase.standard : motionEase.enter,
      }}
    >
      {children}
    </motion.main>
  );
}
