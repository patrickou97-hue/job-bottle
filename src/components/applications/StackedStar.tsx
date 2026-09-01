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
    core: "#10264A",
    edge: "#D8E1EF",
    glow: "rgba(16, 38, 74, 0.3)",
    text: "#FFF9E3",
  },
  applied: {
    core: "#1E3B66",
    edge: "#D8E1EF",
    glow: "rgba(30, 59, 102, 0.3)",
    text: "#FFF9E3",
  },
  written_test: {
    core: "#D8A62F",
    edge: "#FFF9E3",
    glow: "rgba(243, 198, 77, 0.34)",
    text: "#152A55",
  },
  first_round: {
    core: "#E7B631",
    edge: "#FFF9E3",
    glow: "rgba(243, 198, 77, 0.38)",
    text: "#152A55",
  },
  second_round: {
    core: "#E7B631",
    edge: "#FFF9E3",
    glow: "rgba(243, 198, 77, 0.4)",
    text: "#152A55",
  },
  final_round: {
    core: "#F3C64D",
    edge: "#FFF9E3",
    glow: "rgba(243, 198, 77, 0.42)",
    text: "#152A55",
  },
  offer: {
    core: "#F3C64D",
    edge: "#FFF9E3",
    glow: "rgba(243, 198, 77, 0.52)",
    text: "#152A55",
    spark: "#FFF9E3",
  },
  rejected: {
    core: "#4A6283",
    edge: "#9BAAC0",
    glow: "rgba(74, 98, 131, 0.2)",
    text: "#D8E1EF",
  },
  withdrawn: {
    core: "#10264A",
    edge: "#9BAAC0",
    glow: "rgba(16, 38, 74, 0.18)",
    text: "#D8E1EF",
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
        selected && "drop-shadow-[0_0_14px_rgba(243,198,77,0.44)]",
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
          stroke={selected ? "rgba(255,249,227,0.96)" : "rgba(237,242,248,0.46)"}
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
          className="absolute right-[10%] top-[13%] size-2 rounded-full shadow-[0_0_10px_rgba(243,198,77,0.7)]"
          style={{ background: tone.spark }}
        />
      ) : null}
    </motion.button>
  );
}
