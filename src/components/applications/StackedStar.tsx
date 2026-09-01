"use client";

import { motion } from "motion/react";
import { useId } from "react";
import { APPLICATION_STATUS_LABELS } from "@/lib/constants";
import { getCompactCompanyLabelStyle, getCompanyShortLabel, cn } from "@/lib/utils";
import type { ApplicationStatus } from "@/lib/types";

const STAR_TONE: Record<
  ApplicationStatus,
  { core: string; edge: string; glow: string; text: string; spark?: string }
> = {
  opened: {
    core: "#12294E",
    edge: "#C9D6E8",
    glow: "rgba(18, 41, 78, 0.3)",
    text: "#F7F9FC",
  },
  applied: {
    core: "#244A7C",
    edge: "#C9D6E8",
    glow: "rgba(36, 74, 124, 0.3)",
    text: "#F7F9FC",
  },
  written_test: {
    core: "#1D2F4F",
    edge: "#E7EEF7",
    glow: "rgba(29, 47, 79, 0.34)",
    text: "#F7F9FC",
  },
  first_round: {
    core: "#4C78B5",
    edge: "#E7EEF7",
    glow: "rgba(76, 120, 181, 0.38)",
    text: "#F7F9FC",
  },
  second_round: {
    core: "#5F8FCB",
    edge: "#E7EEF7",
    glow: "rgba(95, 143, 203, 0.4)",
    text: "#F7F9FC",
  },
  final_round: {
    core: "#6F9DD2",
    edge: "#E7EEF7",
    glow: "rgba(111, 157, 210, 0.42)",
    text: "#F7F9FC",
  },
  offer: {
    core: "#F4C542",
    edge: "#FFF4C6",
    glow: "rgba(244, 197, 66, 0.52)",
    text: "#12294E",
    spark: "#FFF4C6",
  },
  rejected: {
    core: "#6A7C96",
    edge: "#8FA1B9",
    glow: "rgba(106, 124, 150, 0.2)",
    text: "#C9D6E8",
  },
  withdrawn: {
    core: "#12294E",
    edge: "#8FA1B9",
    glow: "rgba(18, 41, 78, 0.18)",
    text: "#C9D6E8",
  },
};

export function StackedStar({
  companyName,
  status,
  size,
  selected,
  className,
  onClick,
  onHover,
}: {
  companyName: string;
  status: ApplicationStatus;
  size: number;
  selected: boolean;
  className?: string;
  onClick: () => void;
  onHover?: (hovering: boolean) => void;
}) {
  const id = useId().replace(/:/g, "");
  const tone = STAR_TONE[status];
  const label = getCompanyShortLabel(companyName, 3);
  const labelStyle = getCompactCompanyLabelStyle(label, size, {
    minFontSize: 6,
    maxFontSize: 14,
    widthRatio: 0.58,
    heightRatio: 0.5,
  });
  const gradientId = `${id}-star-fill`;
  const shineId = `${id}-star-shine`;

  return (
    <motion.button
      type="button"
      className={cn(
        "group relative flex items-center justify-center font-semibold leading-none transition outline-none",
        selected && "drop-shadow-[0_0_14px_rgba(29, 47, 79,0.44)]",
        className,
      )}
      style={{
        width: size,
        height: size,
        color: tone.text,
        filter: `drop-shadow(0 0 ${selected ? 18 : 12}px ${tone.glow})`,
      }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      onPointerEnter={() => onHover?.(true)}
      onPointerLeave={() => onHover?.(false)}
      title={`${companyName} · ${APPLICATION_STATUS_LABELS[status]}`}
      aria-label={`${companyName}，${APPLICATION_STATUS_LABELS[status]}`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-[-48%] opacity-0 blur-lg transition-opacity group-hover:opacity-100"
        style={{ background: tone.glow }}
      />
      <svg
        aria-hidden="true"
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <radialGradient id={gradientId} cx="42%" cy="33%" r="68%">
            <stop offset="0" stopColor="rgba(255,255,255,0.92)" />
            <stop offset="0.22" stopColor={tone.edge} stopOpacity="0.9" />
            <stop offset="0.58" stopColor={tone.core} stopOpacity="0.88" />
            <stop offset="1" stopColor="rgba(0,0,1,0.86)" />
          </radialGradient>
          <radialGradient id={shineId} cx="34%" cy="26%" r="38%">
            <stop offset="0" stopColor="rgba(255,255,255,0.78)" />
            <stop offset="1" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>
        <path
          d="M50 5.5L60.8 34.2L91.2 36.4L67.7 55.9L75.2 85.5L50 68.8L24.8 85.5L32.3 55.9L8.8 36.4L39.2 34.2L50 5.5Z"
          fill={`url(#${gradientId})`}
          stroke={selected ? "rgba(241,239,255,0.96)" : "rgba(231,238,247,0.46)"}
          strokeWidth={selected ? 3.2 : 2.1}
          strokeLinejoin="round"
        />
        <path
          d="M50 12L58.2 36.3L83.6 38.8L63.9 55.1L69.8 79.4L50 65.1L30.2 79.4L36.1 55.1L16.4 38.8L41.8 36.3L50 12Z"
          fill={`url(#${shineId})`}
          opacity="0.38"
        />
      </svg>
      <span
        className="relative z-10 flex min-w-0 items-center justify-center overflow-hidden text-center font-semibold tracking-normal"
        style={{ ...labelStyle, textShadow: "0 1px 7px rgba(0, 0, 0, 0.82)" }}
      >
        {label}
      </span>
      {status === "offer" ? (
        <span
          aria-hidden="true"
          className="absolute right-[10%] top-[13%] size-2 rounded-full shadow-[0_0_10px_rgba(244,197,66,0.7)]"
          style={{ background: tone.spark }}
        />
      ) : null}
    </motion.button>
  );
}
