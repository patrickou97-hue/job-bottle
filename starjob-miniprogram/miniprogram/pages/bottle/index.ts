import { apiRequest } from "../../services/request";
import { RELEASE_CAPABILITIES } from "../../config/env";
import { hasActiveSession } from "../../services/session";
import type {
  ApplicationListResponse,
  ApplicationUpdateResponse,
} from "../../types/api";
import type {
  ApplicationCandidateStage,
  ApplicationStatus,
  UserApplication,
} from "../../types/domain";

type BottleRow = UserApplication & {
  statusLabel: string;
  stageLabel: string;
  updatedLabel: string;
};

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  opened: "待投递",
  applied: "已投递",
  written_test: "笔试",
  first_round: "一面",
  second_round: "二面",
  final_round: "终面",
  offer: "Offer",
  rejected: "未通过",
  withdrawn: "已放弃",
};

const STAGE_LABELS: Record<ApplicationCandidateStage, string> = {
  evaluating: "评估中",
  saved: "已收藏",
  preparing: "准备中",
};

const PROGRESS_OPTIONS: {
  label: string;
  status: ApplicationStatus;
}[] = [
  { label: "待投递", status: "opened" },
  { label: "标记为已投递", status: "applied" },
  { label: "进入笔试", status: "written_test" },
  { label: "进入一面", status: "first_round" },
  { label: "进入二面", status: "second_round" },
  { label: "进入终面", status: "final_round" },
  { label: "获得 Offer", status: "offer" },
  { label: "未通过", status: "rejected" },
  { label: "已放弃", status: "withdrawn" },
];

let sourceApplications: UserApplication[] = [];

