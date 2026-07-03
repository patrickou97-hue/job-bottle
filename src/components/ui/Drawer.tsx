"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";

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
            className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l border-nebula-blue/16 bg-void-900/92 p-5 shadow-glass backdrop-blur-2xl sm:p-7"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-ink-primary">{title}</h2>
              <Button variant="secondary" className="size-10 p-0" onClick={onClose}>
                <X aria-hidden="true" className="size-4" />
              </Button>
            </div>
            {children}
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
