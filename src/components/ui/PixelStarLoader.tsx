"use client";

import { useReducedMotion } from "motion/react";
import type { CSSProperties } from "react";

const STAR_PATTERN = [
  ".....x.....",
  "....xxx....",
  "...xxxxx...",
  "..xx...xx..",
  ".xx.....xx.",
  "xxxxxxxxxxx",
  ".xx.....xx.",
  "..xx...xx..",
  "...xxxxx...",
  "....xxx....",
  ".....x.....",
] as const;

const STAR_DOTS = STAR_PATTERN.flatMap((row, rowIndex) =>
  [...row].map((cell, columnIndex) => ({
    active: cell === "x",
    key: `${rowIndex}-${columnIndex}`,
    order: rowIndex * STAR_PATTERN[0].length + columnIndex,
  })),
);

export function PixelStarLoader({
  size = "md",
  className = "",
}: {
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <span
      className={`pixel-star-loader pixel-star-loader--${size} ${className}`.trim()}
      data-reduced-motion={prefersReducedMotion ? "true" : "false"}
      aria-hidden="true"
    >
      {STAR_DOTS.map((dot) => (
        <span
          key={dot.key}
          className={`pixel-star-loader__dot${dot.active ? " pixel-star-loader__dot--active" : ""}`}
          style={dot.active ? { "--pixel-star-order": dot.order } as CSSProperties : undefined}
        />
      ))}
    </span>
  );
}
