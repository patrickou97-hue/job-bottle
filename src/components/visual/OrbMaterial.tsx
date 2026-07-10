import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const MAX_SCENE_GLOW_ELEMENTS = 5;
export const MAX_HOME_ORBIT_LINES = 4;

export type OrbMaterialVariant = "blue" | "violet" | "gold" | "rose" | "cream" | "muted";

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
    light: "rgba(231,226,255,0.84)",
    main: "rgba(126,124,181,0.72)",
    dark: "rgba(18,41,78,0.94)",
    glow: "rgba(126,124,181,0.24)",
    icon: "rgba(241,239,255,0.8)",
  },
  violet: {
    light: "rgba(231,226,255,0.76)",
    main: "rgba(86,74,113,0.76)",
    dark: "rgba(18,41,78,0.94)",
    glow: "rgba(86,74,113,0.24)",
    icon: "rgba(241,239,255,0.78)",
  },
  gold: {
    light: "rgba(241,239,255,0.92)",
    main: "rgba(126,124,181,0.76)",
    dark: "rgba(86,74,113,0.94)",
    glow: "rgba(126,124,181,0.26)",
    icon: "rgba(241,239,255,0.84)",
  },
  rose: {
    light: "rgba(242,222,233,0.78)",
    main: "rgba(127,85,104,0.7)",
    dark: "rgba(86,74,113,0.94)",
    glow: "rgba(127,85,104,0.22)",
    icon: "rgba(242,222,233,0.8)",
  },
  cream: {
    light: "rgba(241,239,255,0.9)",
    main: "rgba(201,197,228,0.62)",
    dark: "rgba(18,41,78,0.94)",
    glow: "rgba(201,197,228,0.2)",
    icon: "rgba(241,239,255,0.82)",
  },
  muted: {
    light: "rgba(201,197,228,0.5)",
    main: "rgba(86,74,113,0.62)",
    dark: "rgba(0,0,1,0.96)",
    glow: "rgba(145,140,174,0.14)",
    icon: "rgba(201,197,228,0.64)",
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
      ? `0 0 34px ${palette.glow}, inset -12px -16px 28px rgba(0,0,0,0.56), inset 8px 7px 18px rgba(231,226,255,0.08)`
      : `0 0 18px ${palette.glow}, inset -10px -14px 24px rgba(0,0,0,0.58), inset 7px 6px 16px rgba(231,226,255,0.06)`,
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
          background: "radial-gradient(circle at 76% 78%, rgba(0,0,1,0.55) 0 38%, transparent 64%)",
        }}
      />
      <span
        aria-hidden="true"
        className="absolute inset-[1px] rounded-full"
        style={{
          background: "conic-gradient(from 300deg, rgba(231,226,255,0.42) 0deg 40deg, transparent 52deg 360deg)",
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
          background: "rgba(231,226,255,0.78)",
          boxShadow: "0 0 8px rgba(231,226,255,0.36)",
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
