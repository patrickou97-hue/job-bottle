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

  function toggleTag(tag: string) {
    const tags = filters.tags.includes(tag)
      ? filters.tags.filter((item) => item !== tag)
      : [...filters.tags, tag];
    setFilter({ tags });
  }

  function toggleCategory(category: string) {
    const categories = filters.categories.includes(category)
      ? filters.categories.filter((item) => item !== category)
      : [...filters.categories, category];
    setFilter({ categories });
  }

  return (
    <aside className="surface-subtle relative rounded-[24px] p-5">
      <div className="pointer-events-none absolute left-0 top-5 h-14 w-px bg-gradient-to-b from-nebula-silver/30 to-transparent" />
      <div className="mb-5 flex items-center gap-3">
        <span className="size-1.5 rounded-full bg-nebula-blue/60" />
        <h2 className="text-base font-medium text-ink-primary">筛选</h2>
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm text-ink-secondary">关键词</span>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-nebula-blue/70"
            />
            <Input
              className="pl-9"
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
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition",
                    active
                      ? "border-nebula-blue/30 bg-nebula-blue/14 text-nebula-silver shadow-star-sm"
                      : "border-white/[0.08] bg-white/[0.035] text-ink-secondary hover:border-nebula-blue/28 hover:text-nebula-silver",
                  )}
                  onClick={() => toggleCategory(category)}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span className="mb-2 block text-sm text-ink-secondary">岗位标签</span>
          <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto pr-1">
            {facets.tags.slice(0, 60).map((tag) => {
              const active = filters.tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition",
                    active
                      ? "border-nebula-blue/30 bg-nebula-blue/14 text-nebula-silver shadow-star-sm"
                      : "border-white/[0.08] bg-white/[0.035] text-ink-secondary hover:border-nebula-blue/28 hover:text-nebula-silver",
                  )}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
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
