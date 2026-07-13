"use client";

import { useMemo } from "react";
import { geoMercator, geoPath } from "d3-geo";
import type { FeatureCollection, Geometry, GeoJsonProperties } from "geojson";
import chinaProvincesData from "@/data/china-provinces.json";
import {
  getLocationFilterLabel,
  getProvinceFromLocationFilter,
  matchesLocationFilter,
  normalizeProvinceName,
  PROVINCE_ORDER,
} from "@/lib/locations";
import type { Job } from "@/lib/types";

type ProvinceDatum = {
  centroid: [number, number];
  count: number;
  name: string;
  path: string;
};

const SMALL_REGION_LABELS: Record<string, { x: number; y: number }> = {
  北京: { x: 554, y: 148 },
  天津: { x: 574, y: 184 },
  上海: { x: 600, y: 280 },
  香港: { x: 572, y: 380 },
  澳门: { x: 530, y: 414 },
};

export function ChinaJobMap({
  jobs,
  selectedJobs,
  selectedLocation,
  onLocationChange,
  onSelectJob,
}: {
  jobs: Job[];
  selectedJobs: Job[];
  selectedLocation: string;
  onLocationChange: (location: string) => void;
  onSelectJob: (job: Job) => void;
}) {
  const provinceData = useMemo(() => buildProvinceData(jobs), [jobs]);
  const selectedProvince = getProvinceFromLocationFilter(selectedLocation);
  const maxCount = Math.max(1, ...provinceData.map((province) => province.count));
  const activeLabel = selectedLocation ? getLocationFilterLabel(selectedLocation) : "全部地区";
  const visibleJobs = selectedJobs.slice(0, 8);
  const provincesWithJobs = provinceData
    .filter((province) => province.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "zh-CN"));

  function selectProvince(province: string) {
    onLocationChange(selectedProvince === province ? "" : `province:${province}`);
  }

  return (
    <div className="grid min-h-[32rem] border-y border-[color:var(--line-ghost)] lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,.75fr)]">
      <div className="min-w-0 py-5 lg:pr-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-muted">
          <span>颜色越深，当前筛选下的岗位越多</span>
          <button
            type="button"
            className="text-action pressable px-2 py-1 text-xs"
            onClick={() => onLocationChange(selectedLocation === "scope:nationwide" ? "" : "scope:nationwide")}
            aria-pressed={selectedLocation === "scope:nationwide"}
          >
            全国岗位
          </button>
        </div>

        <svg
          className="mx-auto block h-auto w-full max-w-[720px]"
          viewBox="0 0 720 520"
          role="group"
          aria-label="全国省级岗位分布图"
        >
          {provinceData.map((province) => {
            const selected = selectedProvince === province.name;
            const ratio = Math.sqrt(province.count / maxCount);
            const fill = selected
              ? "#12294e"
              : province.count > 0
                ? `rgba(18, 41, 78, ${0.16 + ratio * 0.62})`
                : "#dfe2e7";
            return (
              <path
                key={province.name}
                d={province.path}
                fill={fill}
                stroke="#f6f7f9"
                strokeWidth={selected ? 2 : 1}
                role="button"
                tabIndex={0}
                aria-label={`${province.name}，${province.count} 个岗位`}
                aria-pressed={selected}
                className="cursor-pointer outline-none transition-opacity hover:opacity-80 focus-visible:stroke-[#12294e] focus-visible:stroke-[3]"
                onClick={() => selectProvince(province.name)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  selectProvince(province.name);
                }}
              >
                <title>{province.name} · {province.count} 个岗位</title>
              </path>
            );
          })}
          {provinceData.filter((province) => SMALL_REGION_LABELS[province.name]).map((province) => {
            const label = SMALL_REGION_LABELS[province.name];
            const selected = selectedProvince === province.name;
            const elbowX = Math.min(label.x - 18, province.centroid[0] + 34);
            return (
              <g
                key={`${province.name}-callout`}
                role="button"
                tabIndex={0}
                aria-label={`选择${province.name}，${province.count} 个岗位`}
                aria-pressed={selected}
                className="group cursor-pointer outline-none"
                onClick={() => selectProvince(province.name)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  selectProvince(province.name);
                }}
              >
                <polyline
                  points={`${province.centroid[0]},${province.centroid[1]} ${elbowX},${label.y - 6} ${label.x - 8},${label.y - 6}`}
                  fill="none"
                  stroke={selected ? "#12294e" : "#6e7888"}
                  strokeWidth={selected ? 2 : 1.25}
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                />
                <circle cx={province.centroid[0]} cy={province.centroid[1]} r={selected ? 4 : 3} fill="#12294e" pointerEvents="none" />
                <rect x={label.x - 8} y={label.y - 23} width="82" height="30" fill="transparent" />
                <text
                  x={label.x}
                  y={label.y}
                  fill="#29384f"
                  fontWeight={selected ? 700 : 600}
                  className="select-none text-[26px] group-hover:underline group-focus:underline sm:text-[17px]"
                >
                  {province.name}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden" aria-label="有岗位的省份">
          <button
            type="button"
            className="chip-button shrink-0 px-3 py-2 text-xs"
            data-active={!selectedLocation}
            onClick={() => onLocationChange("")}
          >
            全部地区
          </button>
          {provincesWithJobs.map((province) => (
            <button
              key={province.name}
              type="button"
              className="chip-button shrink-0 px-3 py-2 text-xs"
              data-active={selectedProvince === province.name}
              onClick={() => selectProvince(province.name)}
            >
              {province.name} {province.count}
            </button>
          ))}
        </div>
      </div>

      <section className="min-w-0 border-t border-[color:var(--line-ghost)] lg:border-l lg:border-t-0 lg:pl-7" aria-labelledby="region-jobs-title">
        <div className="flex items-end justify-between gap-4 border-b border-[color:var(--line-ghost)] py-4">
          <div>
            <h3 id="region-jobs-title" className="text-base font-semibold text-ink-primary">{activeLabel}</h3>
            <p className="mt-1 text-xs text-ink-muted">{selectedJobs.length} 个岗位</p>
          </div>
          <button type="button" className="text-action pressable px-2 py-1 text-xs" onClick={() => document.getElementById("job-list")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
            查看全部
          </button>
        </div>

        {visibleJobs.length === 0 ? (
          <div className="empty-state min-h-56 text-sm">当前地区暂无匹配岗位</div>
        ) : (
          <div className="max-h-[27rem] overflow-y-auto overscroll-contain">
            {visibleJobs.map((job) => (
              <button
                key={job.id}
                type="button"
                className="data-row grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-1 py-3 text-left"
                onClick={() => onSelectJob(job)}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink-primary">{job.job_titles || "招聘岗位"}</span>
                  <span className="mt-1 block truncate text-xs text-ink-muted">{job.company_name} · {job.locations || "地点待确认"}</span>
                </span>
                <span className="text-xs text-ink-muted">定位</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function buildProvinceData(jobs: Job[]): ProvinceDatum[] {
  const collection = chinaProvincesData as FeatureCollection<Geometry, GeoJsonProperties>;
  const projection = geoMercator().fitExtent([[22, 18], [698, 502]], collection);
  const pathBuilder = geoPath(projection);

  return collection.features.flatMap((feature) => {
    const rawName = String(feature.properties?.name ?? "");
    const name = normalizeProvinceName(rawName);
    const path = pathBuilder(feature);
    if (!name || !path || !PROVINCE_ORDER.includes(name)) return [];
    return [{
      name,
      path,
      centroid: pathBuilder.centroid(feature) as [number, number],
      count: jobs.filter((job) => matchesLocationFilter(job.locations, `province:${name}`)).length,
    }];
  });
}
