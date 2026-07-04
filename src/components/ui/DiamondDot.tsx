import { cn } from "@/lib/utils";

export function DiamondDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-1 rotate-45 rounded-[1px] bg-[color:var(--filigree)]",
        className,
      )}
    />
  );
}
