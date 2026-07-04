import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const MAX_SCENE_GLOW_ELEMENTS = 5;
export const MAX_HOME_ORBIT_LINES = 4;

export type OrbMaterialVariant = "blue" | "violet" | "gold" | "muted";

const ORB_PALETTE: Record<
  OrbMaterialVariant,
  {
    light: string;
    main: string;
    dark: string;
    glow: string;
    icon: string;
  }
> = {
  blue: {
    light: "rgba(224,236,255,0.82)",
    main: "rgba(75,103,154,0.78)",
    dark: "rgba(6,13,30,0.98)",
    glow: "rgba(126,158,214,0.2)",
    icon: "rgba(230,238,250,0.76)",
  },
  violet: {
    light: "rgba(224,220,248,0.68)",
    main: "rgba(82,75,128,0.76)",
    dark: "rgba(12,9,28,0.98)",
    glow: "rgba(142,132,205,0.17)",
    icon: "rgba(229,224,248,0.74)",
  },
  gold: {
    light: "rgba(255,248,218,0.86)",
    main: "rgba(185,155,82,0.62)",
    dark: "rgba(18,14,24,0.96)",
    glow: "rgba(222,197,137,0.22)",
    icon: "rgba(255,247,218,0.82)",
  },
  muted: {
    light: "rgba(218,226,240,0.48)",
    main: "rgba(60,70,92,0.62)",
    dark: "rgba(8,10,18,0.98)",
    glow: "rgba(145,160,190,0.12)",
    icon: "rgba(220,228,240,0.62)",
  },
};

export function OrbMaterial({
  size,
  variant = "blue",
  active = false,
  icon,
  className,
}: {
  size: number | string;
  variant?: OrbMaterialVariant;
  active?: boolean;
  icon?: ReactNode;
  className?: string;
}) {
  const palette = ORB_PALETTE[variant];
  const style: CSSProperties = {
    width: size,
    height: size,
    background: [
      `radial-gradient(circle at 28% 24%, ${palette.light} 0 4%, ${palette.main} 30%, ${palette.dark} 74%)`,
      "radial-gradient(circle at 76% 78%, rgba(0,0,0,0.55) 0 36%, transparent 60%)",
    ].join(", "),
    boxShadow: active
      ? `0 0 34px ${palette.glow}, inset -12px -16px 28px rgba(0,0,0,0.56), inset 8px 7px 18px rgba(237,240,255,0.08)`
      : `0 0 18px ${palette.glow}, inset -10px -14px 24px rgba(0,0,0,0.58), inset 7px 6px 16px rgba(237,240,255,0.06)`,
  };

  return (
    <span
      className={cn(
        "relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full",
        className,
      )}
      style={style}
      data-orb-material
      data-glow={active ? "true" : "false"}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle at 76% 78%, rgba(1,5,15,0.55) 0 38%, transparent 64%)",
        }}
      />
      <span
        aria-hidden="true"
        className="absolute inset-[1px] rounded-full"
        style={{
          background: "conic-gradient(from 300deg, rgba(237,240,255,0.42) 0deg 40deg, transparent 52deg 360deg)",
          maskImage: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))",
          WebkitMaskImage: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))",
        }}
      />
      <span
        aria-hidden="true"
        className="absolute left-[27%] top-[22%] rounded-full"
        style={{
          width: "clamp(2px, 8%, 3px)",
          height: "clamp(2px, 8%, 3px)",
          background: "rgba(237,240,255,0.78)",
          boxShadow: "0 0 8px rgba(237,240,255,0.36)",
        }}
      />
      {icon ? (
        <span className="relative z-10 inline-flex items-center justify-center" style={{ color: palette.icon }}>
          {icon}
        </span>
      ) : null}
    </span>
  );
}
