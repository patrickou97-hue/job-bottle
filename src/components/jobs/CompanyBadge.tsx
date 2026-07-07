import { getCompactCompanyLabelStyle, getCompanyInitials } from "@/lib/utils";

export function CompanyBadge({
  companyName,
  logoUrl,
  size = "md",
}: {
  companyName: string;
  logoUrl?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = size === "sm" ? "size-9" : size === "lg" ? "size-16" : "size-12";
  const sizePx = size === "sm" ? 36 : size === "lg" ? 64 : 48;
  const label = getCompanyInitials(companyName);
  const labelStyle = getCompactCompanyLabelStyle(label, sizePx, {
    minFontSize: 6,
    maxFontSize: size === "lg" ? 14 : 12,
    widthRatio: 0.68,
    heightRatio: 0.58,
  });

  return (
    <div
      className={`${sizeClass} relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[rgba(9,18,40,0.72)] text-sm font-semibold text-nebula-silver shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_40px_rgba(0,0,0,0.22)]`}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={`${companyName} 标识`} className="size-full object-cover" />
      ) : (
        <span
          className="flex min-w-0 items-center justify-center overflow-hidden text-center"
          style={labelStyle}
        >
          {label}
        </span>
      )}
    </div>
  );
}
