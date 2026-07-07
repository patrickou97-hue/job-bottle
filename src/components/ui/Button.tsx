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
        "pressable inline-flex h-10 w-auto items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium transition disabled:pointer-events-none disabled:opacity-45",
        variant === "primary" && "gold-button",
        variant === "secondary" &&
          "muted-button hover:bg-white/[0.07] active:bg-white/[0.09]",
        variant === "danger" &&
          "bg-[rgba(245,138,158,0.1)] text-[color:var(--text-danger)] hover:bg-[rgba(245,138,158,0.16)]",
        className,
      )}
      {...props}
    />
  );
}
