import { USE_SAMPLE_JOB_DATA } from "../../config/env";
import { SAMPLE_JOBS } from "../../fixtures/jobs";
import { apiRequest } from "../../services/request";
import type { JobListResponse } from "../../types/api";
import type { Job } from "../../types/domain";

type JobListItem = Job & {
  categoryLabel: string;
  openDateLabel: string;
};

type MapMarker = {
  id: number;
  latitude: number;
  longitude: number;
  width: number;
  height: number;
  iconPath: string;
  callout: {
    content: string;
    color: string;
    fontSize: number;
    borderRadius: number;
    bgColor: string;
    padding: number;
    display: "BYCLICK";
  };
};

const CITY_OPTIONS = [
  "全部",
  "北京",
  "上海",
  "深圳",
  "广州",
  "杭州",
  "成都",
  "南京",
  "武汉",
];
const CATEGORY_OPTIONS = ["全部", "产品类", "技术类", "金融类", "咨询类", "财务类"];
const CITY_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  北京: { latitude: 39.9042, longitude: 116.4074 },
  上海: { latitude: 31.2304, longitude: 121.4737 },
  深圳: { latitude: 22.5431, longitude: 114.0579 },
  广州: { latitude: 23.1291, longitude: 113.2644 },
  杭州: { latitude: 30.2741, longitude: 120.1551 },
  成都: { latitude: 30.5728, longitude: 104.0668 },
  南京: { latitude: 32.0603, longitude: 118.7969 },
  武汉: { latitude: 30.5928, longitude: 114.3055 },
  西安: { latitude: 34.3416, longitude: 108.9398 },
  苏州: { latitude: 31.2989, longitude: 120.5853 },
  天津: { latitude: 39.3434, longitude: 117.3616 },
  重庆: { latitude: 29.4316, longitude: 106.9123 },
  长沙: { latitude: 28.2282, longitude: 112.9388 },
  厦门: { latitude: 24.4798, longitude: 118.0894 },
  青岛: { latitude: 36.0671, longitude: 120.3826 },
  香港: { latitude: 22.3193, longitude: 114.1694 },
};

let sourceJobs: Job[] = [];

