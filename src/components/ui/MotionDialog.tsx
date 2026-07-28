"use client";

import { forwardRef, type MouseEvent, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  modalBackdropVariants,
  modalPanelVariants,
  motionDuration,
  motionEase,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

type MotionDialogProps = {
  children: ReactNode;
  className?: string;
  labelledBy: string;
  describedBy?: string;
  onBackdropClick?: () => void;
  overlayClassName?: string;
};

export const MotionDialog = forwardRef<HTMLElement, MotionDialogProps>(function MotionDialog({
  children,
  className,
  labelledBy,
  describedBy,
  onBackdropClick,
  overlayClassName,
}, ref) {
  const reducedMotion = useReducedMotion();

  function handleBackdropMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onBackdropClick?.();
  }

  return (
    <motion.div
      className={cn(
        "theme-work fixed inset-0 z-[90] flex items-end justify-center bg-black/48 p-0 sm:items-center sm:p-6",
        overlayClassName,
      )}
      role="presentation"
      variants={modalBackdropVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={{
        duration: reducedMotion ? motionDuration.instant : motionDuration.fast,
        ease: motionEase.standard,
      }}
      onMouseDown={handleBackdropMouseDown}
    >
      <motion.section
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        className={cn("apple-sheet max-h-[92svh] w-full overflow-y-auto", className)}
        variants={reducedMotion ? modalBackdropVariants : modalPanelVariants}
        transition={{
          duration: reducedMotion ? motionDuration.instant : motionDuration.normal,
          ease: reducedMotion ? motionEase.standard : motionEase.enter,
        }}
      >
        {children}
      </motion.section>
    </motion.div>
  );
});
