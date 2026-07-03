"use client";

import { useState, useCallback } from "react";
import { motion } from "motion/react";
import type { CSSProperties } from "react";
import { APPLICATION_STATUS_LABELS } from "@/lib/constants";
import { CompanyBadge } from "@/components/jobs/CompanyBadge";
import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@/lib/types";

/* ── WARM status-based styling (dark → yellow → gold) ── */

const statusGlow: Record<
  ApplicationStatus,
  { color: string; opacity: number; grayscale: boolean }
> = {
  opened:       { color: "#1a1a20", opacity: 0.35, grayscale: false },
  applied:      { color: "#2a2520", opacity: 0.40, grayscale: false },
  written_test: { color: "#3d3525", opacity: 0.45, grayscale: false },
  first_round:  { color: "#52452a", opacity: 0.50, grayscale: false },
  second_round: { color: "#6b5a30", opacity: 0.55, grayscale: false },
  final_round:  { color: "#8a7540", opacity: 0.60, grayscale: false },
  offer:        { color: "#c8a96a", opacity: 0.75, grayscale: false },
  rejected:     { color: "#2a2a2a", opacity: 0.25, grayscale: true  },
  withdrawn:    { color: "#1a1a1a", opacity: 0.20, grayscale: true  },
};

/* Simple deterministic hash for size variation */
function hashSize(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return 36 + (Math.abs(h) % 11); // 36-46px
}

export function CompanyStar({
  companyName,
  logoUrl,
  status,
  onClick,
  onHover,
  className,
  style,
}: {
  companyName: string;
  logoUrl?: string | null;
  status: ApplicationStatus;
  onClick: () => void;
  onHover?: (hovering: boolean) => void;
  className?: string;
  style?: CSSProperties;
}) {
  const [hovered, setHovered] = useState(false);
  const sg = statusGlow[status];
  const size = hashSize(companyName);

  const handleHover = useCallback(
    (v: boolean) => {
      setHovered(v);
      onHover?.(v);
    },
    [onHover],
  );

  const isGold = status === "offer";

  return (
    <motion.button
      type="button"
      className={cn(
        "group flex items-center justify-center rounded-full transition-all",
        className,
      )}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      onPointerEnter={() => handleHover(true)}
      onPointerLeave={() => handleHover(false)}
      style={{
        ...style,
        width: size,
        height: size,
        filter: sg.grayscale ? "grayscale(1)" : undefined,
      }}
      title={`${companyName} · ${APPLICATION_STATUS_LABELS[status]}`}
    >
      {/* Circular background glow */}
      <span
        className="absolute inset-[-30%] rounded-full"
        style={{
          background: `radial-gradient(circle, ${sg.color} 0%, transparent 70%)`,
          opacity: hovered ? sg.opacity + 0.15 : sg.opacity,
          filter: isGold ? "blur(6px)" : "blur(4px)",
          transition: "opacity 0.2s",
        }}
      />

      {/* Subtle ring matching status color */}
      <span
        className="absolute inset-0 rounded-full"
        style={{
          boxShadow: `0 0 0 1px ${sg.color}`,
          opacity: hovered ? 0.6 : 0.3,
          transition: "opacity 0.2s",
        }}
      />

      {/* Company badge */}
      <CompanyBadge companyName={companyName} logoUrl={logoUrl} size="sm" />
    </motion.button>
  );
}