Page({
  data: {
    loading: true,
    errorMessage: "",
    keyword: "",
    selectedCity: "全部",
    selectedCategory: "全部",
    scope: "all" as "all" | "recent",
    viewMode: "map" as "map" | "list",
    cityOptions: CITY_OPTIONS,
    categoryOptions: CATEGORY_OPTIONS,
    jobs: [] as JobListItem[],
    markers: [] as MapMarker[],
    menuTop: 0,
    menuHeight: 32,
    menuLeft: 260,
    isSampleData: USE_SAMPLE_JOB_DATA,
  },

  onLoad() {
    const menuButton = wx.getMenuButtonBoundingClientRect();
    this.setData({
      menuTop: menuButton.top,
      menuHeight: menuButton.height,
      menuLeft: menuButton.left,
    });
    void this.loadJobs();
  },

  onShow() {
    this.getTabBar?.()?.setData({ selectedPath: "/pages/jobs/index" });
  },

  onPullDownRefresh() {
    void this.loadJobs().finally(() => wx.stopPullDownRefresh());
  },

  async loadJobs() {
    this.setData({ loading: true, errorMessage: "" });
    try {
      if (USE_SAMPLE_JOB_DATA) {
        sourceJobs = SAMPLE_JOBS;
      } else {
        const response = await apiRequest<JobListResponse>("/jobs", {
          auth: false,
        });
        sourceJobs = response.data.jobs;
      }
      this.applyFilters();
      this.setData({ loading: false });
    } catch (error) {
      this.setData({
        loading: false,
        errorMessage:
          error instanceof Error ? error.message : "岗位读取失败，请重试。",
      });
    }
  },

  onKeywordInput(event: WechatMiniprogram.Input) {
    this.setData({ keyword: event.detail.value });
    this.applyFilters(event.detail.value);
  },

  onCityTap(event: WechatMiniprogram.TouchEvent) {
    const city = String(event.currentTarget.dataset.city || "全部");
    this.setData({ selectedCity: city });
    this.applyFilters(undefined, city);
  },

  onCategoryTap(event: WechatMiniprogram.TouchEvent) {
    const category = String(event.currentTarget.dataset.category || "全部");
    this.setData({ selectedCategory: category });
    this.applyFilters(undefined, undefined, category);
  },

  onScopeTap(event: WechatMiniprogram.TouchEvent) {
    const scope = event.currentTarget.dataset.scope === "recent" ? "recent" : "all";
    this.setData({ scope });
    this.applyFilters(undefined, undefined, undefined, scope);
  },

  onViewModeTap(event: WechatMiniprogram.TouchEvent) {
    this.setData({
      viewMode: event.currentTarget.dataset.mode === "list" ? "list" : "map",
    });
  },

  onMarkerTap(event: WechatMiniprogram.MarkerTap) {
    const markerId = Number(event.detail.markerId);
    const city = Object.keys(CITY_COORDINATES)[markerId - 1];
    if (!city) return;
    this.setData({ selectedCity: city });
    this.applyFilters(undefined, city);
  },

  onRetry() {
    void this.loadJobs();
  },

  onJobTap(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id || "");
    if (!id) return;
    wx.navigateTo({
      url: `/pages/jobs/detail?id=${encodeURIComponent(id)}`,
    });
  },

  applyFilters(
    keyword?: string,
    selectedCity?: string,
    selectedCategory?: string,
    scope?: "all" | "recent",
  ) {
    const effectiveKeyword = keyword ?? this.data.keyword;
    const effectiveCity = selectedCity ?? this.data.selectedCity;
    const effectiveCategory = selectedCategory ?? this.data.selectedCategory;
    const effectiveScope = scope ?? this.data.scope;
    const normalizedKeyword = effectiveKeyword.trim().toLowerCase();
    const filtered = sourceJobs.filter((job) => {
      const keywordMatched =
        !normalizedKeyword ||
        job.companyName.toLowerCase().includes(normalizedKeyword) ||
        job.jobTitles.toLowerCase().includes(normalizedKeyword);
      const cityMatched =
        effectiveCity === "全部" || job.locations.includes(effectiveCity);
      const categoryMatched =
        effectiveCategory === "全部" ||
        job.jobCategories.includes(effectiveCategory);
      const scopeMatched = effectiveScope === "all" || job.isRecent;
      return keywordMatched && cityMatched && categoryMatched && scopeMatched;
    });

    const listItems = filtered.map(toListItem);
    this.setData({
      jobs: listItems,
      markers: buildMapMarkers(
        sourceJobs.filter((job) => {
          const keywordMatched =
            !normalizedKeyword ||
            job.companyName.toLowerCase().includes(normalizedKeyword) ||
            job.jobTitles.toLowerCase().includes(normalizedKeyword);
          const categoryMatched =
            effectiveCategory === "全部" ||
            job.jobCategories.includes(effectiveCategory);
          const scopeMatched = effectiveScope === "all" || job.isRecent;
          return keywordMatched && categoryMatched && scopeMatched;
        }),
      ),
    });
  },
});

function toListItem(job: Job): JobListItem {
  return {
    ...job,
    categoryLabel: job.jobCategories[0] || job.industry || "其他",
    openDateLabel: job.opensAt
      ? `开启 ${formatMonthDay(job.opensAt)}`
      : "开启时间待更新",
  };
}

function formatMonthDay(value: string) {
  const normalized = value.trim();
  const monthDay = normalized.match(/^(\d{1,2})[.\-/月](\d{1,2})(?:日)?$/u);
  if (monthDay) return `${Number(monthDay[1])}月${Number(monthDay[2])}日`;

  const calendarDate = normalized.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/u,
  );
  if (calendarDate) {
    return `${Number(calendarDate[2])}月${Number(calendarDate[3])}日`;
  }
  return "待更新";
}

function buildMapMarkers(jobs: Job[]): MapMarker[] {
  return Object.entries(CITY_COORDINATES).flatMap(([city, coordinate], index) => {
    const count = jobs.filter((job) => job.locations.includes(city)).length;
    if (count === 0) return [];
    return [{
      id: index + 1,
      ...coordinate,
      width: 18,
      height: 18,
      iconPath: "/assets/map-dot.png",
      callout: {
        content: `${city} ${count}`,
        color: "#12294e",
        fontSize: 11,
        borderRadius: 6,
        bgColor: "#fafafb",
        padding: 5,
        display: "BYCLICK" as const,
      },
    }];
  });
}
