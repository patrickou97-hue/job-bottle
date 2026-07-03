"use client";

import { motion } from "motion/react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type NebulaNodeProps = {
  id: string;
  name: string;
  count: number;
  capturedCount?: number;
  imageSrc: string;
  variant: "region" | "industry" | "batch" | "captured";
  onClick: () => void;
  compact?: boolean;
};

const VARIANT_STYLE = {
  region: "hue-rotate-[-8deg] saturate-[0.92]",
  industry: "hue-rotate-[4deg] saturate-[0.9]",
  batch: "hue-rotate-[18deg] saturate-[0.82]",
  captured: "hue-rotate-[-12deg] saturate-[0.82]",
};

export function NebulaNode({
  id,
  name,
  count,
  capturedCount = 0,
  imageSrc,
  variant,
  onClick,
  compact = false,
}: NebulaNodeProps) {
  return (
    <motion.button
      type="button"
      layoutId={`nebula-${id}`}
      className={cn(
        "group relative isolate flex flex-col items-center justify-center outline-none",
        compact ? "min-h-36" : "min-h-48",
      )}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      onClick={onClick}
      aria-label={name}
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-8 top-1/2 h-16 -translate-y-1/2 rounded-full opacity-0 blur-3xl transition group-hover:opacity-70"
        style={{ background: "rgba(126,158,214,0.14)" }}
      />
      <Image
        src={imageSrc}
        alt=""
        width={compact ? 230 : 340}
        height={compact ? 150 : 220}
        priority={!compact}
        loading={compact ? "lazy" : "eager"}
        className={cn(
          "pointer-events-none relative z-0 w-full max-w-[20rem] object-contain opacity-76 transition duration-300 group-hover:opacity-100",
          compact ? "max-h-28" : "max-h-40",
          VARIANT_STYLE[variant],
        )}
      />
      <span className="relative z-10 -mt-3 text-sm font-medium text-nebula-silver/92">
        {name}
      </span>
      <span className="relative z-10 mt-1 text-xs text-ink-muted">
        {capturedCount > 0 ? `${count} 个岗位 · ${capturedCount} 已捕获` : `${count} 个岗位`}
      </span>
    </motion.button>
  );
}
