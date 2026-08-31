import type { ReactNode } from "react";
import { UserShell } from "@/components/layout/UserShell";

export function PageShell({
  children,
  variant = "work",
  navigation = "default",
  contentClassName,
}: {
  children: ReactNode;
  variant?: "scene" | "work";
  navigation?: "default" | "minimal";
  contentClassName?: string;
}) {
  return (
    <UserShell variant={variant} navigation={navigation} contentClassName={contentClassName}>
      {children}
    </UserShell>
  );
}
