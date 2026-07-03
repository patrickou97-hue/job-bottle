"use client";

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
  const spawnX = BOTTLE_AREA.centerX * 100;
  const spawnY = BOTTLE_AREA.neckY * 100;

  return (
    <div
      id="application-bottle-target"
      className="relative mx-auto aspect-[0.86] w-full max-w-[620px] overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-x-[12%] bottom-[7%] top-[13%] z-0 rounded-full bg-nebula-blue/10 blur-3xl" />
      <Image
        src="/assets/star-bottle-image2.png"
        alt=""
        fill
        priority
        sizes="(max-width: 640px) 92vw, 620px"
        className="pointer-events-none absolute inset-0 z-[5] object-contain"
        aria-hidden="true"
      />

      <div className="absolute inset-0 z-10 overflow-hidden">
        {applications.length === 0 ? (
          <div className="absolute inset-x-[26%] bottom-[28%] text-center">
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
    </div>
  );
}
