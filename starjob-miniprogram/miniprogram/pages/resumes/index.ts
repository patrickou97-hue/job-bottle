import { apiRequest } from "../../services/request";
import { hasActiveSession } from "../../services/session";
import type { ResumeListResponse } from "../../types/api";
import type { ResumeSummary } from "../../types/domain";

type ResumeRow = ResumeSummary & {
  updatedLabel: string;
};

Page({
  data: {
    authenticated: false,
    loading: false,
    errorMessage: "",
    resumes: [] as ResumeRow[],
  },

  onShow() {
    const authenticated = hasActiveSession();
    this.setData({ authenticated });
    if (authenticated) void this.loadResumes();
  },

  onPullDownRefresh() {
    if (!this.data.authenticated) {
      wx.stopPullDownRefresh();
      return;
    }
    void this.loadResumes().finally(() => wx.stopPullDownRefresh());
  },

  async loadResumes() {
    this.setData({ loading: true, errorMessage: "" });
    try {
      const response = await apiRequest<ResumeListResponse>("/resumes");
      this.setData({
        loading: false,
        resumes: response.data.resumes.map((resume) => ({
          ...resume,
          updatedLabel: formatDate(resume.updatedAt),
        })),
      });
    } catch (error) {
      this.setData({
        loading: false,
        errorMessage:
          error instanceof Error ? error.message : "简历读取失败。",
      });
    }
  },

  onLogin() {
    wx.navigateTo({ url: "/pages/login/index" });
  },

  onRetry() {
    void this.loadResumes();
  },
});

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚更新";
  return `${date.getMonth() + 1}月${date.getDate()}日更新`;
}
