import { cn } from "@/lib/utils";
import { vipCardNames, type VipCardEdition } from "@/lib/starjob-vip";

export function VipEditionLabel({ edition, className }: { edition?: VipCardEdition; className?: string }) {
  return (
    <span className={cn("vip-edition-label", className)} data-edition={edition} lang="en">
      {vipCardNames[edition ?? "vip"]}
    </span>
  );
}
