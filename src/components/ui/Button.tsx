import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "pressable inline-flex min-h-11 w-auto items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm font-medium transition disabled:pointer-events-none disabled:opacity-45",
        variant === "primary" && "gold-button",
        variant === "secondary" &&
          "muted-button",
        variant === "danger" &&
          "bg-[rgba(127,85,104,0.16)] text-[color:var(--text-danger)] hover:bg-[rgba(127,85,104,0.24)]",
        className,
      )}
      {...props}
    />
  );
}
