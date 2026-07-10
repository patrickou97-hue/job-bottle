"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";

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
  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50">
          <motion.button
            type="button"
            aria-label="关闭"
            className="absolute inset-0 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-[rgba(18,41,78,0.62)] p-5 shadow-glass backdrop-blur-[24px] backdrop-saturate-[1.2] before:pointer-events-none before:absolute before:bottom-0 before:right-full before:top-0 before:w-20 before:bg-gradient-to-l before:from-[rgba(18,41,78,0.62)] before:to-transparent sm:p-7"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-ink-primary">{title}</h2>
              <button
                type="button"
                className="inline-flex size-10 items-center justify-center rounded-full text-ink-secondary transition hover:bg-white/[0.08] hover:text-ink-primary"
                onClick={onClose}
                aria-label="关闭"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
            {children}
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
