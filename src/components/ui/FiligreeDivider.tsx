import { DiamondDot } from "@/components/ui/DiamondDot";
import { cn } from "@/lib/utils";

export function FiligreeDivider({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("flex items-center gap-3 text-[color:var(--filigree)]", className)}
    >
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[color:var(--filigree)] to-[color:var(--filigree)]/35" />
      <DiamondDot className="size-1.5" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent via-[color:var(--filigree)] to-[color:var(--filigree)]/35" />
    </div>
  );
}
