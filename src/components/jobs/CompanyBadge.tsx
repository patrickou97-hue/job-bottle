import { getCompanyInitials } from "@/lib/utils";

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
  const label = getCompanyInitials(companyName);
  const labelLength = Array.from(label).length;
  const fontSize = labelLength >= 5 ? 8 : labelLength >= 4 ? 9 : labelLength >= 3 ? 10 : 14;

  return (
    <div
      className={`${sizeClass} relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-nebula-silver/18 bg-void-800 text-sm font-semibold text-nebula-silver shadow-star-sm`}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={`${companyName} 标识`} className="size-full object-cover" />
      ) : (
        <span
          className="flex max-w-[82%] items-center justify-center break-all text-center leading-[0.9]"
          style={{ fontSize }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
