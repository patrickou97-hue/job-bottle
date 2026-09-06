import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const MAX_SCENE_GLOW_ELEMENTS = 5;
export const MAX_HOME_ORBIT_LINES = 4;

export type OrbMaterialVariant = "blue" | "violet" | "cyan" | "gold" | "rose" | "apricot" | "cream" | "muted";

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
    light: "rgba(214,238,234,0.88)",
    main: "rgba(38,122,143,0.88)",
    dark: "rgba(7,29,54,0.98)",
    glow: "rgba(65,172,182,0.32)",
    icon: "rgba(226,248,241,0.9)",
  },
  violet: {
    light: "rgba(220,220,255,0.8)",
    main: "rgba(63,73,155,0.84)",
    dark: "rgba(13,19,57,0.98)",
    glow: "rgba(96,91,205,0.3)",
    icon: "rgba(238,237,255,0.86)",
  },
  cyan: {
    light: "rgba(208,244,247,0.92)",
    main: "rgba(67,144,163,0.85)",
    dark: "rgba(9,34,54,0.98)",
    glow: "rgba(77,181,192,0.3)",
    icon: "rgba(225,250,250,0.9)",
  },
  gold: {
    light: "rgba(255,239,184,0.94)",
    main: "rgba(196,130,43,0.9)",
    dark: "rgba(76,43,22,0.98)",
    glow: "rgba(224,161,55,0.38)",
    icon: "rgba(255,246,210,0.92)",
  },
  rose: {
    light: "rgba(255,220,205,0.84)",
    main: "rgba(163,78,74,0.82)",
    dark: "rgba(62,24,33,0.98)",
    glow: "rgba(204,96,82,0.3)",
    icon: "rgba(255,234,222,0.88)",
  },
  apricot: {
    light: "rgba(255,226,198,0.9)",
    main: "rgba(175,108,70,0.82)",
    dark: "rgba(73,36,28,0.98)",
    glow: "rgba(206,127,77,0.28)",
    icon: "rgba(255,239,216,0.9)",
  },
  cream: {
    light: "rgba(255,244,215,0.9)",
    main: "rgba(163,131,91,0.72)",
    dark: "rgba(55,41,32,0.98)",
    glow: "rgba(204,165,105,0.26)",
    icon: "rgba(255,248,226,0.88)",
  },
  muted: {
    light: "rgba(220,225,235,0.62)",
    main: "rgba(93,101,126,0.6)",
    dark: "rgba(25,28,43,0.98)",
    glow: "rgba(106,125,158,0.2)",
    icon: "rgba(228,232,239,0.74)",
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
      ? `0 0 34px ${palette.glow}, inset -12px -16px 28px rgba(0,0,0,0.56), inset 8px 7px 18px rgba(241,239,255,0.08)`
      : `0 0 18px ${palette.glow}, inset -10px -14px 24px rgba(0,0,0,0.58), inset 7px 6px 16px rgba(241,239,255,0.06)`,
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
          background: "conic-gradient(from 300deg, rgba(241,239,255,0.46) 0deg 40deg, transparent 52deg 360deg)",
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
          background: "rgba(241,239,255,0.82)",
          boxShadow: "0 0 8px rgba(241,239,255,0.38)",
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
