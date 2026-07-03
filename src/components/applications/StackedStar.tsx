"use client";

import { motion } from "motion/react";
import { APPLICATION_STATUS_LABELS } from "@/lib/constants";
import { getCompanyInitials, cn } from "@/lib/utils";
import type { ApplicationStatus } from "@/lib/types";

const STAR_TONE: Record<ApplicationStatus, { core: string; glow: string; text: string }> = {
  opened: { core: "#6f7f96", glow: "rgba(111,127,150,0.2)", text: "#dce3ee" },
  applied: { core: "#8b8f9a", glow: "rgba(139,143,154,0.22)", text: "#eef2f7" },
  written_test: { core: "#96abc8", glow: "rgba(150,171,200,0.26)", text: "#f4f8ff" },
  first_round: { core: "#aeb8ca", glow: "rgba(174,184,202,0.3)", text: "#f8fbff" },
  second_round: { core: "#b9c6d8", glow: "rgba(185,198,216,0.34)", text: "#ffffff" },
  final_round: { core: "#c3cddd", glow: "rgba(195,205,221,0.36)", text: "#ffffff" },
  offer: { core: "#c8a96a", glow: "rgba(200,169,106,0.42)", text: "#fff8e7" },
  rejected: { core: "#4b4f58", glow: "rgba(75,79,88,0.16)", text: "#b8bec8" },
  withdrawn: { core: "#3f434b", glow: "rgba(63,67,75,0.14)", text: "#aab0ba" },
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
  const tone = STAR_TONE[status];
  const initials = getCompanyInitials(companyName).slice(0, 2);
  const fontSize = Math.max(12, Math.min(15, Math.round(size * 0.31)));

  return (
    <motion.button
      type="button"
      className={cn(
        "group relative flex items-center justify-center rounded-full font-semibold leading-none transition",
        selected && "ring-1 ring-nebula-ice/70",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize,
        color: tone.text,
        background:
          "radial-gradient(circle at 34% 27%, rgba(255,255,255,0.9), transparent 14%), " +
          `radial-gradient(circle at 50% 50%, ${tone.core}, rgba(20,26,38,0.88) 68%)`,
        boxShadow: `0 0 ${selected ? 24 : 16}px ${tone.glow}, inset 0 0 0 1px rgba(255,255,255,0.2)`,
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
        className="pointer-events-none absolute inset-[-45%] rounded-full opacity-0 blur-md transition-opacity group-hover:opacity-100"
        style={{ background: tone.glow }}
      />
      <span className="relative z-10 whitespace-nowrap tracking-normal">{initials}</span>
      {status === "offer" ? (
        <span
          aria-hidden="true"
          className="absolute right-0 top-0 size-2 rounded-full bg-aurum-300/90 shadow-[0_0_10px_rgba(200,169,106,0.65)]"
        />
      ) : null}
    </motion.button>
  );
}
