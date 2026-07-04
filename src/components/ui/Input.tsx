import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "field-shell h-10 w-full px-0 text-sm placeholder:text-ink-muted",
        className,
      )}
      {...props}
    />
  );
}
