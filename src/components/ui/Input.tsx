import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      data-slot="input"
      className={cn(
        "field-shell field-input h-11 w-full min-w-0 px-3.5 text-sm placeholder:text-ink-muted",
        className,
      )}
      {...props}
    />
  );
}
