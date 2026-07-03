import type { ReactNode } from "react";
import { UserShell } from "@/components/layout/UserShell";

export function PageShell({ children }: { children: ReactNode }) {
  return <UserShell>{children}</UserShell>;
}
