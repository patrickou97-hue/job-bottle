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
const GUIDE_CATEGORIES = ["全部", "公告", "教程", "分享"];
const WEB_ONLY_TOOLS = [
  {
    id: "extension",
    title: "网申助手",
    platform: "桌面浏览器",
    body: "把拾星简历同步到网页端的网申助手，在招聘网站自动填写常用字段；最后核对与提交仍由你完成。",
    url: "https://www.starjob.space/extension",
  },
  {
    id: "interview",
    title: "诘星 StarInterview",
    platform: "macOS",
    body: "系统音频面试辅助属于 macOS 原生能力。小程序保留统一账号与求职资料，安装和使用请前往网页端。",
    url: "https://www.starjob.space/interview",
  },
] as const;
const WORKFLOW_STEPS = [
  {
    id: "filter",
    title: "筛岗位",
    body: "在岗位坐标按方向、地点、批次和时间筛选。先核对职责与报名信息，再决定是否收录。",
    action: "打开岗位坐标",
    route: "/pages/jobs/index",
    tab: true,
  },
  {
    id: "record",
    title: "建记录",
    body: "把值得跟进的机会加入星瓶；完成官网投递后，再按真实进度更新状态，避免把浏览当成投递。",
    action: "查看星瓶",
    route: "/pages/bottle/index",
    tab: true,
  },
  {
    id: "resume",
    title: "配简历",
    body: "保留一份通用简历，重点岗位复制一份定向版本，再关联到投递记录中。",
    action: "管理简历",
    route: "/pages/resumes/index",
    tab: true,
  },
  {
    id: "progress",
    title: "记节点",
    body: "收到笔试、面试或 Offer 后更新阶段，并记录日期、联系人、下一步与复盘。",
    action: "更新投递",
    route: "/pages/bottle/index",
    tab: true,
  },
  {
    id: "review",
    title: "做复盘",
    body: "流程结束后标记真实结果，把可复用的准备方法留在复盘记录里。",
    action: "返回指南",
    route: "",
    tab: false,
  },
] as const;

let sourcePosts: (SupportPost & { dateLabel: string })[] = [];

Page({
  data: {
    activeTab: "guide" as "guide" | "workflow" | "feedback",
    loading: true,
    errorMessage: "",
    posts: [] as (SupportPost & { dateLabel: string })[],
    expandedId: "",
    activeCategory: "全部",
    guideCategories: GUIDE_CATEGORIES,
    workflowSteps: WORKFLOW_STEPS,
    webOnlyTools: WEB_ONLY_TOOLS,
    expandedStep: "",
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
      sourcePosts = response.data.posts.map((post) => ({
        ...post,
        dateLabel: formatDate(post.createdAt),
      }));
      this.setData({
        loading: false,
        posts: filterPosts(sourcePosts, this.data.activeCategory),
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
    const requested = String(event.currentTarget.dataset.id || "guide");
    const activeTab =
      requested === "feedback"
        ? "feedback"
        : requested === "workflow"
          ? "workflow"
          : "guide";
    this.setData({ activeTab });
  },

  onCategoryTap(event: WechatMiniprogram.TouchEvent) {
    const activeCategory = String(
      event.currentTarget.dataset.category || "全部",
    );
    if (!GUIDE_CATEGORIES.includes(activeCategory)) return;
    this.setData({
      activeCategory,
      expandedId: "",
      posts: filterPosts(sourcePosts, activeCategory),
    });
  },

  onPostTap(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id || "");
    this.setData({ expandedId: this.data.expandedId === id ? "" : id });
  },

  onStepTap(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id || "");
    this.setData({ expandedStep: this.data.expandedStep === id ? "" : id });
  },

  onWorkflowAction(event: WechatMiniprogram.TouchEvent) {
    const route = String(event.currentTarget.dataset.route || "");
    if (!route) {
      this.setData({ activeTab: "guide" });
      return;
    }
    if (event.currentTarget.dataset.tab) {
      wx.switchTab({ url: route });
    } else {
      wx.navigateTo({ url: route });
    }
  },

  onCopyWebTool(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id || "");
    const tool = WEB_ONLY_TOOLS.find((item) => item.id === id);
    if (!tool) return;
    wx.setClipboardData({
      data: tool.url,
      success() {
        wx.showToast({
          title: "网页地址已复制",
          icon: "success",
        });
      },
    });
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

function filterPosts(
  posts: (SupportPost & { dateLabel: string })[],
  category: string,
) {
  return category === "全部"
    ? posts
    : posts.filter((post) => post.category === category);
}
