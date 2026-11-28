import Image from "next/image";

export function VipMark({ large = false }: { large?: boolean }) {
  const size = large ? 464 : 80;
  return <Image src={large ? "/brand/starjob-vip-metal.webp" : "/brand/starjob-vip-nav.webp"} width={size} height={size} unoptimized alt="" aria-hidden="true" className="vip-metal-mark" />;
}
