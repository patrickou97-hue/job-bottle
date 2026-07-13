"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { XIcon } from "@phosphor-icons/react";
import { motionDuration } from "@/lib/motion";
import { CommunityHelpLink } from "@/components/ui/CommunityHelpLink";

export function Drawer({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      returnFocusRef.current?.focus();
    };
  }, [onClose, open]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="theme-work fixed inset-0 z-50">
          <motion.button
            type="button"
            aria-label="关闭"
            className="absolute inset-0 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? motionDuration.instant : motionDuration.fast }}
            onClick={onClose}
          />
          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-title"
            className="apple-sheet absolute inset-x-0 bottom-0 max-h-[88svh] w-full overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 md:bottom-4 md:left-auto md:right-4 md:top-4 md:max-h-none md:max-w-xl md:p-7"
            initial={{ y: reducedMotion ? 0 : "100%", x: 0, opacity: reducedMotion ? 0 : 1 }}
            animate={{ y: 0, x: 0 }}
            exit={{ y: reducedMotion ? 0 : "100%", x: 0, opacity: reducedMotion ? 0 : 1 }}
            transition={reducedMotion ? { duration: motionDuration.instant } : { type: "spring", stiffness: 340, damping: 34, mass: 0.9 }}
          >
            <div className="mb-2 flex justify-center md:hidden"><span className="apple-sheet-handle" /></div>
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 id="drawer-title" className="text-xl font-semibold text-ink-primary">{title}</h2>
              <button
                ref={closeButtonRef}
                type="button"
                className="inline-flex size-10 items-center justify-center rounded-lg text-ink-secondary transition hover:bg-[color:var(--surface-hover-bg)] hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--aurora)]"
                onClick={onClose}
                aria-label="关闭"
              >
                <XIcon aria-hidden="true" className="size-4" weight="bold" />
              </button>
            </div>
            {children}
            <div className="mt-6 border-t border-[color:var(--line-ghost)] pt-4">
              <CommunityHelpLink onClick={onClose} />
            </div>
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
