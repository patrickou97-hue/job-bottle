"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef } from "react";
import { useReducedMotion } from "motion/react";
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reducedMotion = useReducedMotion();
  const spawnX = BOTTLE_AREA.centerX * 100;
  const spawnY = BOTTLE_AREA.neckY * 100;
  const drawableApplications = useMemo(
    () => applications.filter((application) => positions.has(application.id)),
    [applications, positions],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let frame = 0;
    let completed = false;
    const context = canvas.getContext("2d");
    if (!context) return;
    const ctx = context;

    const startedAt = performance.now();
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      return rect;
    };

    function draw(now: number) {
      const rect = resize();
      frame = 0;
      ctx.clearRect(0, 0, rect.width, rect.height);
      drawBottleAtmosphere(ctx, rect.width, rect.height);

      const falling = fallingId && !reducedMotion;
      const elapsed = Math.min(1, (now - startedAt) / 800);
      const eased = 1 - Math.pow(1 - elapsed, 2);
      const bounce = elapsed > 0.72 ? Math.sin((elapsed - 0.72) * Math.PI * 7) * 4 * (1 - elapsed) : 0;

      drawableApplications.forEach((application) => {
        const position = positions.get(application.id);
        if (!position) return;
        const targetX = (position.xPct / 100) * rect.width;
        const targetY = (position.yPct / 100) * rect.height;
        const startX = (spawnX / 100) * rect.width;
        const startY = (spawnY / 100) * rect.height;
        const isFalling = application.id === fallingId && falling;
        const x = isFalling ? startX + (targetX - startX) * eased : targetX;
        const y = isFalling ? startY + (targetY - startY) * eased + bounce : targetY;
        const scale = isFalling ? 0.72 + 0.28 * eased : 1;
        drawApplicationStar(ctx, application, position, x, y, scale);
      });

      if (falling && elapsed < 1) {
        frame = window.requestAnimationFrame(draw);
      } else if (fallingId && !completed) {
        completed = true;
        onFallComplete();
      }
    }

    frame = window.requestAnimationFrame(draw);
    const observer = new ResizeObserver(() => {
      if (!frame) frame = window.requestAnimationFrame(draw);
    });
    observer.observe(canvas);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [drawableApplications, fallingId, onFallComplete, positions, reducedMotion, spawnX, spawnY]);

  return (
    <div
      id="application-bottle-target"
      className="relative mx-auto aspect-[0.78] w-full max-w-[560px] overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-x-[14%] bottom-[8%] top-[12%] z-0 rounded-[46%] bg-[color:var(--bottle-glass)] shadow-[inset_0_-80px_90px_rgba(74,81,112,0.34),0_0_80px_rgba(143,134,240,0.1)]" />
      <div className="pointer-events-none absolute inset-x-[19%] bottom-[10%] top-[18%] z-[1] rounded-[45%] bg-[radial-gradient(circle_at_50%_70%,rgba(74,81,112,.38),transparent_55%),linear-gradient(180deg,rgba(24,36,72,.1),rgba(11,18,38,.42))]" />

      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-10 h-full w-full"
        aria-hidden="true"
      />

      <div className="absolute inset-0 z-20 overflow-hidden">
        {applications.length === 0 ? (
          <div className="absolute inset-x-[20%] bottom-[28%] text-center">
            <p className="font-display text-lg text-ink-primary">这个秋天，从捕获第一颗星开始</p>
            <a
              href="/explore"
              className="gold-button mt-4 inline-flex h-9 items-center rounded-full px-4 text-sm font-medium"
            >
              去探索
            </a>
          </div>
        ) : null}

        {drawableApplications.map((application) => {
          const position = positions.get(application.id);
          if (!position) return null;

          return (
            <button
              key={application.id}
              type="button"
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-[color:var(--arcane)]"
              style={{
                left: `${position.xPct}%`,
                top: `${position.yPct}%`,
                width: Math.max(position.size + 14, 32),
                height: Math.max(position.size + 14, 32),
                border: selectedId === application.id ? "1px solid rgba(255,217,142,.5)" : "1px solid transparent",
              }}
              aria-label={`查看 ${application.job.company_name} 的投递进度`}
              onClick={() => onSelect(application)}
              onMouseEnter={() => onHover(application.id)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(application.id)}
              onBlur={() => onHover(null)}
            />
          );
        })}
      </div>

      <Image
        src="/assets/star-bottle-image2.png"
        alt=""
        fill
        priority
        sizes="(max-width: 640px) 92vw, 560px"
        className="pointer-events-none absolute inset-0 z-30 object-contain opacity-90 mix-blend-screen"
        aria-hidden="true"
      />
    </div>
  );
}

function drawBottleAtmosphere(context: CanvasRenderingContext2D, width: number, height: number) {
  const glow = context.createRadialGradient(width * 0.5, height * 0.72, 10, width * 0.5, height * 0.72, width * 0.34);
  glow.addColorStop(0, "rgba(255,217,142,0.08)");
  glow.addColorStop(0.42, "rgba(143,134,240,0.05)");
  glow.addColorStop(1, "rgba(11,18,38,0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  context.fillStyle = "rgba(74,81,112,0.26)";
  context.beginPath();
  context.ellipse(width * 0.5, height * 0.8, width * 0.27, height * 0.04, 0, 0, Math.PI * 2);
  context.fill();
}

function drawApplicationStar(
  context: CanvasRenderingContext2D,
  application: ApplicationWithJob,
  position: BottleStackPosition,
  x: number,
  y: number,
  scale: number,
) {
  const status = application.status;
  const size = position.size * scale;
  const ended = status === "rejected" || status === "withdrawn";
  const offer = status === "offer";

  context.save();
  context.translate(x, y);
  context.rotate((position.rotate * Math.PI) / 180);

  if (ended) {
    context.fillStyle = "rgba(122,130,168,0.62)";
    context.beginPath();
    context.arc(0, 0, size / 2, 0, Math.PI * 2);
    context.fill();
    context.restore();
    return;
  }

  const halo = context.createRadialGradient(0, 0, size * 0.1, 0, 0, size * (offer ? 1.35 : 1.05));
  halo.addColorStop(0, offer ? "rgba(255,246,227,0.72)" : "rgba(255,246,227,0.52)");
  halo.addColorStop(0.32, "rgba(255,217,142,0.32)");
  halo.addColorStop(1, "rgba(255,194,160,0)");
  context.fillStyle = halo;
  context.beginPath();
  context.arc(0, 0, size * (offer ? 1.35 : 1.05), 0, Math.PI * 2);
  context.fill();

  const gradient = context.createLinearGradient(-size / 2, -size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "#FFF6E3");
  gradient.addColorStop(0.55, "#FFD98E");
  gradient.addColorStop(1, "#FFC2A0");
  context.fillStyle = gradient;
  context.beginPath();
  context.moveTo(0, -size / 2);
  context.quadraticCurveTo(size * 0.1, -size * 0.1, size / 2, 0);
  context.quadraticCurveTo(size * 0.1, size * 0.1, 0, size / 2);
  context.quadraticCurveTo(-size * 0.1, size * 0.1, -size / 2, 0);
  context.quadraticCurveTo(-size * 0.1, -size * 0.1, 0, -size / 2);
  context.fill();

  context.strokeStyle = "rgba(255,246,227,0.54)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(-size * 0.42, 0);
  context.lineTo(size * 0.42, 0);
  context.moveTo(0, -size * 0.42);
  context.lineTo(0, size * 0.42);
  context.stroke();
  context.restore();
}
