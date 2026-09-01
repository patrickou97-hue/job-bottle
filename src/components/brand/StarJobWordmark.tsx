import Image from "next/image";
import { cn } from "@/lib/utils";

export function StarJobWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("starjob-wordmark", className)} aria-hidden="true">
      <Image
        src="/brand/starjob-wordmark-v1.png"
        alt=""
        width={2104}
        height={327}
        className="starjob-wordmark__image"
      />
    </span>
  );
}
