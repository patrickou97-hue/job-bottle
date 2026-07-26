import { apiRequest } from "../../services/request";
import { hasActiveSession } from "../../services/session";
import type {
  FeedbackResponse,
  SupportPost,
  SupportResponse,
} from "../../types/api";

const FEEDBACK_TYPES = [
  "数据错误",
  "简历导出",
  "投递流程",
  "视觉体验",
  "其他建议",
];

Page({
  data: {
    activeTab: "guide" as "guide" | "feedback",
    loading: true,
    errorMessage: "",
    posts: [] as (SupportPost & { dateLabel: string })[],
    expandedId: "",
    feedbackTypes: FEEDBACK_TYPES,
    feedbackType: FEEDBACK_TYPES[0],
    feedbackText: "",
    submitting: false,
    feedbackMessage: "",
    authenticated: false,
  },

  onLoad() {
    this.setData({ authenticated: hasActiveSession() });
    void this.loadSupport();
  },

  onPullDownRefresh() {
    void this.loadSupport().finally(() => wx.stopPullDownRefresh());
  },

  async loadSupport() {
    this.setData({ loading: true, errorMessage: "" });
    try {
      const response = await apiRequest<SupportResponse>("/support", {
        auth: false,
      });
      this.setData({
        loading: false,
        posts: response.data.posts.map((post) => ({
          ...post,
          dateLabel: formatDate(post.createdAt),
        })),
      });
    } catch (error) {
      this.setData({
        loading: false,
        errorMessage:
          error instanceof Error ? error.message : "指南暂时无法读取。",
      });
    }
  },

  onTabTap(event: WechatMiniprogram.TouchEvent) {
    const activeTab =
      event.currentTarget.dataset.id === "feedback" ? "feedback" : "guide";
    this.setData({ activeTab });
  },

  onPostTap(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id || "");
    this.setData({ expandedId: this.data.expandedId === id ? "" : id });
  },

  onFeedbackTypeTap(event: WechatMiniprogram.TouchEvent) {
    const value = String(event.currentTarget.dataset.value || "");
    if (FEEDBACK_TYPES.includes(value)) {
      this.setData({ feedbackType: value, feedbackMessage: "" });
    }
  },

  onFeedbackInput(event: WechatMiniprogram.Input) {
    this.setData({
      feedbackText: event.detail.value,
      feedbackMessage: "",
    });
  },

  onLogin() {
    wx.navigateTo({
      url: `/pages/login/index?redirect=${encodeURIComponent("/pages/support/index")}`,
    });
  },

  async onSubmitFeedback() {
    if (!this.data.authenticated) {
      this.onLogin();
      return;
    }
    if (this.data.feedbackText.trim().length < 5) {
      this.setData({ feedbackMessage: "请填写至少 5 个字的反馈内容。" });
      return;
    }
    this.setData({ submitting: true, feedbackMessage: "" });
    try {
      await apiRequest<FeedbackResponse>("/feedback", {
        method: "POST",
        data: {
          category: this.data.feedbackType,
          content: this.data.feedbackText,
        },
      });
      this.setData({
        feedbackText: "",
        feedbackMessage: "反馈已提交，谢谢你帮助拾星变得更好。",
      });
    } catch (error) {
      this.setData({
        feedbackMessage:
          error instanceof Error ? error.message : "反馈提交失败，请稍后重试。",
      });
    } finally {
      this.setData({ submitting: false });
    }
  },
});

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}
