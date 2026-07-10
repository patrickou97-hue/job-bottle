import type { ReactNode } from "react";
import { UserShell } from "@/components/layout/UserShell";

export function PageShell({
  children,
  variant = "work",
}: {
  children: ReactNode;
  variant?: "scene" | "work";
}) {
  return <UserShell variant={variant}>{children}</UserShell>;
}
