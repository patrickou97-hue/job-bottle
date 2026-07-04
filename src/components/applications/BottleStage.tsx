"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { BOTTLE_AREA, type BottleStackPosition } from "@/components/applications/bottleGeometry";
import {
  BOTTLE_COORDINATE_HEIGHT,
  BOTTLE_COORDINATE_WIDTH,
  BOTTLE_INNER_PATH,
} from "@/lib/bottleShape";
import type { ApplicationStatus, ApplicationWithJob } from "@/lib/types";

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

      const falling = fallingId && !reducedMotion;
      const elapsed = Math.min(1, (now - startedAt) / 800);
      const eased = 1 - Math.pow(1 - elapsed, 2);
      const bounce = elapsed > 0.72 ? Math.sin((elapsed - 0.72) * Math.PI * 7) * 4 * (1 - elapsed) : 0;

      clipToBottleInterior(ctx, rect.width, rect.height);
      drawBottleAtmosphere(ctx, rect.width, rect.height);
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
      ctx.restore();

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
      className="relative mx-auto aspect-[2/3] w-full max-w-[520px] overflow-hidden"
    >
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
  const glow = context.createRadialGradient(width * 0.5, height * 0.62, 8, width * 0.5, height * 0.62, width * 0.24);
  glow.addColorStop(0, "rgba(199,226,255,0.08)");
  glow.addColorStop(0.48, "rgba(143,184,240,0.045)");
  glow.addColorStop(1, "rgba(11,18,38,0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);
}

function clipToBottleInterior(context: CanvasRenderingContext2D, width: number, height: number) {
  const scaleX = width / BOTTLE_COORDINATE_WIDTH;
  const scaleY = height / BOTTLE_COORDINATE_HEIGHT;

  context.save();
  context.scale(scaleX, scaleY);
  context.clip(new Path2D(BOTTLE_INNER_PATH));
  context.scale(1 / scaleX, 1 / scaleY);
}

function drawApplicationStar(
  context: CanvasRenderingContext2D,
  application: ApplicationWithJob,
  position: BottleStackPosition,
  x: number,
  y: number,
  scale: number,
) {
  const palette = getStarPalette(application.status);
  const size = position.size * scale;

  context.save();
  context.translate(x, y);
  context.rotate((position.rotate * Math.PI) / 180);
  context.globalAlpha = palette.alpha;

  const halo = context.createRadialGradient(0, 0, size * 0.08, 0, 0, size * palette.haloScale);
  halo.addColorStop(0, palette.haloInner);
  halo.addColorStop(0.42, palette.haloMid);
  halo.addColorStop(1, palette.haloOuter);
  context.fillStyle = halo;
  context.beginPath();
  context.arc(0, 0, size * palette.haloScale, 0, Math.PI * 2);
  context.fill();

  const gradient = context.createLinearGradient(-size / 2, -size / 2, size / 2, size / 2);
  gradient.addColorStop(0, palette.fillStart);
  gradient.addColorStop(0.58, palette.fillMid);
  gradient.addColorStop(1, palette.fillEnd);
  context.fillStyle = gradient;
  drawFivePointStarPath(context, size * 0.54, size * 0.24);
  context.fill();

  context.strokeStyle = palette.stroke;
  context.lineWidth = 1;
  drawFivePointStarPath(context, size * 0.54, size * 0.24);
  context.stroke();

  context.strokeStyle = palette.spark;
  context.lineWidth = 0.8;
  context.beginPath();
  context.moveTo(-size * 0.22, 0);
  context.lineTo(size * 0.22, 0);
  context.moveTo(0, -size * 0.22);
  context.lineTo(0, size * 0.22);
  context.stroke();
  context.restore();
}

