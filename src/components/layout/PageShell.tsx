import type { ReactNode } from "react";
import { UserShell } from "@/components/layout/UserShell";

export function PageShell({
  children,
  variant = "work",
  navigation = "default",
  showSiteFooter = true,
  contentClassName,
}: {
  children: ReactNode;
  variant?: "scene" | "work";
  navigation?: "default" | "minimal";
  showSiteFooter?: boolean;
  contentClassName?: string;
}) {
  return (
    <UserShell variant={variant} navigation={navigation} showSiteFooter={showSiteFooter} contentClassName={contentClassName}>
      {children}
    </UserShell>
  );
}
