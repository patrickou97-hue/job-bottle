import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "field-shell min-h-24 w-full rounded-2xl px-3 py-3 text-sm placeholder:text-ink-muted",
        className,
      )}
      {...props}
    />
  );
}
