"use client";

import { Search } from "lucide-react";
import { EMPTY_JOB_FILTERS } from "@/lib/constants";
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
  function setFilter(partial: Partial<JobFilters>) {
    onChange({ ...filters, ...partial });
  }

  function toggleCategory(category: string) {
    const categories = filters.categories.includes(category)
      ? filters.categories.filter((item) => item !== category)
      : [...filters.categories, category];
    setFilter({ categories });
  }

  return (
    <aside className="filter-rail relative p-5">
      <div className="mb-5">
        <h2 className="section-title text-base">筛选</h2>
        <p className="mt-1 text-xs leading-5 text-ink-muted">缩小列表范围，不会刷新页面。</p>
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

        <label className="block">
          <span className="mb-2 block text-sm text-ink-secondary">工作地点</span>
          <Select
            value={filters.location}
            onChange={(event) => setFilter({ location: event.target.value })}
          >
            <option value="">全部地点</option>
            {facets.locations.slice(0, 80).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </label>

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
          onClick={() => onChange(EMPTY_JOB_FILTERS)}
        >
          清空筛选
        </Button>
      </div>
    </aside>
  );
}
