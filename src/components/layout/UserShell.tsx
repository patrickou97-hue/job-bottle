import type { ReactNode } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { SpaceShell } from "@/components/layout/SpaceShell";
import { RouteContentTransition } from "@/components/layout/RouteContentTransition";

export function UserShell({
  children,
  variant = "work",
}: {
  children: ReactNode;
  variant?: "scene" | "work";
}) {
  const content = (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[120] focus:rounded-lg focus:bg-[color:var(--surface-read-bg-strong)] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-ink-primary focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--aurora)]"
      >
        跳到主要内容
      </a>
      <Navbar appearance={variant} />
      <RouteContentTransition>{children}</RouteContentTransition>
    </>
  );

  if (variant === "scene") {
    return <SpaceShell variant="scene">{content}</SpaceShell>;
  }

  return (
    <SpaceShell>{content}</SpaceShell>
  );
}
