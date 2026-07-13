import type { ReactNode } from "react";
import { SpaceBackground } from "@/components/layout/SpaceBackground";
import { SceneArrivalVeil } from "@/components/layout/SceneArrivalVeil";

export function SpaceShell({
  children,
  variant = "work",
}: {
  children: ReactNode;
  variant?: "scene" | "work";
}) {
  return (
    <div className={`theme-${variant} space-root space-root--${variant}`}>
      <SpaceBackground variant={variant} />
      <div className="space-content">{children}</div>
      {variant === "work" ? <SceneArrivalVeil /> : null}
    </div>
  );
}
