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
        "field-shell h-10 w-full rounded-2xl px-3 text-sm placeholder:text-ink-muted",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
