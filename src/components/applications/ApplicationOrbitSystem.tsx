"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
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
  const orbitPlaneRef = useRef<HTMLDivElement>(null);
  const orbitScale = useResponsiveOrbitScale(orbitPlaneRef);

  return (
    <section className="relative overflow-hidden">
      <div className="section-heading">
        <div>
          <h2 className="section-title">投递星图</h2>
        </div>
        <span className="section-meta">{applications.length} 条投递</span>
      </div>
      <FiligreeDivider className="mb-4 opacity-70" />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="theme-scene visualization-canvas relative mx-auto h-[460px] w-full max-w-[840px] overflow-hidden sm:h-[600px] lg:h-[760px] xl:max-w-none">
          <OrbitSceneBackdrop />
          <div className="application-orbit-stage absolute inset-0 grid place-items-center">
            <div ref={orbitPlaneRef} className="application-orbit-plane relative aspect-square">
              <OrbitTrackLayer activeBand={activeBand} scale={orbitScale} />
              <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 size-0 text-center text-xs text-nebula-silver">
                <div className="absolute left-0 top-0 flex -translate-x-1/2 -translate-y-1/2 leading-none">
                  <RadarCore active={applications.length > 0} />
                </div>
                <span className="absolute left-0 top-[4.2rem] block -translate-x-1/2 whitespace-nowrap text-[11px]">
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
              className="absolute z-20"
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
                <p>从岗位坐标打开官网投递后，岗位会进入这里。</p>
              </div>
            </div>
          ) : null}
        </div>

        <ApplicationOrbitDetail application={selectedApplication} onEdit={onEdit ?? onSelect} />
      </div>
      {expandedBand ? (
        <div className="scene-panel absolute inset-x-5 bottom-5 z-40 p-4 xl:left-auto xl:w-[420px]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-nebula-silver">
              {ORBIT_BAND_CONFIG[expandedBand].label} · {expandedApplications.length} 条记录
            </span>
            <button
              type="button"
              className="rounded-lg p-1.5 text-ink-muted transition hover:bg-white/[0.05] hover:text-nebula-silver"
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
                className="pressable flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-white/[0.04]"
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

function OrbitSceneBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div className="space-bg__image" />
      <div className="space-bg__vignette opacity-75" />
      <div className="space-bg__stars space-bg__stars--far" />
      <div className="space-bg__stars space-bg__stars--near opacity-45" />
      <div className="space-bg__noise" />
    </div>
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
              borderColor: active ? "rgba(232,201,121,0.42)" : `rgba(201,197,228,${0.08 + config.opacity * 0.2})`,
              boxShadow: active ? "0 0 28px rgba(183,134,40,0.16)" : "inset 0 0 18px rgba(126,124,181,0.025)",
            }}
          />
        );
      })}
    </div>
  );
}

function useResponsiveOrbitScale(planeRef: RefObject<HTMLDivElement | null>) {
  const [scale, setScale] = useState(0.86);

  useEffect(() => {
    const plane = planeRef.current;
    if (!plane) return;
    const update = () => {
      const size = Math.min(plane.clientWidth, plane.clientHeight);
      setScale(Math.min(0.92, Math.max(0.36, size / 780)));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(plane);
    return () => observer.disconnect();
  }, [planeRef]);

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
