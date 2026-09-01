import { getCompactCompanyLabelStyle, getCompanyInitials } from "@/lib/utils";
import type { ApplicationWithJob } from "@/lib/types";

export function CapturedStar({ application }: { application: ApplicationWithJob }) {
  const label = getCompanyInitials(application.job.company_name);
  const labelStyle = getCompactCompanyLabelStyle(label, 32, {
    minFontSize: 6,
    maxFontSize: 10,
    widthRatio: 0.68,
    heightRatio: 0.58,
  });

  return (
    <span
      className="relative flex size-8 items-center justify-center rounded-full font-medium text-nebula-silver"
      title={`${application.job.company_name} · ${application.job.job_titles ?? "岗位"}`}
      style={{
        background:
          "radial-gradient(circle at 35% 28%, rgba(255,249,227,0.76), rgba(243,198,77,0.54) 28%, rgba(16,38,74,0.9) 72%)",
        boxShadow: "0 0 18px rgba(243,198,77,0.26), inset -6px -8px 14px rgba(0,0,0,0.45)",
      }}
    >
      <span
        className="flex min-w-0 items-center justify-center overflow-hidden text-center"
        style={labelStyle}
      >
        {label}
      </span>
    </span>
  );
}
