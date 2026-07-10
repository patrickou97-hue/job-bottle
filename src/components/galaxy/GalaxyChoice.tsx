import Link from "next/link";
import Image from "next/image";

export function GalaxyChoice({
  href,
  title,
  description,
  imageSrc,
  tone,
}: {
  href: string;
  title: string;
  description: string;
  imageSrc: string;
  tone: string;
}) {
  return (
    <Link href={href} className="group relative min-h-[280px] overflow-hidden rounded-lg border-t border-white/[0.14] bg-[#12294E]/42 p-7 outline-none transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:bg-[#564A71]/48 focus-visible:ring-2 focus-visible:ring-[color:var(--star-apricot)] sm:p-8">
      <Image
        src={imageSrc}
        alt=""
        fill
        sizes="(max-width: 1024px) 100vw, 50vw"
        className="object-cover opacity-62 transition duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.035] group-hover:opacity-78"
      />
      <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,1,0.06),rgba(0,0,1,0.72))]" />
      <span className="absolute inset-x-8 top-7 h-px" style={{ background: tone }} />
      <span className="relative z-10 flex h-full flex-col justify-end">
        <span className="font-display text-3xl font-semibold text-ink-primary">{title}</span>
        <span className="mt-3 max-w-sm text-sm leading-6 text-ink-secondary">{description}</span>
      </span>
    </Link>
  );
}
