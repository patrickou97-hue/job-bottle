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
      <Navbar />
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
