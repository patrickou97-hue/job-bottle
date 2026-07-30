import { USE_SAMPLE_JOB_DATA } from "../../config/env";
import { SAMPLE_JOBS } from "../../fixtures/jobs";
import { apiRequest } from "../../services/request";
import { hasActiveSession } from "../../services/session";
import type {
  ApplicationListResponse,
  JobListResponse,
  ProfileResponse,
} from "../../types/api";
import type { Job, Profile, UserApplication } from "../../types/domain";

type JobListItem = Job & {
  applicationLabel: string;
  categoryLabel: string;
  preferenceMatched: boolean;
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

const DEFAULT_CITY_OPTIONS = [
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
const DEFAULT_CATEGORY_OPTIONS = ["全部", "产品类", "技术类", "金融类", "咨询类", "财务类"];
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
let sourceApplications = new Map<string, UserApplication>();
let sourceProfile: Profile | null = null;

Page({
  data: {
    loading: true,
    errorMessage: "",
    keyword: "",
    selectedCity: "全部",
    selectedCategory: "全部",
    selectedBatch: "全部",
    scope: "all" as "all" | "recent" | "recent_preference",
    jobView: "all" as "all" | "unapplied" | "applied",
    viewMode: "map" as "map" | "list",
    cityOptions: DEFAULT_CITY_OPTIONS,
    categoryOptions: DEFAULT_CATEGORY_OPTIONS,
    batchOptions: ["全部"],
    preferenceAvailable: false,
    savedCount: 0,
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
      sourceApplications = new Map();
      sourceProfile = null;
      if (hasActiveSession()) {
        const [applicationResult, profileResult] = await Promise.allSettled([
          apiRequest<ApplicationListResponse>("/applications"),
          apiRequest<ProfileResponse>("/profile"),
        ]);
        if (applicationResult.status === "fulfilled") {
          sourceApplications = new Map(
            applicationResult.value.data.applications.map((application) => [
              application.jobId,
              application,
            ]),
          );
        }
        if (profileResult.status === "fulfilled") {
          sourceProfile = profileResult.value.data.profile;
        }
      }
      this.setData({
        cityOptions: getCityOptions(sourceJobs),
        categoryOptions: getCategoryOptions(sourceJobs),
        batchOptions: getBatchOptions(sourceJobs),
        preferenceAvailable: hasJobPreferences(sourceProfile),
        savedCount: sourceApplications.size,
      });
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
    const requested = String(event.currentTarget.dataset.scope || "all");
    const scope =
      requested === "recent_preference" && this.data.preferenceAvailable
        ? "recent_preference"
        : requested === "recent"
          ? "recent"
          : "all";
    this.setData({ scope });
    this.applyFilters(undefined, undefined, undefined, scope);
  },

  onBatchTap(event: WechatMiniprogram.TouchEvent) {
    const selectedBatch = String(event.currentTarget.dataset.batch || "全部");
    this.setData({ selectedBatch });
    this.applyFilters(undefined, undefined, undefined, undefined, selectedBatch);
  },

  onJobViewTap(event: WechatMiniprogram.TouchEvent) {
    const requested = String(event.currentTarget.dataset.view || "all");
    const jobView =
      requested === "applied" || requested === "unapplied" ? requested : "all";
    this.setData({ jobView });
    this.applyFilters(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      jobView,
    );
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
    scope?: "all" | "recent" | "recent_preference",
    selectedBatch?: string,
    jobView?: "all" | "unapplied" | "applied",
  ) {
    const effectiveKeyword = keyword ?? this.data.keyword;
    const effectiveCity = selectedCity ?? this.data.selectedCity;
    const effectiveCategory = selectedCategory ?? this.data.selectedCategory;
    const effectiveScope = scope ?? this.data.scope;
    const effectiveBatch = selectedBatch ?? this.data.selectedBatch;
    const effectiveJobView = jobView ?? this.data.jobView;
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
      const batchMatched =
        effectiveBatch === "全部" || job.batchType === effectiveBatch;
      const scopeMatched =
        effectiveScope === "all" ||
        (job.isRecent &&
          (effectiveScope === "recent" || jobMatchesPreferences(job, sourceProfile)));
      const application = sourceApplications.get(job.id);
      const applicationMatched =
        effectiveJobView === "all" ||
        (effectiveJobView === "applied"
          ? Boolean(application)
          : !application);
      return (
        keywordMatched &&
        cityMatched &&
        categoryMatched &&
        batchMatched &&
        scopeMatched &&
        applicationMatched
      );
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
          const batchMatched =
            effectiveBatch === "全部" || job.batchType === effectiveBatch;
          const scopeMatched =
            effectiveScope === "all" ||
            (job.isRecent &&
              (effectiveScope === "recent" ||
                jobMatchesPreferences(job, sourceProfile)));
          const application = sourceApplications.get(job.id);
          const applicationMatched =
            effectiveJobView === "all" ||
            (effectiveJobView === "applied"
              ? Boolean(application)
              : !application);
          return (
            keywordMatched &&
            categoryMatched &&
            batchMatched &&
            scopeMatched &&
            applicationMatched
          );
        }),
      ),
    });
  },
});

function toListItem(job: Job): JobListItem {
  const application = sourceApplications.get(job.id);
  return {
    ...job,
    applicationLabel: application
      ? application.status === "opened"
        ? "已收录"
        : "已投递"
      : "",
    categoryLabel: job.jobCategories[0] || job.industry || "其他",
    preferenceMatched: jobMatchesPreferences(job, sourceProfile),
    openDateLabel: job.opensAt
      ? `开启 ${formatMonthDay(job.opensAt)}`
      : "开启时间待更新",
  };
}

function hasJobPreferences(profile: Profile | null) {
  return Boolean(
    profile &&
      (profile.preferredRegions.length > 0 || profile.targetRoles.length > 0),
  );
}

function jobMatchesPreferences(job: Job, profile: Profile | null) {
  if (!profile || !hasJobPreferences(profile)) return false;
  const nationwide = /全国|全球/u.test(job.locations);
  const regionMatched =
    profile.preferredRegions.length === 0 ||
    nationwide ||
    profile.preferredRegions.some((region) => job.locations.includes(region));
  const roleText = [
    job.jobTitles,
    job.industry,
    ...job.jobCategories,
    ...job.tags,
  ]
    .join(" ")
    .toLowerCase();
  const roleMatched =
    profile.targetRoles.length === 0 ||
    profile.targetRoles.some((role) => {
      const normalizedRole = role.toLowerCase();
      if (roleText.includes(normalizedRole)) return true;
      return job.jobCategories.some((category) => {
        const stem = category.replace(/类$/u, "").toLowerCase();
        return normalizedRole.includes(stem) || stem.includes(normalizedRole);
      });
    });
  return regionMatched && roleMatched;
}

function getCategoryOptions(jobs: Job[]) {
  const values = Array.from(
    new Set(jobs.flatMap((job) => job.jobCategories).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right, "zh-CN"));
  return ["全部", ...values];
}

function getBatchOptions(jobs: Job[]) {
  const values = Array.from(
    new Set(jobs.map((job) => job.batchType.trim()).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right, "zh-CN"));
  return ["全部", ...values];
}

function getCityOptions(jobs: Job[]) {
  const availableCities = Object.keys(CITY_COORDINATES).filter((city) =>
    jobs.some((job) => job.locations.includes(city)),
  );
  return ["全部", ...availableCities];
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
