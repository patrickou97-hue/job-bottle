"use client";

import Image from "next/image";
import type { PointerEvent } from "react";
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
  const shakeRef = useRef({ x: 0, y: 0, lastX: 0, lastY: 0, hasPointer: false });
  const scheduleDrawRef = useRef<() => void>(() => undefined);
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
    let metrics = { height: 0, ratio: 1, width: 0 };

    const startedAt = performance.now();
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const pixelWidth = Math.max(1, Math.floor(rect.width * ratio));
      const pixelHeight = Math.max(1, Math.floor(rect.height * ratio));
      metrics = { height: rect.height, ratio, width: rect.width };
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      }
      scheduleDraw();
    };

    function scheduleDraw() {
      if (!frame) frame = window.requestAnimationFrame(draw);
    }

    scheduleDrawRef.current = scheduleDraw;

    function draw(now: number) {
      frame = 0;
      const { height, width } = metrics;
      if (width <= 0 || height <= 0) return;
      ctx.clearRect(0, 0, width, height);

      const falling = fallingId && !reducedMotion;
      const elapsed = Math.min(1, (now - startedAt) / 800);
      const eased = 1 - Math.pow(1 - elapsed, 2);
      const bounce = elapsed > 0.72 ? Math.sin((elapsed - 0.72) * Math.PI * 7) * 4 * (1 - elapsed) : 0;

      clipToBottleInterior(ctx, width, height);
      drawBottleAtmosphere(ctx, width, height);
      drawableApplications.forEach((application) => {
        const position = positions.get(application.id);
        if (!position) return;
        const targetX = (position.xPct / 100) * width;
        const targetY = (position.yPct / 100) * height;
        const startX = (spawnX / 100) * width;
        const startY = (spawnY / 100) * height;
        const isFalling = application.id === fallingId && falling;
        const depth = 0.46 + position.yPct / 180;
        const shimmer = Math.sin(now / 320 + position.rotate) * Math.min(2.6, Math.abs(shakeRef.current.x) * 0.12);
        const shakeX = reducedMotion ? 0 : shakeRef.current.x * depth + shimmer;
        const shakeY = reducedMotion ? 0 : shakeRef.current.y * depth * 0.42;
        const x = isFalling ? startX + (targetX - startX) * eased : targetX + shakeX;
        const y = isFalling ? startY + (targetY - startY) * eased + bounce : targetY + shakeY;
        const scale = isFalling ? 0.72 + 0.28 * eased : 1;
        drawApplicationStar(ctx, application, position, x, y, scale);
      });
      ctx.restore();

      shakeRef.current.x *= 0.86;
      shakeRef.current.y *= 0.82;
      if (falling && elapsed < 1) {
        frame = window.requestAnimationFrame(draw);
      } else if (!reducedMotion && (Math.abs(shakeRef.current.x) > 0.16 || Math.abs(shakeRef.current.y) > 0.16)) {
        frame = window.requestAnimationFrame(draw);
      } else if (fallingId && !completed) {
        completed = true;
        onFallComplete();
      }
    }

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      scheduleDrawRef.current = () => undefined;
      observer.disconnect();
    };
  }, [drawableApplications, fallingId, onFallComplete, positions, reducedMotion, spawnX, spawnY]);

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (reducedMotion) return;
    const shake = shakeRef.current;
    if (!shake.hasPointer) {
      shake.lastX = event.clientX;
      shake.lastY = event.clientY;
      shake.hasPointer = true;
      return;
    }
    const dx = event.clientX - shake.lastX;
    const dy = event.clientY - shake.lastY;
    shake.lastX = event.clientX;
    shake.lastY = event.clientY;
    shake.x = clamp(shake.x + dx * 0.34, -22, 22);
    shake.y = clamp(shake.y + dy * 0.26, -18, 18);
    scheduleDrawRef.current();
  }

  function handlePointerLeave() {
    shakeRef.current.hasPointer = false;
  }

  return (
    <div
      id="application-bottle-target"
      className="relative mx-auto aspect-[2/3] w-full max-w-[520px] overflow-hidden"
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
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
              className="gold-button mt-4 inline-flex h-9 items-center rounded-lg px-4 text-sm font-medium"
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
                border: selectedId === application.id ? "1px solid rgba(126,124,181,.56)" : "1px solid transparent",
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function drawBottleAtmosphere(context: CanvasRenderingContext2D, width: number, height: number) {
  const glow = context.createRadialGradient(width * 0.5, height * 0.62, 8, width * 0.5, height * 0.62, width * 0.24);
  glow.addColorStop(0, "rgba(126,124,181,0.1)");
  glow.addColorStop(0.48, "rgba(86,74,113,0.06)");
  glow.addColorStop(1, "rgba(0,0,1,0)");
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
  }> = {
    opened: {
      alpha: 0.86,
      haloScale: 0.72,
      haloInner: "rgba(128,176,218,0.36)",
      haloMid: "rgba(62,108,160,0.2)",
      haloOuter: "rgba(18,41,78,0)",
      fillStart: "#D9EDFF",
      fillMid: "#6F9BC9",
      fillEnd: "#12294E",
      stroke: "rgba(190,224,255,0.58)",
    },
    applied: {
      alpha: 0.84,
      haloScale: 0.76,
      haloInner: "rgba(201,197,228,0.34)",
      haloMid: "rgba(86,74,113,0.18)",
      haloOuter: "rgba(86,74,113,0)",
      fillStart: "#EEE9FF",
      fillMid: "#9188C8",
      fillEnd: "#12294E",
      stroke: "rgba(231,226,255,0.48)",
    },
    written_test: {
      alpha: 0.88,
      haloScale: 0.8,
      haloInner: "rgba(190,241,242,0.42)",
      haloMid: "rgba(91,164,178,0.24)",
      haloOuter: "rgba(91,164,178,0)",
      fillStart: "#E4FAFA",
      fillMid: "#6DAEBA",
      fillEnd: "#244C68",
      stroke: "rgba(215,249,249,0.58)",
    },
    first_round: {
      alpha: 0.9,
      haloScale: 0.84,
      haloInner: "rgba(242,222,233,0.42)",
      haloMid: "rgba(127,85,104,0.22)",
      haloOuter: "rgba(127,85,104,0)",
      fillStart: "#F1EFFF",
      fillMid: "#7F5568",
      fillEnd: "#564A71",
      stroke: "rgba(242,222,233,0.54)",
    },
    second_round: {
      alpha: 0.93,
      haloScale: 0.88,
      haloInner: "rgba(255,222,201,0.46)",
      haloMid: "rgba(181,122,91,0.26)",
      haloOuter: "rgba(181,122,91,0)",
      fillStart: "#FFE8D7",
      fillMid: "#B57A5B",
      fillEnd: "#564A71",
      stroke: "rgba(255,229,210,0.62)",
    },
    final_round: {
      alpha: 0.96,
      haloScale: 0.92,
      haloInner: "rgba(255,239,202,0.52)",
      haloMid: "rgba(205,172,105,0.3)",
      haloOuter: "rgba(205,172,105,0)",
      fillStart: "#FFF4D5",
      fillMid: "#D0AF70",
      fillEnd: "#7F5568",
      stroke: "rgba(255,242,207,0.68)",
    },
    offer: {
      alpha: 1,
      haloScale: 0.96,
      haloInner: "rgba(255,225,132,0.62)",
      haloMid: "rgba(201,151,60,0.38)",
      haloOuter: "rgba(201,151,60,0)",
      fillStart: "#FFF4C6",
      fillMid: "#C9973C",
      fillEnd: "#5B3A16",
      stroke: "rgba(255,232,153,0.82)",
    },
    rejected: {
      alpha: 0.42,
      haloScale: 0.58,
      haloInner: "rgba(145,140,174,0.18)",
      haloMid: "rgba(86,74,113,0.1)",
      haloOuter: "rgba(18,41,78,0)",
      fillStart: "#918CAE",
      fillMid: "#564A71",
      fillEnd: "#12294E",
      stroke: "rgba(201,197,228,0.22)",
    },
    withdrawn: {
      alpha: 0.36,
      haloScale: 0.54,
      haloInner: "rgba(145,140,174,0.16)",
      haloMid: "rgba(18,41,78,0.08)",
      haloOuter: "rgba(0,0,1,0)",
      fillStart: "#918CAE",
      fillMid: "#12294E",
      fillEnd: "#000001",
      stroke: "rgba(201,197,228,0.2)",
    },
  };

  return palettes[status];
}
