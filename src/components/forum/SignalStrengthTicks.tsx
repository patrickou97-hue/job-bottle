import { cn } from "@/lib/utils";

export function SignalStrengthTicks({ score }: { score: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`活跃度 ${score}/5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <span
          key={index}
          className={cn(
            "block h-2 w-0.5 rounded-full",
            index < score ? "bg-[color:var(--light-silver)] opacity-60" : "bg-[color:var(--light-muted)] opacity-20",
          )}
        />
      ))}
    </span>
  );
}
