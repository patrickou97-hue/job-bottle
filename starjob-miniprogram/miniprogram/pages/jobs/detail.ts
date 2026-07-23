import { USE_SAMPLE_JOB_DATA } from "../../config/env";
import { findSampleJob } from "../../fixtures/jobs";
import { apiRequest } from "../../services/request";
import { hasActiveSession } from "../../services/session";
import type { JobDetailResponse } from "../../types/api";
import type { Job } from "../../types/domain";

type DetailJob = Job & {
  openLabel: string;
  closeLabel: string;
};

Page({
  data: {
    id: "",
    loading: true,
    saving: false,
    errorMessage: "",
    job: null as DetailJob | null,
    isSampleData: USE_SAMPLE_JOB_DATA,
  },

  onLoad(options: Record<string, string | undefined>) {
    const id = options.id ? decodeURIComponent(options.id) : "";
    this.setData({ id });
    void this.loadJob();
  },

  onPullDownRefresh() {
    void this.loadJob().finally(() => wx.stopPullDownRefresh());
  },

  async loadJob() {
    if (!this.data.id) {
      this.setData({
        loading: false,
        errorMessage: "岗位编号无效。",
      });
      return;
    }

    this.setData({ loading: true, errorMessage: "" });
    try {
      const job = USE_SAMPLE_JOB_DATA
        ? findSampleJob(this.data.id)
        : (await apiRequest<JobDetailResponse>(
            `/jobs/${encodeURIComponent(this.data.id)}`,
            { auth: false },
          )).data.job;
      if (!job) throw new Error("岗位不存在或已下线。");
      this.setData({
        job: toDetailJob(job),
        loading: false,
      });
      wx.setNavigationBarTitle({ title: job.companyName });
    } catch (error) {
      this.setData({
        loading: false,
        errorMessage:
          error instanceof Error ? error.message : "岗位读取失败，请重试。",
      });
    }
  },

  onRetry() {
    void this.loadJob();
  },

  onSave() {
    if (!this.data.job || this.data.saving) return;
    if (USE_SAMPLE_JOB_DATA) {
      wx.showToast({
        title: "样例岗位不可收录",
        icon: "none",
      });
      return;
    }
    if (!hasActiveSession()) {
      wx.navigateTo({
        url: `/pages/login/index?redirect=${encodeURIComponent(
          `/pages/jobs/detail?id=${this.data.job.id}`,
        )}`,
      });
      return;
    }

    this.setData({ saving: true });
    void apiRequest("/applications", {
      method: "POST",
      data: {
        jobId: this.data.job.id,
        candidateStage: "saved",
      },
    })
      .then(() => {
        wx.showToast({ title: "已加入星瓶", icon: "success" });
      })
      .catch((error: unknown) => {
        wx.showToast({
          title: error instanceof Error ? error.message : "收录失败，请重试",
          icon: "none",
        });
      })
      .finally(() => this.setData({ saving: false }));
  },

  onCopyApplyLink() {
    if (USE_SAMPLE_JOB_DATA) {
      wx.showToast({
        title: "样例岗位没有真实投递链接",
        icon: "none",
      });
      return;
    }
    const applyUrl = this.data.job?.applyUrl;
    if (!applyUrl) return;
    wx.setClipboardData({
      data: applyUrl,
      success() {
        wx.showToast({
          title: "链接已复制，请到浏览器打开",
          icon: "none",
          duration: 2400,
        });
      },
    });
  },
});

function toDetailJob(job: Job): DetailJob {
  return {
    ...job,
    openLabel: formatDate(job.opensAt, "开放时间待更新"),
    closeLabel: formatDate(job.closesAt, "截止时间待更新"),
  };
}

function formatDate(value: string | null, fallback: string) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}
