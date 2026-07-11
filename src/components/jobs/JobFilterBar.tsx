"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
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
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { JobFilters } from "@/lib/types";

export function JobFilterBar({
  filters,
  facets,
  onChange,
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
}) {
  const locationGroups = useMemo(() => buildLocationGroups(facets.locations), [facets.locations]);
  const initialLocation = getLocationFilterLabel(filters.location);
  const [locationLevel, setLocationLevel] = useState<LocationFilterLevel>(() => getLocationFilterLevel(filters.location));
  const [cityProvince, setCityProvince] = useState(() => getProvinceForCity(initialLocation, locationGroups));

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
    setFilter({ location: "" });
  }

  function clearFilters() {
    setLocationLevel("all");
    setCityProvince(locationGroups[0]?.province ?? "");
    onChange(EMPTY_JOB_FILTERS);
  }

  return (
    <aside className="filter-rail relative p-5">
      <div className="mb-5">
        <h2 className="section-title text-base">筛选</h2>
      </div>

      <div className="space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm text-ink-secondary">关键词</span>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="absolute left-0 top-1/2 size-4 -translate-y-1/2 text-nebula-blue/70"
            />
            <Input
              className="pl-7"
              value={filters.keyword}
              onChange={(event) => setFilter({ keyword: event.target.value })}
              placeholder="搜索公司或岗位"
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
          <span className="mb-2 block text-sm text-ink-secondary">批次类型</span>
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
            <option value="start_date_desc">最新开启</option>
            <option value="updated_desc">最近更新优先</option>
            <option value="start_date_asc">最早开启</option>
            <option value="company_asc">公司名称排序</option>
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

        <Button
          variant="secondary"
          className="w-full"
          onClick={clearFilters}
        >
          清空筛选
        </Button>
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
  const levels: { id: LocationFilterLevel; label: string }[] = [
    { id: "all", label: "不限" },
    { id: "nationwide", label: "全国" },
    { id: "province", label: "省级" },
    { id: "city", label: "市级" },
  ];

  return (
    <div>
      <span className="mb-2 block text-sm text-ink-secondary">工作地点</span>
      <div className="grid grid-cols-4 gap-px overflow-hidden border border-white/[0.1] bg-white/[0.08]" role="group" aria-label="地点层级">
        {levels.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={level === item.id}
            className={cn(
              "min-h-9 bg-[#08152c] px-2 text-xs transition",
              level === item.id ? "bg-[#536D9E]/45 font-semibold text-ink-primary" : "text-ink-muted hover:bg-white/[0.05] hover:text-ink-secondary",
            )}
            onClick={() => onLevelChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {level === "nationwide" ? <p className="mt-2 text-xs leading-5 text-ink-muted">匹配标注为全国或全球的岗位</p> : null}

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
    </div>
  );
}
