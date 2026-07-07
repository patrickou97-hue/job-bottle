"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  ORBIT_BAND_CONFIG,
  ORBIT_BANDS,
  ORBIT_CONFIG,
  getOrbitBandForStatus,
  type OrbitBand,
  type OrbitStatus,
} from "@/components/applications/ApplicationOrbitConfig";
import { ApplicationOrbitRing } from "@/components/applications/ApplicationOrbitRing";
import { ApplicationOrbitStar } from "@/components/applications/ApplicationOrbitStar";
import { ApplicationOrbitDetail } from "@/components/applications/ApplicationOrbitDetail";
import { FiligreeDivider } from "@/components/ui/FiligreeDivider";
import type { ApplicationWithJob } from "@/lib/types";

export function ApplicationOrbitSystem({
  applications,
  selectedApplication,
  onSelect,
  onEdit,
}: {
  applications: ApplicationWithJob[];
  selectedApplication: ApplicationWithJob | null;
  onSelect: (application: ApplicationWithJob) => void;
  onEdit?: (application: ApplicationWithJob) => void;
}) {
  const [expandedBand, setExpandedBand] = useState<OrbitBand | null>(null);
  const grouped = useMemo(() => {
    const map = new Map<OrbitBand, ApplicationWithJob[]>();
    ORBIT_BANDS.forEach((band) => map.set(band, []));
    applications.forEach((application) => {
      if (application.status in ORBIT_CONFIG) {
        map.get(getOrbitBandForStatus(application.status as OrbitStatus))?.push(application);
      }
    });
    return map;
  }, [applications]);
  const terminal = applications.filter((application) => application.status === "rejected" || application.status === "withdrawn");
  const activeBand = selectedApplication && selectedApplication.status in ORBIT_CONFIG
    ? getOrbitBandForStatus(selectedApplication.status as OrbitStatus)
    : null;
  const expandedApplications = expandedBand ? grouped.get(expandedBand) ?? [] : [];
  const orbitScale = useResponsiveOrbitScale();

  return (
    <section className="relative overflow-hidden">
      <div className="section-heading">
        <div>
          <h2 className="section-title">我的投递轨道</h2>
        </div>
        <span className="section-meta">{applications.length} 条投递</span>
      </div>
      <FiligreeDivider className="mb-4 opacity-70" />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="liquid-panel relative mx-auto h-[460px] w-full max-w-[840px] overflow-hidden sm:h-[600px] lg:h-[760px] xl:max-w-none">
          <div className="absolute inset-0 opacity-18 [background-image:radial-gradient(circle,rgba(214,228,255,.28)_0_1px,transparent_1.5px)] [background-size:92px_92px]" />
          <div className="absolute inset-0 grid place-items-center">
            <div className="relative aspect-square h-[min(90vw,720px)] max-h-[720px] w-[min(90vw,720px)] sm:h-[min(92%,720px)] sm:w-[min(92%,720px)]">
              <OrbitTrackLayer activeBand={activeBand} scale={orbitScale} />
              <div className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center text-xs text-nebula-silver">
                <RadarCore active={applications.length > 0} />
                <span className="mt-3 block text-[11px]">
                  投递中 <span className="font-display text-base text-ink-primary tabular-nums">{applications.length}</span>
                </span>
              </div>

              {ORBIT_BANDS.map((band) => (
                <ApplicationOrbitRing
                  key={band}
                  band={band}
                  applications={grouped.get(band) ?? []}
                  scale={orbitScale}
                  selectedId={selectedApplication?.id}
                  highlightedBand={activeBand}
                  onSelect={onSelect}
                  onAggregateClick={setExpandedBand}
                  showTrack={false}
                />
              ))}
            </div>
          </div>

          {terminal.map((application, index) => (
            <div
              key={application.id}
              className="absolute"
              style={{
                left: `${10 + (index % 5) * 9}%`,
                bottom: `${9 + Math.floor(index / 5) * 11}%`,
              }}
            >
              <ApplicationOrbitStar
                application={application}
                selected={selectedApplication?.id === application.id}
                dimmed={Boolean(activeBand)}
                onClick={() => onSelect(application)}
              />
            </div>
          ))}

          {applications.length === 0 ? (
            <div className="empty-state absolute inset-0">
              <div>
                <h3>暂无投递记录</h3>
                <p>从岗位星图中打开官网投递后，岗位会进入这里。</p>
              </div>
            </div>
          ) : null}
        </div>

        <ApplicationOrbitDetail application={selectedApplication} onEdit={onEdit ?? onSelect} />
      </div>
      {expandedBand ? (
        <div className="liquid-panel absolute inset-x-5 bottom-5 z-40 p-4 backdrop-blur-xl xl:left-auto xl:w-[420px]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-nebula-silver">
              {ORBIT_BAND_CONFIG[expandedBand].label} · {expandedApplications.length} 条记录
            </span>
            <button
              type="button"
              className="rounded-full p-1.5 text-ink-muted transition hover:bg-white/[0.05] hover:text-nebula-silver"
              onClick={() => setExpandedBand(null)}
              aria-label="关闭投递聚合列表"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto pr-1">
            {expandedApplications.map((application) => (
              <button
                key={application.id}
                type="button"
                className="pressable flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left text-sm transition hover:bg-white/[0.04]"
                onClick={() => {
                  setExpandedBand(null);
                  onSelect(application);
                }}
              >
                <span className="min-w-0">
                  <span className="block truncate text-ink-primary">{application.job.company_name}</span>
                  <span className="block truncate text-xs text-ink-muted">{application.job.job_titles || "岗位待补充"}</span>
                </span>
                <span className="shrink-0 text-xs text-ink-muted">{application.job.locations || "暂无地点"}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function OrbitTrackLayer({ activeBand, scale }: { activeBand: OrbitBand | null; scale: number }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 size-0">
      {ORBIT_BANDS.map((band) => {
        const config = ORBIT_BAND_CONFIG[band];
        const radius = config.radius * scale;
        const active = activeBand === band;
        return (
          <span
            key={band}
            className="pointer-events-none absolute rounded-full border border-dashed"
            style={{
              width: radius * 2,
              height: radius * 2,
              marginLeft: -radius,
              marginTop: -radius,
              borderColor: active ? "rgba(174,198,230,0.18)" : `rgba(148,163,184,${config.opacity * 0.14})`,
              boxShadow: active ? "0 0 26px rgba(126,158,214,0.08)" : "none",
            }}
          />
        );
      })}
    </div>
  );
}

function useResponsiveOrbitScale() {
  const [scale, setScale] = useState(0.86);

  useEffect(() => {
    const update = () => {
      const width = window.innerWidth;
      if (width < 420) {
        setScale(0.42);
      } else if (width < 640) {
        setScale(0.5);
      } else if (width < 1024) {
        setScale(0.62);
      } else {
        setScale(0.86);
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return scale;
}

function RadarCore({ active }: { active: boolean }) {
  // Replaces the old OrbMaterial center with radar waves while keeping application planets on OrbMaterial.
  return (
    <span className="radar-core" data-active={active ? "true" : "false"} aria-hidden="true">
      <span />
      <span />
      <span />
      <i />
    </span>
  );
}
