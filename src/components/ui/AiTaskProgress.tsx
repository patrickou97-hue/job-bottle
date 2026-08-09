"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

export function AiTaskProgress({
  title,
  label,
  completed,
  total,
  protection,
  onCancel,
  floating = false,
  className = "",
}: {
  title: string;
  label: string;
  completed?: number;
  total?: number;
  protection?: string;
  onCancel?: () => void;
  floating?: boolean;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const isDeterminate = Number.isFinite(total) && Number(total) > 0 && Number.isFinite(completed);
  const safeTotal = isDeterminate ? Math.max(1, Number(total)) : 0;
  const safeCompleted = isDeterminate ? Math.min(safeTotal, Math.max(0, Number(completed))) : 0;
  const percent = isDeterminate ? Math.round((safeCompleted / safeTotal) * 100) : null;

  useEffect(() => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1_000)), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const elapsedLabel = useMemo(() => {
    if (elapsedSeconds < 60) return `${elapsedSeconds} 秒`;
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    return `${minutes} 分 ${String(seconds).padStart(2, "0")} 秒`;
  }, [elapsedSeconds]);

  return (
    <motion.div
      aria-live="polite"
      className={`${floating ? "fixed bottom-4 z-40 w-[min(calc(100%-2rem),540px)] sm:bottom-6" : "w-full"} border border-[color:var(--line-strong)] bg-[color:var(--surface-read-bg-strong)] px-4 py-3 shadow-[0_18px_48px_rgba(0,0,0,0.22)] sm:px-5 sm:py-4 ${className}`}
      style={floating ? { left: "50%", x: "-50%" } : undefined}
      initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: prefersReducedMotion ? 0 : 6 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: "easeOut" }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink-primary">{title}</p>
          <p className="mt-1 text-xs leading-5 text-ink-muted">{label}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs font-semibold tabular-nums text-[color:var(--aurora)]">
            {percent === null ? `已用时 ${elapsedLabel}` : `${percent}%`}
          </span>
          {onCancel ? (
            <button
              type="button"
              className="muted-button pressable inline-flex size-8 items-center justify-center rounded-lg"
              aria-label={`取消${title}`}
              onClick={onCancel}
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>
      <div
        role="progressbar"
        aria-label={title}
        aria-valuemin={isDeterminate ? 0 : undefined}
        aria-valuemax={isDeterminate ? 100 : undefined}
        aria-valuenow={percent ?? undefined}
        aria-valuetext={isDeterminate
          ? `已完成 ${safeCompleted} / ${safeTotal} 个处理区块`
          : `${label}，已用时 ${elapsedLabel}`}
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-[color:var(--surface-hover-bg)]"
      >
        {isDeterminate ? (
          <motion.div
            className="h-full w-full origin-left rounded-full bg-[color:var(--aurora)]"
            initial={false}
            animate={{ scaleX: safeCompleted / safeTotal }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.25, ease: "easeOut" }}
          />
        ) : (
          <motion.div
            className="h-full w-1/3 rounded-full bg-[color:var(--aurora)]"
            initial={{ x: prefersReducedMotion ? "100%" : "-100%" }}
            animate={{ x: prefersReducedMotion ? "100%" : "400%" }}
            transition={{ duration: 1.35, ease: "easeInOut", repeat: prefersReducedMotion ? 0 : Infinity }}
          />
        )}
      </div>
      <p className="mt-2 text-[11px] leading-4 text-ink-muted">
        {isDeterminate ? `已完成 ${safeCompleted} / ${safeTotal} 个处理区块 · ` : ""}
        {protection || "处理完成前不会改动原内容"}
      </p>
    </motion.div>
  );
}
