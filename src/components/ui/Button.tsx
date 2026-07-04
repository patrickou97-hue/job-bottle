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
        "inline-flex h-10 w-auto items-center justify-center whitespace-nowrap rounded-full px-4 text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" && "gold-button active:scale-[0.98]",
        variant === "secondary" &&
          "muted-button hover:border-nebula-blue/32 hover:bg-white/[0.07]",
        variant === "danger" &&
          "border border-red-400/30 bg-red-500/10 text-red-100 hover:bg-red-500/20",
        className,
      )}
      {...props}
    />
  );
}