function drawFivePointStarPath(
  context: CanvasRenderingContext2D,
  outerRadius: number,
  innerRadius: number,
) {
  context.beginPath();
  for (let index = 0; index < 10; index += 1) {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
}

function getStarPalette(status: ApplicationStatus) {
  const palettes: Record<ApplicationStatus, {
    alpha: number;
    haloScale: number;
    haloInner: string;
    haloMid: string;
    haloOuter: string;
    fillStart: string;
    fillMid: string;
    fillEnd: string;
    stroke: string;
    spark: string;
  }> = {
    opened: {
      alpha: 0.78,
      haloScale: 0.72,
      haloInner: "rgba(216,232,255,0.34)",
      haloMid: "rgba(117,157,210,0.16)",
      haloOuter: "rgba(89,118,170,0)",
      fillStart: "#D9E9FF",
      fillMid: "#87A8D4",
      fillEnd: "#354C71",
      stroke: "rgba(220,236,255,0.42)",
      spark: "rgba(232,242,255,0.42)",
    },
    applied: {
      alpha: 0.84,
      haloScale: 0.76,
      haloInner: "rgba(231,240,255,0.42)",
      haloMid: "rgba(144,174,214,0.2)",
      haloOuter: "rgba(107,137,185,0)",
      fillStart: "#ECF4FF",
      fillMid: "#A9C2E4",
      fillEnd: "#456184",
      stroke: "rgba(236,246,255,0.5)",
      spark: "rgba(245,250,255,0.5)",
    },
    written_test: {
      alpha: 0.88,
      haloScale: 0.8,
      haloInner: "rgba(225,231,255,0.46)",
      haloMid: "rgba(146,144,220,0.24)",
      haloOuter: "rgba(105,103,180,0)",
      fillStart: "#EEF1FF",
      fillMid: "#AEB4EA",
      fillEnd: "#4B527F",
      stroke: "rgba(235,239,255,0.52)",
      spark: "rgba(245,247,255,0.54)",
    },
    first_round: {
      alpha: 0.9,
      haloScale: 0.84,
      haloInner: "rgba(214,246,255,0.5)",
      haloMid: "rgba(110,194,214,0.24)",
      haloOuter: "rgba(85,160,190,0)",
      fillStart: "#E2FAFF",
      fillMid: "#91D5E7",
      fillEnd: "#356B86",
      stroke: "rgba(224,249,255,0.56)",
      spark: "rgba(246,253,255,0.58)",
    },
    second_round: {
      alpha: 0.93,
      haloScale: 0.88,
      haloInner: "rgba(220,243,255,0.55)",
      haloMid: "rgba(126,176,234,0.28)",
      haloOuter: "rgba(90,130,210,0)",
      fillStart: "#E6F6FF",
      fillMid: "#9AC7F0",
      fillEnd: "#3D608E",
      stroke: "rgba(231,247,255,0.6)",
      spark: "rgba(247,252,255,0.62)",
    },
    final_round: {
      alpha: 0.96,
      haloScale: 0.92,
      haloInner: "rgba(236,246,255,0.62)",
      haloMid: "rgba(151,192,245,0.34)",
      haloOuter: "rgba(115,153,224,0)",
      fillStart: "#F2F9FF",
      fillMid: "#B4D2F4",
      fillEnd: "#4D6C99",
      stroke: "rgba(240,249,255,0.64)",
      spark: "rgba(255,255,255,0.68)",
    },
    offer: {
      alpha: 1,
      haloScale: 0.96,
      haloInner: "rgba(255,247,229,0.7)",
      haloMid: "rgba(255,218,148,0.34)",
      haloOuter: "rgba(255,186,128,0)",
      fillStart: "#FFF7E5",
      fillMid: "#FFD98E",
      fillEnd: "#C9904C",
      stroke: "rgba(255,248,232,0.76)",
      spark: "rgba(255,252,240,0.78)",
    },
    rejected: {
      alpha: 0.42,
      haloScale: 0.58,
      haloInner: "rgba(148,157,184,0.2)",
      haloMid: "rgba(90,98,124,0.1)",
      haloOuter: "rgba(70,78,102,0)",
      fillStart: "#A8B0C8",
      fillMid: "#636D87",
      fillEnd: "#2B3243",
      stroke: "rgba(185,193,214,0.24)",
      spark: "rgba(210,216,232,0.22)",
    },
    withdrawn: {
      alpha: 0.36,
      haloScale: 0.54,
      haloInner: "rgba(127,139,166,0.18)",
      haloMid: "rgba(84,95,120,0.08)",
      haloOuter: "rgba(64,72,96,0)",
      fillStart: "#96A0BA",
      fillMid: "#566079",
      fillEnd: "#272D3D",
      stroke: "rgba(170,179,204,0.22)",
      spark: "rgba(200,208,230,0.2)",
    },
  };

  return palettes[status];
}
