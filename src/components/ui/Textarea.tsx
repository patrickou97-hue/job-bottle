import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "field-shell field-textarea min-h-28 w-full px-4 py-3.5 text-sm leading-6 placeholder:text-ink-muted",
        className,
      )}
      {...props}
    />
  );
}
