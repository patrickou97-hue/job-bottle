"use client";

import { cn, getCompanyShortLabel } from "@/lib/utils";
import { daysSince, momentumTier } from "@/lib/application-orbit";
import type { ApplicationWithJob } from "@/lib/types";

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
  const labelLength = Array.from(shortLabel).length;
  const asciiLabel = /^[\x00-\x7F]+$/.test(shortLabel);
  const labelFontSize = asciiLabel
    ? Math.max(6, Math.min(10, 34 / Math.max(3.8, labelLength * 0.82)))
    : Math.max(7, Math.min(10, 34 / Math.max(3.2, labelLength * 0.66)));
  const momentum = momentumTier(application);
  const stayedDays = daysSince(application.updated_at);
  const momentumStyle = {
    blue: "bg-[#AFC9E8] shadow-[0_0_10px_rgba(175,201,232,0.22)]",
    neutral: "bg-[color:var(--light-ice)] shadow-[0_0_8px_rgba(195,211,230,0.14)]",
    red: "bg-[#C4B2A3] shadow-[0_0_8px_rgba(196,178,163,0.12)]",
  }[momentum];

  return (
    <button
      type="button"
      className={cn(
        "group relative flex size-9 items-center justify-center rounded-full border font-medium outline-none transition",
        offer ? "border-aurum-300/22 text-aurum-100" : "border-nebula-blue/18 text-nebula-silver",
        selected ? "ring-2 ring-nebula-silver/35" : "",
        dimmed ? "opacity-35" : "hover:scale-[1.08]",
        momentum === "red" ? "brightness-[0.82]" : "",
        terminal ? "grayscale opacity-45" : "",
      )}
      style={{
        background: offer
          ? "radial-gradient(circle at 35% 28%, rgba(255,247,214,0.78), rgba(191,164,92,0.42) 30%, rgba(12,16,28,0.9) 74%)"
          : "radial-gradient(circle at 35% 28%, rgba(236,244,255,0.7), rgba(105,138,185,0.42) 30%, rgba(9,14,27,0.92) 74%)",
        boxShadow: offer
          ? "0 0 24px rgba(222,197,137,0.18), inset -7px -9px 15px rgba(0,0,0,0.52)"
          : "0 0 18px rgba(126,158,214,0.18), inset -7px -9px 15px rgba(0,0,0,0.52)",
      }}
      onClick={onClick}
      title={`${application.job.company_name} · ${application.job.job_titles ?? "岗位"}`}
      aria-label={`${application.job.company_name} 投递星体`}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute right-1.5 top-1.5 size-1.5 rounded-full",
          offer ? "bg-[color:var(--gold-base)] shadow-[0_0_8px_var(--gold-glow)]" : momentumStyle,
        )}
      />
      <span
        className="flex max-w-[29px] items-center justify-center break-all text-center leading-[0.9] tracking-normal"
        style={{ fontSize: labelFontSize }}
      >
        {shortLabel}
      </span>
      <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 hidden w-44 -translate-x-1/2 rotate-0 rounded-2xl border border-white/[0.06] bg-[#040814]/78 px-3 py-2 text-left text-xs leading-5 text-ink-secondary shadow-[0_18px_48px_rgba(0,0,0,0.38)] backdrop-blur-xl group-hover:block group-focus:block">
        <span className="block truncate text-nebula-silver">{application.job.company_name}</span>
        <span className="block truncate text-ink-muted">{application.job.job_titles || "岗位待补充"}</span>
        {momentum === "red" ? (
          <span className="block truncate text-[#C4B2A3]">已停留 {stayedDays} 天 · 跟进一下？</span>
        ) : null}
      </span>
    </button>
  );
}
