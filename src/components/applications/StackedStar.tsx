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
    core: "#6d7e96",
    edge: "#c3d6ec",
    glow: "rgba(125, 173, 216, 0.22)",
    text: "#edf5ff",
  },
  applied: {
    core: "#8290a6",
    edge: "#d3deee",
    glow: "rgba(146, 178, 214, 0.24)",
    text: "#f4f8ff",
  },
  written_test: {
    core: "#8faccc",
    edge: "#e0efff",
    glow: "rgba(142, 190, 232, 0.28)",
    text: "#f7fbff",
  },
  first_round: {
    core: "#a7b7cf",
    edge: "#edf7ff",
    glow: "rgba(174, 203, 232, 0.32)",
    text: "#ffffff",
  },
  second_round: {
    core: "#b8c7dc",
    edge: "#f5fbff",
    glow: "rgba(189, 214, 240, 0.34)",
    text: "#ffffff",
  },
  final_round: {
    core: "#c4d1e2",
    edge: "#ffffff",
    glow: "rgba(204, 224, 244, 0.36)",
    text: "#ffffff",
  },
  offer: {
    core: "#c6a96d",
    edge: "#fff2c7",
    glow: "rgba(200, 169, 106, 0.42)",
    text: "#fff8e7",
    spark: "#f7d889",
  },
  rejected: {
    core: "#4d535d",
    edge: "#8a92a0",
    glow: "rgba(84, 93, 106, 0.16)",
    text: "#c6ccd5",
  },
  withdrawn: {
    core: "#424854",
    edge: "#77808e",
    glow: "rgba(72, 81, 96, 0.14)",
    text: "#b8c0cc",
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
        selected && "drop-shadow-[0_0_14px_rgba(196,225,255,0.44)]",
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
            <stop offset="1" stopColor="rgba(10,16,29,0.86)" />
          </radialGradient>
          <radialGradient id={shineId} cx="34%" cy="26%" r="38%">
            <stop offset="0" stopColor="rgba(255,255,255,0.78)" />
            <stop offset="1" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>
        <path
          d="M50 5.5L60.8 34.2L91.2 36.4L67.7 55.9L75.2 85.5L50 68.8L24.8 85.5L32.3 55.9L8.8 36.4L39.2 34.2L50 5.5Z"
          fill={`url(#${gradientId})`}
          stroke={selected ? "rgba(235,248,255,0.95)" : "rgba(235,248,255,0.42)"}
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
          className="absolute right-[10%] top-[13%] size-2 rounded-full shadow-[0_0_10px_rgba(200,169,106,0.65)]"
          style={{ background: tone.spark }}
        />
      ) : null}
    </motion.button>
  );
}
