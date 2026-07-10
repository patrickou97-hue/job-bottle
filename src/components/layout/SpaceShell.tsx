import type { ReactNode } from "react";
import { SpaceBackground } from "@/components/layout/SpaceBackground";

export function SpaceShell({
  children,
  variant = "work",
}: {
  children: ReactNode;
  variant?: "scene" | "work";
}) {
  return (
    <div className={`space-root space-root--${variant}`}>
      <SpaceBackground variant={variant} />
      <div className="space-content">{children}</div>
    </div>
  );
}
