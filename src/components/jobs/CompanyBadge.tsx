"use client";

import { useState } from "react";

export function CompanyBadge({
  companyName,
  logoUrl,
  size = "md",
}: {
  companyName: string;
  logoUrl?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);
  const sizeClass = size === "sm" ? "size-9" : size === "lg" ? "size-16" : "size-12";
  const sizePx = size === "sm" ? 36 : size === "lg" ? 64 : 48;

  if (!logoUrl || failedLogoUrl === logoUrl) return null;

  return (
    <div
      className={`${sizeClass} relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-transparent p-1`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl}
        alt={`${companyName} 标识`}
        width={sizePx}
        height={sizePx}
        className="size-full object-contain"
        onError={() => setFailedLogoUrl(logoUrl)}
      />
    </div>
  );
}
