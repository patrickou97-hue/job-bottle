"use client";

import { ChevronDown, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { EMPTY_JOB_FILTERS } from "@/lib/constants";
import {
  buildLocationGroups,
  getLocationFilterLabel,
  getLocationFilterLevel,
  getProvinceForCity,
  type LocationFilterLevel,
} from "@/lib/locations";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { cn } from "@/lib/utils";
import type { JobDiscoveryScope, JobFilters } from "@/lib/types";

export function JobFilterBar({
  filters,
  facets,
  onChange,
  discoveryScope,
  onDiscoveryScopeChange,
  recentCount,
  recentPreferenceCount,
  hasPreferences,
  isAuthenticated,
  resetVersion,
}: {
  filters: JobFilters;
  facets: {
    industries: string[];
    batchTypes: string[];
    locations: string[];
    categories: string[];
    tags: string[];
  };
  onChange: (filters: JobFilters) => void;
  discoveryScope: JobDiscoveryScope;
  onDiscoveryScopeChange: (scope: JobDiscoveryScope) => void;
  recentCount: number;
  recentPreferenceCount: number;
  hasPreferences: boolean;
  isAuthenticated: boolean;
  resetVersion: number;
}) {
  const locationGroups = useMemo(() => buildLocationGroups(facets.locations), [facets.locations]);
  const initialLocation = getLocationFilterLabel(filters.location);
  const [locationLevel, setLocationLevel] = useState<LocationFilterLevel>(() => getLocationFilterLevel(filters.location));
  const [cityProvince, setCityProvince] = useState(() => getProvinceForCity(initialLocation, locationGroups));
  const [filterOpen, setFilterOpen] = useState(false);
  const internalBlankLocationChangeRef = useRef(false);
  const previousResetVersionRef = useRef(resetVersion);

  useEffect(() => {
    const resetRequested = previousResetVersionRef.current !== resetVersion;
    previousResetVersionRef.current = resetVersion;
    if (internalBlankLocationChangeRef.current && !filters.location && !resetRequested) {
      internalBlankLocationChangeRef.current = false;
      return;
    }
    internalBlankLocationChangeRef.current = false;

    const nextLevel = getLocationFilterLevel(filters.location);
    const nextLocation = getLocationFilterLabel(filters.location);
    setLocationLevel(nextLevel);
    setCityProvince(
      nextLevel === "province"
        ? nextLocation
        : nextLevel === "city"
          ? getProvinceForCity(nextLocation, locationGroups)
          : locationGroups[0]?.province ?? "",
    );
  }, [filters.location, locationGroups, resetVersion]);

  function setFilter(partial: Partial<JobFilters>) {
    onChange({ ...filters, ...partial });
  }

  function toggleCategory(category: string) {
    const categories = filters.categories.includes(category)
      ? filters.categories.filter((item) => item !== category)
      : [...filters.categories, category];
    setFilter({ categories });
  }

  function changeLocationLevel(level: LocationFilterLevel) {
    setLocationLevel(level);
    if (level === "nationwide") {
      setFilter({ location: "scope:nationwide" });
      return;
    }
    if (level === "city" && !cityProvince) setCityProvince(locationGroups[0]?.province ?? "");
    internalBlankLocationChangeRef.current = true;
    setFilter({ location: "" });
  }

  function clearFilters() {
    setLocationLevel("all");
    setCityProvince(locationGroups[0]?.province ?? "");
    onDiscoveryScopeChange("all");
    onChange(EMPTY_JOB_FILTERS);
  }

  const activeFilterCount = [
    filters.keyword.trim(),
    filters.industry,
    filters.batchType,
    filters.location,
    ...filters.categories,
    ...filters.tags,
    discoveryScope !== "all" ? discoveryScope : "",
  ].filter(Boolean).length;

  return (
    <aside className="filter-rail relative self-start border-b border-r-0 border-[color:var(--line-ghost)] pb-0 xl:sticky xl:top-24 xl:border-b-0 xl:border-r xl:pr-5">
      <div className="filter-disclosure" data-open={filterOpen}>
        <button
          type="button"
          className="filter-disclosure__summary"
          aria-expanded={filterOpen}
          aria-controls="job-filter-content"
          onClick={() => setFilterOpen((current) => !current)}
        >
          <span>
            <span className="block text-sm font-semibold text-ink-primary">筛选岗位</span>
            <span className="mt-1 block text-xs text-ink-muted">
              {activeFilterCount > 0 ? `已启用 ${activeFilterCount} 项条件` : "按你的目标缩小范围"}
            </span>
          </span>
          <span className="filter-disclosure__summary-end">
            {activeFilterCount > 0 ? <span className="filter-count">{activeFilterCount}</span> : null}
            <ChevronDown aria-hidden="true" className="filter-disclosure__chevron size-4" />
          </span>
        </button>

        <div id="job-filter-content" className={cn("filter-disclosure__content", !filterOpen && "hidden xl:block")}>
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="section-title text-base">筛选</h2>
            <button
              type="button"
              className="text-action pressable px-1 py-1 text-xs"
              aria-label="清空所有岗位筛选"
              onClick={clearFilters}
            >
              清空筛选
            </button>
          </div>

          <div className="space-y-5">
        <div>
          <label htmlFor="job-discovery-scope" className="mb-2 block text-sm text-ink-secondary">
            快捷查看
          </label>
          <Select
            id="job-discovery-scope"
            value={discoveryScope}
            onChange={(event) => onDiscoveryScopeChange(event.target.value as JobDiscoveryScope)}
          >
            <option value="all">全部岗位</option>
            <option value="recent">近 7 日新增 · {recentCount}</option>
            <option value="recent_preference" disabled={!hasPreferences}>
              近 7 日新增 · 符合偏好 · {recentPreferenceCount}
            </option>
          </Select>
          <p className="mt-2 text-xs leading-5 text-ink-muted">
            {hasPreferences ? (
              "新增以本站收录时间为准；偏好匹配会同时参考意向地区与意向岗位。"
            ) : (
              <>
                新增以本站收录时间为准。{isAuthenticated ? "填写" : "登录并填写"}
                <Link
                  href={isAuthenticated ? "/profile" : "/login?next=%2Fprofile"}
                  className="mx-1 text-action underline-offset-4 hover:underline"
                >
                  求职偏好
                </Link>
                后，可查看匹配岗位。
              </>
            )}
          </p>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm text-ink-secondary">关键词</span>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-nebula-blue/70"
            />
            <Input
              className="pl-10"
              value={filters.keyword}
              onChange={(event) => setFilter({ keyword: event.target.value })}
              placeholder="搜索公司或岗位名称"
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-ink-secondary">所在行业</span>
          <Select
            value={filters.industry}
            onChange={(event) => setFilter({ industry: event.target.value })}
          >
            <option value="">全部行业</option>
            {facets.industries.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-ink-secondary">招聘批次</span>
          <Select
            value={filters.batchType}
            onChange={(event) => setFilter({ batchType: event.target.value })}
          >
            <option value="">全部批次</option>
            {facets.batchTypes.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </label>

        <LocationFilter
          level={locationLevel}
          groups={locationGroups}
          cityProvince={cityProvince}
          value={filters.location}
          onLevelChange={changeLocationLevel}
          onProvinceChange={(province) => {
            setCityProvince(province);
            setFilter({ location: `province:${province}` });
          }}
          onCityProvinceChange={(province) => {
            setCityProvince(province);
            internalBlankLocationChangeRef.current = true;
            setFilter({ location: "" });
          }}
          onCityChange={(city) => setFilter({ location: city ? `city:${city}` : "" })}
        />

        <label className="block">
          <span className="mb-2 block text-sm text-ink-secondary">排序方式</span>
          <Select
            value={filters.sortBy}
            onChange={(event) =>
              setFilter({ sortBy: event.target.value as JobFilters["sortBy"] })
            }
          >
            <option value="start_date_desc">最新开放</option>
            <option value="updated_desc">最近更新</option>
            <option value="start_date_asc">最早开放</option>
            <option value="company_asc">按公司名称</option>
          </Select>
        </label>

        <div>
          <span className="mb-2 block text-sm text-ink-secondary">岗位类别</span>
          <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto pr-1">
            {facets.categories.map((category) => {
              const active = filters.categories.includes(category);
              return (
                <button
                  key={category}
                  type="button"
                  data-active={active}
                  className={cn("chip-button", active && "shadow-star-sm")}
                  onClick={() => toggleCategory(category)}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

          </div>
        </div>
      </div>
    </aside>
  );
}

function LocationFilter({
  level,
  groups,
  cityProvince,
  value,
  onLevelChange,
  onProvinceChange,
  onCityProvinceChange,
  onCityChange,
}: {
  level: LocationFilterLevel;
  groups: { province: string; cities: string[] }[];
  cityProvince: string;
  value: string;
  onLevelChange: (level: LocationFilterLevel) => void;
  onProvinceChange: (province: string) => void;
  onCityProvinceChange: (province: string) => void;
  onCityChange: (city: string) => void;
}) {
  const activeCityProvince = cityProvince || groups[0]?.province || "";
  const cityOptions = groups.find((group) => group.province === activeCityProvince)?.cities ?? [];
  const selectedProvince = value.startsWith("province:") ? value.slice("province:".length) : "";
  const selectedCity = value.startsWith("city:") ? value.slice("city:".length) : "";
  const levels: { value: LocationFilterLevel; label: string }[] = [
    { value: "all", label: "不限" },
    { value: "nationwide", label: "全国" },
    { value: "province", label: "省级" },
    { value: "city", label: "市级" },
  ];

  return (
    <fieldset>
      <legend className="mb-2 block text-sm text-ink-secondary">工作地点</legend>
      <SegmentedControl
        ariaLabel="地点层级"
        className="liquid-slider w-full"
        options={levels}
        value={level}
        onChange={onLevelChange}
      />

      {level === "nationwide" ? <p className="mt-2 text-xs leading-5 text-ink-muted">查看标注为全国或全球的岗位</p> : null}

      {level === "province" ? (
        <label className="mt-3 block">
          <span className="mb-1.5 block text-xs text-ink-muted">选择省级地区</span>
          <Select value={selectedProvince} onChange={(event) => onProvinceChange(event.target.value)}>
            <option value="">请选择省份</option>
            {groups.filter((group) => group.province !== "其他").map((group) => <option key={group.province} value={group.province}>{group.province}</option>)}
          </Select>
        </label>
      ) : null}

      {level === "city" ? (
        <div className="mt-3 grid gap-3">
          <label className="block">
            <span className="mb-1.5 block text-xs text-ink-muted">省级地区</span>
            <Select value={activeCityProvince} onChange={(event) => onCityProvinceChange(event.target.value)}>
              {groups.filter((group) => group.cities.length > 0).map((group) => <option key={group.province} value={group.province}>{group.province}</option>)}
            </Select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-ink-muted">城市</span>
            <Select value={selectedCity} onChange={(event) => onCityChange(event.target.value)}>
              <option value="">请选择城市</option>
              {cityOptions.map((city) => <option key={city} value={city}>{city}</option>)}
            </Select>
          </label>
        </div>
      ) : null}
    </fieldset>
  );
}
