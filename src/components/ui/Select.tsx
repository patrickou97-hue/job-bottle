import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "field-shell h-11 w-full px-0 text-sm placeholder:text-ink-muted",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
