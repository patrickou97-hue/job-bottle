"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { layoutTransition } from "@/lib/motion";
import type { NebulaCategory } from "@/lib/nebula-groups";

const DESKTOP_NODE_Y_OFFSETS = [-6, 5, -3, 6, -5, 4, -6, 5, -3, 6, -5, 4, -6, 5, -3] as const;

export function NebulaDistributionMap({
  nodes,
  onSelect,
}: {
  nodes: NebulaCategory[];
  onSelect: (node: NebulaCategory) => void;
}) {
  const reducedMotion = useReducedMotion();
  const maxCount = Math.max(1, ...nodes.map((node) => node.count));

  if (nodes.length === 0) {
    return <div className="empty-state min-h-64">当前维度暂无岗位</div>;
  }

  return (
    <div className="relative">
      <div className="mb-4 flex items-center justify-between gap-4 text-xs text-ink-muted">
        <span>星系越大，岗位越多</span>
        <span className="tabular-nums">{nodes.length} 个分组</span>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-5 md:hidden">
        {nodes.map((node) => (
          <DensityNode key={node.id} node={node} maxCount={maxCount} onSelect={onSelect} reducedMotion={Boolean(reducedMotion)} />
        ))}
      </div>

      <div className="relative hidden overflow-hidden border-y border-white/[0.08] py-6 md:block">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle,rgba(201,197,228,.24)_0_1px,transparent_1.5px)] [background-size:64px_64px]" />
        <svg aria-hidden="true" className="absolute inset-0 size-full opacity-30" viewBox="0 0 1000 520" preserveAspectRatio="none">
          <path d="M75 296 C180 75 365 80 470 228 S735 350 930 92" fill="none" stroke="rgba(126,124,181,.34)" strokeWidth="1" strokeDasharray="4 10" />
          <path d="M110 106 C315 440 565 15 920 390" fill="none" stroke="rgba(127,85,104,.22)" strokeWidth="1" strokeDasharray="3 12" />
        </svg>
        <div className="relative grid grid-cols-[repeat(3,minmax(0,1fr))] items-center gap-x-4 gap-y-7 lg:grid-cols-[repeat(4,minmax(0,1fr))] xl:grid-cols-[repeat(5,minmax(0,1fr))]">
          {nodes.map((node, index) => (
            <div
              key={node.id}
              className="flex min-w-0 justify-center"
              style={{ transform: `translateY(${DESKTOP_NODE_Y_OFFSETS[index % DESKTOP_NODE_Y_OFFSETS.length]}px)` }}
            >
              <DensityNode node={node} maxCount={maxCount} onSelect={onSelect} reducedMotion={Boolean(reducedMotion)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DensityNode({
  node,
  maxCount,
  onSelect,
  reducedMotion,
}: {
  node: NebulaCategory;
  maxCount: number;
  onSelect: (node: NebulaCategory) => void;
  reducedMotion: boolean;
}) {
  const ratio = Math.sqrt(node.count / maxCount);
  const width = Math.round(112 + ratio * 86);

  return (
    <motion.button
      type="button"
      layout
      className="group relative flex min-h-32 w-full min-w-0 flex-col items-center justify-center outline-none"
      onClick={() => onSelect(node)}
      whileHover={reducedMotion ? undefined : { scale: 1.025 }}
      whileTap={reducedMotion ? undefined : { scale: 0.98 }}
      transition={layoutTransition}
      aria-label={`${node.name}，${node.count} 个岗位`}
    >
      <Image
        src={node.imageSrc}
        alt=""
        width={width}
        height={Math.round(width * 0.58)}
        className={cn(
          "pointer-events-none h-auto max-w-full object-contain opacity-84 transition-opacity duration-200 group-hover:opacity-100",
          node.variant === "region" && "hue-rotate-[-8deg]",
          node.variant === "category" && "hue-rotate-[18deg] saturate-[0.82]",
          node.variant === "captured" && "hue-rotate-[-12deg] saturate-[0.82]",
        )}
      />
      <span className="-mt-2 max-w-44 truncate text-sm font-medium text-ink-primary">{node.name}</span>
      <span className="mt-1 text-xs tabular-nums text-ink-muted">
        {node.count} 个岗位{node.capturedCount ? ` · ${node.capturedCount} 已收录` : ""}
      </span>
    </motion.button>
  );
}
