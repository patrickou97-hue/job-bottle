import { apiRequest } from "../../services/request";
import { RELEASE_CAPABILITIES } from "../../config/env";
import { hasActiveSession } from "../../services/session";
import type {
  ApplicationListResponse,
  ApplicationUpdateResponse,
  ResumeListResponse,
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
  nextActionDate: string;
  statusIndex: number;
  stageIndex: number;
  priorityIndex: number;
  resumeIndex: number;
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

const STAGE_OPTIONS = [
  { label: "评估中", value: "evaluating" },
  { label: "已收藏", value: "saved" },
  { label: "准备中", value: "preparing" },
] as const;

const PRIORITY_OPTIONS = ["未设置", "低", "中", "高"];

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
    editingApplication: null as BottleRow | null,
    savingDetails: false,
    stageOptions: STAGE_OPTIONS,
    priorityOptions: PRIORITY_OPTIONS,
    resumeOptions: [{ id: "", title: "不关联简历" }] as {
      id: string;
      title: string;
    }[],
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
    this.setData({
      applications: filtered.map((application) => toBottleRow(application)),
    });
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

  async onEditDetails(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id || "");
    const current = sourceApplications.find((item) => item.id === id);
    if (!current) return;
    let resumeOptions = this.data.resumeOptions;
    if (resumeOptions.length === 1) {
      try {
        const response = await apiRequest<ResumeListResponse>("/resumes");
        resumeOptions = [
          { id: "", title: "不关联简历" },
          ...response.data.resumes.map((resume) => ({
            id: resume.id,
            title: resume.title,
          })),
        ];
      } catch {
        // Other workflow details remain editable when resumes cannot load.
      }
    }
    this.setData({
      resumeOptions,
      editingApplication: toBottleRow(current, resumeOptions),
    });
  },

  onCloseDetails() {
    if (this.data.savingDetails) return;
    this.setData({ editingApplication: null });
  },

  onDetailInput(event: WechatMiniprogram.Input) {
    const field = String(event.currentTarget.dataset.field || "");
    if (!field) return;
    this.setData({ [`editingApplication.${field}`]: event.detail.value });
  },

  onDetailStatusChange(event: WechatMiniprogram.PickerChange) {
    const index = Number(event.detail.value);
    const selection = PROGRESS_OPTIONS[index];
    if (!selection) return;
    this.setData({
      "editingApplication.status": selection.status,
      "editingApplication.statusIndex": index,
    });
  },

  onDetailStageChange(event: WechatMiniprogram.PickerChange) {
    const index = Number(event.detail.value);
    const selection = STAGE_OPTIONS[index];
    if (!selection) return;
    this.setData({
      "editingApplication.candidateStage": selection.value,
      "editingApplication.stageIndex": index,
    });
  },

  onDetailPriorityChange(event: WechatMiniprogram.PickerChange) {
    const index = Number(event.detail.value);
    this.setData({
      "editingApplication.priority": index,
      "editingApplication.priorityIndex": index,
    });
  },

  onDetailResumeChange(event: WechatMiniprogram.PickerChange) {
    const index = Number(event.detail.value);
    const selection = this.data.resumeOptions[index];
    if (!selection) return;
    this.setData({
      "editingApplication.resumeId": selection.id || null,
      "editingApplication.resumeIndex": index,
    });
  },

  onDetailDateChange(event: WechatMiniprogram.PickerChange) {
    this.setData({ "editingApplication.nextActionDate": event.detail.value });
  },

  onClearDetailDate() {
    this.setData({ "editingApplication.nextActionDate": "" });
  },

  async onSaveDetails() {
    const current = this.data.editingApplication;
    if (!current || this.data.savingDetails) return;
    this.setData({ savingDetails: true });
    try {
      const response = await apiRequest<ApplicationUpdateResponse>(
        "/applications",
        {
          method: "PUT",
          data: {
            id: current.id,
            status: current.status,
            candidateStage: current.candidateStage,
            priority: current.priority,
            note: current.note,
            nextAction: current.nextAction,
            nextActionAt: current.nextActionDate,
            applicationChannel: current.applicationChannel,
            applicationAccount: current.applicationAccount,
            contactName: current.contactName,
            resumeId: current.resumeId,
            customStageLabel: current.customStageLabel,
            reviewNote: current.reviewNote,
          },
        },
      );
      sourceApplications = sourceApplications.map((item) =>
        item.id === current.id ? response.data.application : item,
      );
      this.applyFilter();
      this.setData({ editingApplication: null });
      wx.showToast({ title: "投递信息已同步", icon: "success" });
    } catch (error) {
      wx.showToast({
        title: error instanceof Error ? error.message : "保存失败，请重试",
        icon: "none",
      });
    } finally {
      this.setData({ savingDetails: false });
    }
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

function toBottleRow(
  application: UserApplication,
  resumeOptions: { id: string; title: string }[] = [{ id: "", title: "" }],
): BottleRow {
  return {
    ...application,
    statusLabel: STATUS_LABELS[application.status],
    stageLabel: STAGE_LABELS[application.candidateStage],
    updatedLabel: formatDate(application.updatedAt),
    nextActionDate: application.nextActionAt
      ? application.nextActionAt.slice(0, 10)
      : "",
    statusIndex: Math.max(
      0,
      PROGRESS_OPTIONS.findIndex((item) => item.status === application.status),
    ),
    stageIndex: Math.max(
      0,
      STAGE_OPTIONS.findIndex(
        (item) => item.value === application.candidateStage,
      ),
    ),
    priorityIndex: application.priority,
    resumeIndex: Math.max(
      0,
      resumeOptions.findIndex((item) => item.id === application.resumeId),
    ),
  };
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚更新";
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}
