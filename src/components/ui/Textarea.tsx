import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "field-shell min-h-28 w-full px-3.5 py-3 text-sm leading-6 placeholder:text-ink-muted",
        className,
      )}
      {...props}
    />
  );
}
