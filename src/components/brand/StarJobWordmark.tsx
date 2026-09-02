import Image from "next/image";
import { cn } from "@/lib/utils";

export function StarJobWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("starjob-wordmark", className)} aria-hidden="true">
      <Image
        src="/brand/starjob-wordmark-lockup.png"
        alt=""
        width={2056}
        height={279}
        className="starjob-wordmark__image"
      />
    </span>
  );
}
