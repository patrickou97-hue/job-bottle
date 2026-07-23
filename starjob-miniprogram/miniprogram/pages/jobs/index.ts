import { USE_SAMPLE_JOB_DATA } from "../../config/env";
import { SAMPLE_JOBS } from "../../fixtures/jobs";
import { apiRequest } from "../../services/request";
import type { JobListResponse } from "../../types/api";
import type { Job } from "../../types/domain";

type JobListItem = Job & {
  categoryLabel: string;
  deadlineLabel: string;
};

const CITY_OPTIONS = ["全部", "北京", "上海", "深圳", "广州", "杭州", "成都"];
const CATEGORY_OPTIONS = ["全部", "产品类", "技术类", "金融类", "咨询类", "财务类"];

let sourceJobs: Job[] = [];

Page({
  data: {
    loading: true,
    errorMessage: "",
    keyword: "",
    selectedCity: "全部",
    selectedCategory: "全部",
    scope: "all" as "all" | "recent",
    cityOptions: CITY_OPTIONS,
    categoryOptions: CATEGORY_OPTIONS,
    jobs: [] as JobListItem[],
    isSampleData: USE_SAMPLE_JOB_DATA,
  },

  onLoad() {
    void this.loadJobs();
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

    this.setData({
      jobs: filtered.map(toListItem),
    });
  },
});

function toListItem(job: Job): JobListItem {
  return {
    ...job,
    categoryLabel: job.jobCategories[0] || job.industry || "其他",
    deadlineLabel: job.closesAt
      ? `截止 ${formatMonthDay(job.closesAt)}`
      : "截止时间待更新",
  };
}

function formatMonthDay(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "待更新";
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}
