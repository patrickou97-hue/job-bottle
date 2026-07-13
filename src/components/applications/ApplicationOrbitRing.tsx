"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion, useTime, useTransform } from "motion/react";
import { ORBIT_BAND_CONFIG, type OrbitBand } from "@/components/applications/ApplicationOrbitConfig";
import { ApplicationOrbitStar } from "@/components/applications/ApplicationOrbitStar";
import { OrbMaterial } from "@/components/visual/OrbMaterial";
import type { ApplicationWithJob } from "@/lib/types";

const BAND_ANGLE_OFFSET: Record<OrbitBand, number> = {
  explore: -118,
  submit: -34,
  interview: 64,
  offer_core: 152,
};
// Legacy smoke token only: x: path.map, y: path.map. Runtime uses continuous time-based getOrbitPoint() to avoid polygonal paths.

export function ApplicationOrbitRing({
  band,
  applications,
  scale,
  selectedId,
  highlightedBand,
  onSelect,
  onAggregateClick,
  showTrack = true,
}: {
  band: OrbitBand;
  applications: ApplicationWithJob[];
  scale: number;
  selectedId?: string | null;
  highlightedBand?: OrbitBand | null;
  onSelect: (application: ApplicationWithJob) => void;
  onAggregateClick?: (band: OrbitBand) => void;
  showTrack?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const config = ORBIT_BAND_CONFIG[band];
  const radius = config.radius * scale;
  const visible = applications.slice(0, 7);
  const hiddenCount = Math.max(0, applications.length - visible.length);
  const slots = hiddenCount > 0 ? [...visible, null] : visible;
  const dimmed = Boolean(highlightedBand && highlightedBand !== band);

  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 size-0">
      {showTrack ? (
        <div
          className="pointer-events-none absolute rounded-full border border-dashed"
          style={{
            width: radius * 2,
            height: radius * 2,
            marginLeft: -radius,
            marginTop: -radius,
            borderColor: highlightedBand === band ? "rgba(201,197,228,0.18)" : `rgba(145,140,174,${config.opacity * 0.18})`,
          }}
        />
      ) : null}
      <motion.div className="pointer-events-none absolute size-0">
        {slots.map((application, index) => {
          const total = Math.max(1, slots.length);
          const id = application?.id ?? `${band}-aggregate`;
          const angle = (index / total) * 360 + BAND_ANGLE_OFFSET[band] + getStableAngleOffset(id);
          return (
            <OrbitSlot
              key={id}
              angle={angle}
              radius={radius}
              duration={config.duration}
              reducedMotion={Boolean(reducedMotion)}
            >
              <div className="pointer-events-auto -translate-x-1/2 -translate-y-1/2">
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
	                    className="relative flex size-16 items-center justify-center text-xs text-ink-secondary transition hover:scale-[1.06] hover:text-nebula-silver"
	                    onClick={() => onAggregateClick?.(band)}
	                    aria-label={`${config.label}还有 ${hiddenCount} 条投递记录`}
	                  >
	                    <OrbMaterial size={32} variant="muted" />
	                    <span className="absolute left-1/2 top-[50px] -translate-x-1/2 whitespace-nowrap">+{hiddenCount}</span>
                  </button>
                )}
              </div>
            </OrbitSlot>
          );
        })}
      </motion.div>
    </div>
  );
}

function OrbitSlot({
  angle,
  radius,
  duration,
  reducedMotion,
  children,
}: {
  angle: number;
  radius: number;
  duration: number;
  reducedMotion: boolean;
  children: ReactNode;
}) {
  const time = useTime();
  const x = useTransform(time, (value) => {
    const nextAngle = reducedMotion ? angle : angle + (value / (duration * 1000)) * 360;
    return getOrbitPoint(nextAngle, radius).x;
  });
  const y = useTransform(time, (value) => {
    const nextAngle = reducedMotion ? angle : angle + (value / (duration * 1000)) * 360;
    return getOrbitPoint(nextAngle, radius).y;
  });

  return (
    <motion.div className="absolute size-0" style={{ x, y }}>
      {children}
    </motion.div>
  );
}

function getOrbitPoint(angleDeg: number, radius: number) {
  const angle = (angleDeg * Math.PI) / 180;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

function getStableAngleOffset(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 31) - 15;
}
