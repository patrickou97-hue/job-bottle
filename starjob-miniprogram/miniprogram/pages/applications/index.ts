import { apiRequest } from "../../services/request";
import { hasActiveSession } from "../../services/session";
import type { ApplicationListResponse } from "../../types/api";
import type { UserApplication } from "../../types/domain";

type ApplicationRow = UserApplication & {
  statusLabel: string;
  updatedLabel: string;
};

const STATUS_LABELS: Record<UserApplication["status"], string> = {
  opened: "已浏览",
  applied: "已投递",
  written_test: "笔试",
  first_round: "一面",
  second_round: "二面",
  final_round: "终面",
  offer: "Offer",
  rejected: "未通过",
  withdrawn: "已放弃",
};

Page({
  data: {
    authenticated: false,
    loading: false,
    errorMessage: "",
    applications: [] as ApplicationRow[],
  },

  onShow() {
    const authenticated = hasActiveSession();
    this.setData({ authenticated });
    if (authenticated) void this.loadApplications();
  },

  onPullDownRefresh() {
    if (!this.data.authenticated) {
      wx.stopPullDownRefresh();
      return;
    }
    void this.loadApplications().finally(() => wx.stopPullDownRefresh());
  },

  async loadApplications() {
    this.setData({ loading: true, errorMessage: "" });
    try {
      const response = await apiRequest<ApplicationListResponse>("/applications");
      this.setData({
        loading: false,
        applications: response.data.applications.map((application) => ({
          ...application,
          statusLabel: STATUS_LABELS[application.status],
          updatedLabel: formatDate(application.updatedAt),
        })),
      });
    } catch (error) {
      this.setData({
        loading: false,
        errorMessage:
          error instanceof Error ? error.message : "投递记录读取失败。",
      });
    }
  },

  onLogin() {
    wx.navigateTo({ url: "/pages/login/index" });
  },

  onExplore() {
    wx.switchTab({ url: "/pages/jobs/index" });
  },

  onRetry() {
    void this.loadApplications();
  },

  onApplicationTap(event: WechatMiniprogram.TouchEvent) {
    const jobId = String(event.currentTarget.dataset.jobId || "");
    if (!jobId) return;
    wx.navigateTo({
      url: `/pages/jobs/detail?id=${encodeURIComponent(jobId)}`,
    });
  },
});

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚更新";
  return `${date.getMonth() + 1}月${date.getDate()}日更新`;
}
