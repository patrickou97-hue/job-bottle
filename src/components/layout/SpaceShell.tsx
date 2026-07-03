import type { ReactNode } from "react";
import { SpaceBackground } from "@/components/layout/SpaceBackground";

export function SpaceShell({ children }: { children: ReactNode }) {
  return (
    <div className="space-root">
      <SpaceBackground />
      <div className="space-content">{children}</div>
    </div>
  );
}
