"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

export function SegmentedControl<T extends string>({
  ariaLabel,
  className,
  onChange,
  options,
  value,
}: {
  ariaLabel: string;
  className?: string;
  onChange: (value: T) => void;
  options: readonly SegmentedOption<T>[];
  value: T;
}) {
  const indicatorId = useId();
  const reducedMotion = useReducedMotion();

  return (
    <div className={cn("apple-segmented", className)} role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            className="apple-segmented__item"
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              const direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
              if (!direction && event.key !== "Home" && event.key !== "End") return;
              event.preventDefault();
              const index = options.indexOf(option);
              const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (index + direction + options.length) % options.length;
              onChange(options[next].value);
              event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
            }}
          >
            {active ? (
              <motion.span
                layoutId={`${indicatorId}-segment`}
                className="apple-segmented__indicator"
                transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 430, damping: 38, mass: 0.8 }}
              />
            ) : null}
            <span className="relative z-10">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
