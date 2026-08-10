"use client";

import { forwardRef, type MouseEvent, type ReactNode, useCallback, useEffect, useLayoutEffect, useRef } from "react";
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
  onEscapeKeyDown?: () => void;
  overlayClassName?: string;
};

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

let openDialogCount = 0;
let bodyOverflowBeforeDialogs = "";

function lockBodyScroll() {
  if (openDialogCount === 0) {
    bodyOverflowBeforeDialogs = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  openDialogCount += 1;
}

function unlockBodyScroll() {
  openDialogCount = Math.max(0, openDialogCount - 1);
  if (openDialogCount === 0) document.body.style.overflow = bodyOverflowBeforeDialogs;
}

export const MotionDialog = forwardRef<HTMLElement, MotionDialogProps>(function MotionDialog({
  children,
  className,
  labelledBy,
  describedBy,
  onBackdropClick,
  onEscapeKeyDown,
  overlayClassName,
}, ref) {
  const reducedMotion = useReducedMotion();
  const panelRef = useRef<HTMLElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const onBackdropClickRef = useRef(onBackdropClick);
  const onEscapeKeyDownRef = useRef(onEscapeKeyDown);
  const setPanelRef = useCallback((node: HTMLElement | null) => {
    panelRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  }, [ref]);

  useLayoutEffect(() => {
    onBackdropClickRef.current = onBackdropClick;
    onEscapeKeyDownRef.current = onEscapeKeyDown;
  }, [onBackdropClick, onEscapeKeyDown]);

  useEffect(() => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    lockBodyScroll();

    const focusFrame = window.requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const initialFocus = panel.querySelector<HTMLElement>("[data-dialog-initial-focus]")
        ?? panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
        ?? panel;
      initialFocus.focus({ preventScroll: true });
    });

    function handleKeyDown(event: KeyboardEvent) {
      const panel = panelRef.current;
      if (!panel) return;
      const closeOnEscape = onEscapeKeyDownRef.current ?? onBackdropClickRef.current;
      if (event.key === "Escape" && closeOnEscape) {
        event.preventDefault();
        event.stopPropagation();
        closeOnEscape();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        .filter((element) => !element.closest("[hidden], [aria-hidden='true']"));
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus({ preventScroll: true });
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!panel.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      unlockBodyScroll();
      if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus({ preventScroll: true });
    };
  }, []);

  function handleBackdropMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onBackdropClick?.();
  }

  return (
    <motion.div
      className={cn(
        "theme-work fixed inset-0 z-[90] flex items-end justify-center overscroll-contain bg-black/48 p-0 sm:items-center sm:p-6",
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
        ref={setPanelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={cn("apple-sheet max-h-[92svh] w-full overflow-y-auto overscroll-contain", className)}
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