Page({
  data: {
    authenticated: false,
    loading: false,
    updatingId: "",
    errorMessage: "",
    filter: "all",
    filters: [
      { id: "all", label: "全部" },
      { id: "evaluating", label: "评估" },
      { id: "saved", label: "收藏" },
      { id: "preparing", label: "准备" },
      { id: "applied", label: "已投" },
      { id: "offer", label: "Offer" },
      { id: "closed", label: "已结束" },
    ],
    statusOptions: PROGRESS_OPTIONS,
    applications: [] as BottleRow[],
    totalCount: 0,
    activeCount: 0,
    offerCount: 0,
    progressUpdateAvailable: RELEASE_CAPABILITIES.applicationProgressUpdate,
  },

  onShow() {
    this.getTabBar?.()?.setData({ selectedPath: "/pages/bottle/index" });
    const authenticated = hasActiveSession();
    this.setData({ authenticated });
    if (authenticated) void this.loadBottle();
  },

  onPullDownRefresh() {
    if (!this.data.authenticated) {
      wx.stopPullDownRefresh();
      return;
    }
    void this.loadBottle().finally(() => wx.stopPullDownRefresh());
  },

  async loadBottle() {
    this.setData({ loading: true, errorMessage: "" });
    try {
      const response = await apiRequest<ApplicationListResponse>("/applications");
      sourceApplications = response.data.applications;
      this.applyFilter();
      this.setData({
        loading: false,
        totalCount: sourceApplications.length,
        activeCount: sourceApplications.filter(
          (item) => !["rejected", "withdrawn", "offer"].includes(item.status),
        ).length,
        offerCount: sourceApplications.filter((item) => item.status === "offer").length,
      });
    } catch (error) {
      this.setData({
        loading: false,
        errorMessage:
          error instanceof Error ? error.message : "星瓶暂时无法读取。",
      });
    }
  },

  onFilterTap(event: WechatMiniprogram.TouchEvent) {
    const filter = String(event.currentTarget.dataset.id || "all");
    this.setData({ filter });
    this.applyFilter(filter);
  },

  applyFilter(nextFilter?: string) {
    const filter = nextFilter ?? this.data.filter;
    const filtered = sourceApplications.filter((item) => {
      if (filter === "all") return true;
      if (filter === "applied") return item.status !== "opened";
      if (filter === "offer") return item.status === "offer";
      if (filter === "closed") {
        return item.status === "rejected" || item.status === "withdrawn";
      }
      return item.candidateStage === filter;
    });
    this.setData({ applications: filtered.map(toBottleRow) });
  },

  onExplore() {
    wx.switchTab({ url: "/pages/jobs/index" });
  },

  onLogin() {
    wx.navigateTo({
      url: `/pages/login/index?redirect=${encodeURIComponent("/pages/bottle/index")}`,
    });
  },

  onRetry() {
    void this.loadBottle();
  },

  onJobTap(event: WechatMiniprogram.TouchEvent) {
    const jobId = String(event.currentTarget.dataset.jobId || "");
    if (!jobId) return;
    wx.navigateTo({ url: `/pages/jobs/detail?id=${encodeURIComponent(jobId)}` });
  },

  onUpdateProgress(event: WechatMiniprogram.TouchEvent) {
    if (!RELEASE_CAPABILITIES.applicationProgressUpdate) return;
    const id = String(event.currentTarget.dataset.id || "");
    const current = sourceApplications.find((item) => item.id === id);
    if (!current || this.data.updatingId) return;
    wx.showActionSheet({
      itemList: PROGRESS_OPTIONS.map((item) => item.label),
      success: (result) => {
        const selection = PROGRESS_OPTIONS[result.tapIndex];
        if (!selection) return;
        this.setData({ updatingId: id });
        void apiRequest<ApplicationUpdateResponse>("/applications", {
          method: "PUT",
          data: {
            id,
            status: selection.status,
            candidateStage: "preparing",
            note: current.note,
            nextAction: current.nextAction,
          },
        })
          .then((response) => {
            sourceApplications = sourceApplications.map((item) =>
              item.id === id ? response.data.application : item,
            );
            this.applyFilter();
            wx.showToast({ title: "进度已同步", icon: "success" });
          })
          .catch((error: unknown) => {
            wx.showToast({
              title:
                error instanceof Error ? error.message : "更新失败，请重试",
              icon: "none",
            });
          })
          .finally(() => this.setData({ updatingId: "" }));
      },
    });
  },

  onStatusChange(event: WechatMiniprogram.PickerChange) {
    if (!RELEASE_CAPABILITIES.applicationProgressUpdate) return;
    const id = String(event.currentTarget.dataset.id || "");
    const current = sourceApplications.find((item) => item.id === id);
    const selection = PROGRESS_OPTIONS[Number(event.detail.value)];
    if (!current || !selection || this.data.updatingId) return;
    this.updateApplicationStatus(current, selection.status);
  },

  updateApplicationStatus(current: UserApplication, status: ApplicationStatus) {
    const candidateStage: ApplicationCandidateStage =
      status === "opened"
        ? current.candidateStage
        : status === "rejected" || status === "withdrawn" || status === "offer"
          ? current.candidateStage
          : "preparing";
    this.setData({ updatingId: current.id });
    void apiRequest<ApplicationUpdateResponse>("/applications", {
      method: "PUT",
      data: {
        id: current.id,
        status,
        candidateStage,
        note: current.note,
        nextAction: current.nextAction,
      },
    })
      .then((response) => {
        sourceApplications = sourceApplications.map((item) =>
          item.id === current.id ? response.data.application : item,
        );
        this.applyFilter();
        this.setData({
          activeCount: sourceApplications.filter(
            (item) => !["rejected", "withdrawn", "offer"].includes(item.status),
          ).length,
          offerCount: sourceApplications.filter(
            (item) => item.status === "offer",
          ).length,
        });
        wx.showToast({ title: "状态已同步", icon: "success" });
      })
      .catch((error: unknown) => {
        wx.showToast({
          title: error instanceof Error ? error.message : "更新失败，请重试",
          icon: "none",
        });
      })
      .finally(() => this.setData({ updatingId: "" }));
  },
});

function toBottleRow(application: UserApplication): BottleRow {
  return {
    ...application,
    statusLabel: STATUS_LABELS[application.status],
    stageLabel: STAGE_LABELS[application.candidateStage],
    updatedLabel: formatDate(application.updatedAt),
  };
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚更新";
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}
