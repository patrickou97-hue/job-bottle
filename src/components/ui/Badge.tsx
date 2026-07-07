import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "status-pill inline-flex w-auto items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium leading-none",
        className,
      )}
    >
      {children}
    </span>
  );
}
