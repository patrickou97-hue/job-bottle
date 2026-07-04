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
          "radial-gradient(circle at 35% 28%, rgba(255,255,255,0.72), rgba(118,148,194,0.48) 28%, rgba(12,18,32,0.88) 72%)",
        boxShadow: "0 0 18px rgba(126,158,214,0.22), inset -6px -8px 14px rgba(0,0,0,0.45)",
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
