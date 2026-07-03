"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { StackedStar } from "@/components/applications/StackedStar";
import { BOTTLE_AREA, type BottleStackPosition } from "@/components/applications/bottleGeometry";
import type { ApplicationWithJob } from "@/lib/types";

export function BottleStage({
  applications,
  positions,
  fallingId,
  selectedId,
  onFallComplete,
  onSelect,
  onHover,
}: {
  applications: ApplicationWithJob[];
  positions: Map<string, BottleStackPosition>;
  fallingId: string | null;
  selectedId: string | null;
  onFallComplete: () => void;
  onSelect: (application: ApplicationWithJob) => void;
  onHover: (applicationId: string | null) => void;
}) {
  const [showFallback, setShowFallback] = useState(false);
  const spawnX = BOTTLE_AREA.centerX * 100;
  const spawnY = BOTTLE_AREA.neckY * 100;

  return (
    <div
      id="application-bottle-target"
      className="relative mx-auto aspect-[0.58] w-full max-w-[560px]"
    >
      <div className="pointer-events-none absolute inset-x-[18%] bottom-[5%] top-[14%] z-0 rounded-full bg-nebula-blue/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-[24%] bottom-[7%] h-16 rounded-full bg-aurum-300/8 blur-2xl" />

      <div className="absolute inset-0 z-10">
        {applications.length === 0 ? (
          <div className="absolute inset-x-[26%] bottom-[24%] text-center">
            <p className="text-sm text-ink-muted/60">投递后，星星会从瓶口落入。</p>
          </div>
        ) : null}

        {applications.map((application) => {
          const position = positions.get(application.id);
          if (!position) return null;
          const isFalling = fallingId === application.id;
          const targetX = position.xPct;
          const targetY = position.yPct;
          const midX = spawnX + (targetX - spawnX) * 0.38 + (targetX < spawnX ? -7 : 7);
          const midY = Math.max(spawnY + 11, targetY - 24);

          return (
            <motion.div
              key={application.id}
              className="absolute"
              initial={
                isFalling
                  ? {
                      left: `${spawnX}%`,
                      top: `${spawnY}%`,
                      scale: 0.62,
                      opacity: 0,
                      rotate: -10,
                    }
                  : {
                      left: `${targetX}%`,
                      top: `${targetY}%`,
                      scale: 1,
                      opacity: 1,
                      rotate: position.rotate,
                    }
              }
              animate={
                isFalling
                  ? {
                      left: [`${spawnX}%`, `${midX}%`, `${targetX}%`, `${targetX}%`],
                      top: [`${spawnY}%`, `${midY}%`, `${targetY + 1.5}%`, `${targetY}%`],
                      scale: [0.62, 1.04, 0.98, 1],
                      opacity: [0, 1, 1, 1],
                      rotate: [-10, 7, position.rotate - 4, position.rotate],
                    }
                  : {
                      left: `${targetX}%`,
                      top: `${targetY}%`,
                      scale: 1,
                      opacity: 1,
                      rotate: position.rotate,
                    }
              }
              transition={
                isFalling
                  ? {
                      duration: 1.08,
                      times: [0, 0.48, 0.84, 1],
                      ease: [0.22, 1, 0.36, 1],
                    }
                  : { duration: 0.2 }
              }
              onAnimationComplete={isFalling ? onFallComplete : undefined}
            >
              <StackedStar
                companyName={application.job.company_name}
                status={application.status}
                size={position.size}
                selected={selectedId === application.id}
                className="-translate-x-1/2 -translate-y-1/2"
                onClick={() => onSelect(application)}
                onHover={(hovering) => onHover(hovering ? application.id : null)}
              />
            </motion.div>
          );
        })}
      </div>

      <Image
        src="/assets/bottle-front.png"
        alt=""
        fill
        sizes="(max-width: 640px) 92vw, 560px"
        className="pointer-events-none absolute inset-0 z-20 object-contain"
        aria-hidden="true"
        onError={() => setShowFallback(true)}
      />
      {showFallback ? <BottleFallbackSvg /> : null}
    </div>
  );
}

function BottleFallbackSvg() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 360 520"
      className="pointer-events-none absolute inset-0 z-[1] h-full w-full opacity-55"
      preserveAspectRatio="xMidYMid meet"
    >
      <path
        d="M144 62C144 48 158 39 180 39C202 39 216 48 216 62V132C216 153 235 168 263 184C312 213 337 263 337 352C337 441 276 492 180 492C84 492 23 441 23 352C23 263 48 213 97 184C125 168 144 153 144 132V62Z"
        fill="rgba(157,184,220,0.045)"
        stroke="rgba(219,234,254,0.34)"
        strokeWidth="1.6"
      />
      <ellipse cx="180" cy="58" rx="42" ry="11" fill="none" stroke="rgba(219,234,254,0.3)" strokeWidth="1.2" />
      <path d="M62 234C47 312 56 417 105 466" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M298 238C312 317 303 416 256 466" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
