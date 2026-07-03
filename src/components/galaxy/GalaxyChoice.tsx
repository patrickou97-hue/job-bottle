import Link from "next/link";

export function GalaxyChoice({
  href,
  title,
  description,
  tone,
}: {
  href: string;
  title: string;
  description: string;
  tone: string;
}) {
  return (
    <Link href={href} className="group relative min-h-[260px] overflow-hidden rounded-[30px] p-8 outline-none">
      <span
        className="absolute inset-6 rounded-full blur-3xl transition duration-500 group-hover:scale-110"
        style={{ background: `radial-gradient(circle, ${tone}, transparent 70%)` }}
      />
      <span className="absolute inset-0 bg-black/5" />
      <span className="relative z-10 flex h-full flex-col justify-end">
        <span className="font-display text-3xl font-semibold text-ink-primary">{title}</span>
        <span className="mt-3 max-w-sm text-sm leading-6 text-ink-secondary">{description}</span>
      </span>
    </Link>
  );
}
