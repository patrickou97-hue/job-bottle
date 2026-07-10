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
  opened:       { color: "#12294E", opacity: 0.35, grayscale: false },
  applied:      { color: "#564A71", opacity: 0.4, grayscale: false },
  written_test: { color: "#7E7CB5", opacity: 0.45, grayscale: false },
  first_round:  { color: "#7F5568", opacity: 0.5, grayscale: false },
  second_round: { color: "#7E7CB5", opacity: 0.55, grayscale: false },
  final_round:  { color: "#7F5568", opacity: 0.6, grayscale: false },
  offer:        { color: "#7E7CB5", opacity: 0.75, grayscale: false },
  rejected:     { color: "#564A71", opacity: 0.25, grayscale: true  },
  withdrawn:    { color: "#12294E", opacity: 0.2, grayscale: true  },
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
