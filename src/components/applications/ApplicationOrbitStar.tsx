"use client";

import { OrbMaterial } from "@/components/visual/OrbMaterial";
import type { OrbMaterialVariant } from "@/components/visual/OrbMaterial";
import { cn, getCompanyShortLabel } from "@/lib/utils";
import { daysSince, momentumTier } from "@/lib/application-orbit";
import type { ApplicationStatus, ApplicationWithJob } from "@/lib/types";

export function ApplicationOrbitStar({
  application,
  selected = false,
  dimmed = false,
  onClick,
}: {
  application: ApplicationWithJob;
  selected?: boolean;
  dimmed?: boolean;
  onClick: () => void;
}) {
  const offer = application.status === "offer";
  const terminal = application.status === "rejected" || application.status === "withdrawn";
  const shortLabel = getCompanyShortLabel(application.job.company_name, 3);
  const momentum = momentumTier(application);
  const stayedDays = daysSince(application.updated_at);
  const momentumStyle = {
    blue: "bg-[#F3C64D] shadow-[0_0_10px_rgba(243,198,77,0.28)]",
    neutral: "bg-[color:var(--light-ice)] shadow-[0_0_8px_rgba(216,225,239,0.18)]",
    red: "bg-[#B14B57] shadow-[0_0_8px_rgba(177,75,87,0.18)]",
  }[momentum];

  return (
    <button
      type="button"
      className={cn(
        "group pointer-events-auto relative z-20 flex size-16 touch-manipulation items-center justify-center font-medium outline-none transition",
        dimmed ? "opacity-35" : "hover:scale-[1.08]",
        momentum === "red" ? "brightness-[0.82]" : "",
        terminal ? "grayscale opacity-45" : "",
      )}
      onClick={onClick}
      title={`${application.job.company_name} · ${application.job.job_titles ?? "岗位"}`}
      aria-label={`${application.job.company_name} 投递记录`}
    >
      <span className="relative">
        <OrbMaterial
          size={32}
          variant={selected || offer ? "gold" : terminal ? "muted" : getApplicationOrbVariant(application.status)}
          active={selected || offer}
        />
        <span
          aria-hidden="true"
          className={cn(
            "absolute right-1 top-1 size-1.5 rounded-full",
            offer ? "bg-[color:var(--gold-base)] shadow-[0_0_8px_var(--gold-glow)]" : momentumStyle,
          )}
        />
      </span>
      <span className="absolute left-1/2 top-[50px] max-w-20 -translate-x-1/2 whitespace-nowrap text-center text-[11px] leading-4 text-ink-secondary group-hover:text-ink-primary">
        {shortLabel}
      </span>
      <span className="pointer-events-none absolute left-1/2 top-[72px] z-30 hidden w-44 -translate-x-1/2 rotate-0 bg-[#10264A]/72 px-3 py-2 text-left text-xs leading-5 text-ink-secondary shadow-[0_18px_48px_rgba(0,0,0,0.32)] backdrop-blur-xl group-hover:block group-focus:block">
        <span className="block truncate text-nebula-silver">{application.job.company_name}</span>
        <span className="block truncate text-ink-muted">{application.job.job_titles || "岗位待补充"}</span>
        {momentum === "red" ? (
          <span className="block truncate text-[#E89DA4]">已停留 {stayedDays} 天 · 跟进一下？</span>
        ) : null}
      </span>
    </button>
  );
}

function getApplicationOrbVariant(status: ApplicationStatus): OrbMaterialVariant {
  if (status === "opened") return "blue";
  if (status === "applied") return "violet";
  if (status === "written_test") return "gold";
  if (status === "first_round") return "gold";
  if (status === "second_round") return "gold";
  if (status === "final_round") return "gold";
  if (status === "offer") return "gold";
  return "muted";
}
