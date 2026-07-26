import { apiRequest } from "../../services/request";
import { RELEASE_CAPABILITIES } from "../../config/env";
import { hasActiveSession } from "../../services/session";
import type {
  ResumeCreateResponse,
  ResumeListResponse,
} from "../../types/api";
import type { ResumeSummary } from "../../types/domain";

type ResumeRow = ResumeSummary & {
  templateLabel: string;
  updatedLabel: string;
};

const TEMPLATE_LABELS: Record<string, string> = {
  compact: "紧凑中文",
  classic: "经典商科",
  modern: "现代单栏",
  consulting: "咨询投研",
  technical: "技术简洁",
  academic: "学术研究",
  english_classic: "English Classic",
  english_modern: "English Modern",
};

Page({
  data: {
    authenticated: false,
    loading: false,
    errorMessage: "",
    resumes: [] as ResumeRow[],
    showCreateForm: false,
    creating: false,
    draftTitle: "",
    draftTargetRole: "",
    draftTemplateId: "compact",
    templateOptions: [
      { id: "compact", label: "紧凑中文" },
      { id: "classic", label: "经典商科" },
      { id: "modern", label: "现代单栏" },
      { id: "consulting", label: "咨询投研" },
      { id: "technical", label: "技术简洁" },
    ],
    resumeCreationAvailable: RELEASE_CAPABILITIES.resumeCreation,
  },

  onShow() {
    this.getTabBar?.()?.setData({ selectedPath: "/pages/resumes/index" });
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
          templateLabel: TEMPLATE_LABELS[resume.templateId] || "通用版式",
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

  onExploreJobs() {
    wx.switchTab({ url: "/pages/jobs/index" });
  },

  onResumeTap(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id || "");
    if (!id) return;
    wx.navigateTo({
      url: `/pages/resumes/editor?id=${encodeURIComponent(id)}`,
    });
  },

  onToggleCreate() {
    if (!RELEASE_CAPABILITIES.resumeCreation) return;
    if (!this.data.authenticated) {
      this.onLogin();
      return;
    }
    this.setData({
      showCreateForm: !this.data.showCreateForm,
      errorMessage: "",
    });
  },

  onDraftTitleInput(event: WechatMiniprogram.Input) {
    this.setData({ draftTitle: event.detail.value });
  },

  onDraftTargetRoleInput(event: WechatMiniprogram.Input) {
    this.setData({ draftTargetRole: event.detail.value });
  },

  onTemplateTap(event: WechatMiniprogram.TouchEvent) {
    this.setData({
      draftTemplateId: String(event.currentTarget.dataset.id || "compact"),
    });
  },

  onCreateResume() {
    if (this.data.creating) return;
    this.setData({ creating: true, errorMessage: "" });
    void apiRequest<ResumeCreateResponse>("/resumes", {
      method: "POST",
      data: {
        title: this.data.draftTitle || "未命名简历",
        targetRole: this.data.draftTargetRole,
        templateId: this.data.draftTemplateId,
      },
    })
      .then((response) => {
        const resume = response.data.resume;
        this.setData({
          showCreateForm: false,
          draftTitle: "",
          draftTargetRole: "",
          draftTemplateId: "compact",
          resumes: [
            {
              ...resume,
              templateLabel: TEMPLATE_LABELS[resume.templateId] || "通用版式",
              updatedLabel: formatDate(resume.updatedAt),
            },
            ...this.data.resumes,
          ],
        });
        wx.showToast({ title: "简历已创建", icon: "success" });
        wx.navigateTo({
          url: `/pages/resumes/editor?id=${encodeURIComponent(resume.id)}`,
        });
      })
      .catch((error: unknown) => {
        this.setData({
          errorMessage:
            error instanceof Error ? error.message : "简历创建失败。",
        });
      })
      .finally(() => this.setData({ creating: false }));
  },
});

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚更新";
  return `${date.getMonth() + 1}月${date.getDate()}日更新`;
}
