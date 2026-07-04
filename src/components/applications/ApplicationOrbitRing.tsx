"use client";

import { motion, useReducedMotion } from "motion/react";
import { ORBIT_CONFIG, type OrbitStatus } from "@/components/applications/ApplicationOrbitConfig";
import { ApplicationOrbitStar } from "@/components/applications/ApplicationOrbitStar";
import type { ApplicationWithJob } from "@/lib/types";

export function ApplicationOrbitRing({
  status,
  applications,
  scale,
  selectedId,
  highlightedStatus,
  onSelect,
  onAggregateClick,
  showTrack = true,
}: {
  status: OrbitStatus;
  applications: ApplicationWithJob[];
  scale: number;
  selectedId?: string | null;
  highlightedStatus?: OrbitStatus | null;
  onSelect: (application: ApplicationWithJob) => void;
  onAggregateClick?: (status: OrbitStatus) => void;
  showTrack?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const config = ORBIT_CONFIG[status];
  const radius = config.radius * scale;
  const visible = applications.slice(0, 7);
  const hiddenCount = Math.max(0, applications.length - visible.length);
  const slots = hiddenCount > 0 ? [...visible, null] : visible;
  const dimmed = Boolean(highlightedStatus && highlightedStatus !== status);
  const orbitPoints = [0, 60, 120, 180, 240, 300, 360];

  return (
    <div className="absolute left-1/2 top-1/2 size-0">
      {showTrack ? (
        <div
          className="pointer-events-none absolute rounded-full border border-dashed"
          style={{
            width: radius * 2,
            height: radius * 2,
            marginLeft: -radius,
            marginTop: -radius,
            borderColor: highlightedStatus === status ? "rgba(174,198,230,0.16)" : `rgba(148,163,184,${config.opacity * 0.16})`,
          }}
        />
      ) : null}
      <motion.div
        className="absolute size-0"
      >
        {slots.map((application, index) => {
          const total = Math.max(1, slots.length);
          const id = application?.id ?? `${status}-aggregate`;
          const angle = (index / total) * 360;
          const staticPoint = getOrbitPoint(angle, radius);
          const path = orbitPoints.map((offset) => getOrbitPoint(angle + offset, radius));
          return (
            <motion.div
              key={id}
              className="absolute size-0"
              initial={false}
              animate={
                reducedMotion
                  ? { x: staticPoint.x, y: staticPoint.y }
                  : { x: path.map((point) => point.x), y: path.map((point) => point.y) }
              }
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : { duration: config.duration, repeat: Infinity, ease: "linear" }
              }
            >
              <div className="-translate-x-1/2 -translate-y-1/2">
                {application ? (
                  <ApplicationOrbitStar
                    application={application}
                    selected={selectedId === application.id}
                    dimmed={dimmed}
                    onClick={() => onSelect(application)}
                  />
                ) : (
                  <button
                    type="button"
                    className="flex size-10 items-center justify-center rounded-full border border-nebula-blue/12 bg-nebula-blue/8 text-xs text-ink-secondary transition hover:scale-[1.06] hover:border-nebula-blue/24 hover:text-nebula-silver"
                    onClick={() => onAggregateClick?.(status)}
                    aria-label={`${config.label}还有 ${hiddenCount} 条投递记录`}
                  >
                    +{hiddenCount}
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

function getOrbitPoint(angleDeg: number, radius: number) {
  const angle = (angleDeg * Math.PI) / 180;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}
