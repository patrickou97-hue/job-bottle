import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div data-slot="select-wrapper" className="relative w-full min-w-0">
      <select
        data-slot="select"
        className={cn(
          "field-shell field-select peer h-11 w-full min-w-0 appearance-none px-3.5 pr-10 text-sm placeholder:text-ink-muted",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted transition-opacity peer-disabled:opacity-40"
        strokeWidth={1.8}
      />
    </div>
  );
}
