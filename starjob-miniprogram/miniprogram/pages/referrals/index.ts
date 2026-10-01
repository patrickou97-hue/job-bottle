import { hasActiveSession } from "../../services/session";
import { apiRequest } from "../../services/request";
import type {
  MiniReferralCode,
  ReferralCompaniesResponse,
  ReferralCompanyJobsResponse,
  ReferralCreateResponse,
  ReferralListResponse,
} from "../../types/api";

type ReferralView = MiniReferralCode & {
  expired: boolean;
  createdLabel: string;
  sourceLabel: string;
  sourceLink: string;
};

let companySearchTimer: ReturnType<typeof setTimeout> | null = null;
let companySearchGeneration = 0;

Page({
  data: {
    loading: true,
    errorMessage: "",
    items: [] as ReferralView[],
    visibleItems: [] as ReferralView[],
    keyword: "",
    availability: "usable" as "usable" | "all",
    usableCount: 0,
    companyCount: 0,
    authenticated: false,
    showUpload: false,
    companyQuery: "",
    companySuggestions: [] as string[],
    selectedCompany: "",
    companyJobs: [] as { id: string; title: string }[],
    companyJobTitles: ["该公司通用 / 暂不确定"] as string[],
    selectedJobIndex: 0,
    loadingCompanies: false,
    code: "",
    applicableRoles: "",
    usageNote: "",
    expiresAt: "",
    todayDate: getTodayDate(),
    agreed: false,
    submitting: false,
  },

  onLoad(options: Record<string, string | undefined>) {
    this.setData({
      authenticated: hasActiveSession(),
      keyword: options.company ?? "",
    });
    void this.loadItems();
  },

  onShow() {
    this.setData({ authenticated: hasActiveSession() });
  },

  onUnload() {
    if (companySearchTimer) clearTimeout(companySearchTimer);
    companySearchTimer = null;
    companySearchGeneration += 1;
  },

  onPullDownRefresh() {
    void this.loadItems().finally(() => wx.stopPullDownRefresh());
  },

  onShareAppMessage() {
    return {
      title: "拾星｜内推码广场",
      path: "/pages/referrals/index",
    };
  },

  async loadItems() {
    this.setData({ loading: true, errorMessage: "" });
    try {
      const response = await apiRequest<ReferralListResponse>("/referrals", {
        auth: false,
      });
      const items = response.data.items.map(toReferralView);
      this.setData({
        items,
        loading: false,
        usableCount: items.filter((item) => !item.expired).length,
        companyCount: new Set(
          items.filter((item) => !item.expired).map((item) => item.company_name),
        ).size,
      });
      this.applyFilters();
    } catch (error) {
      this.setData({
        loading: false,
        errorMessage:
          error instanceof Error ? error.message : "内推码广场暂时无法读取。",
      });
    }
  },

  onRetry() {
    void this.loadItems();
  },

  onKeywordInput(event: WechatMiniprogram.Input) {
    this.setData({ keyword: event.detail.value });
    this.applyFilters(event.detail.value);
  },

  onAvailabilityTap(event: WechatMiniprogram.TouchEvent) {
    const availability = String(event.currentTarget.dataset.value) as "usable" | "all";
    this.setData({ availability });
    this.applyFilters(undefined, availability);
  },

  applyFilters(keyword?: string, availability?: "usable" | "all") {
    const query = (keyword ?? this.data.keyword).trim().toLocaleLowerCase("zh-CN");
    const status = availability ?? this.data.availability;
    const visibleItems = this.data.items.filter((item) => {
      if (status === "usable" && item.expired) return false;
      if (!query) return true;
      return [item.company_name, item.applicable_roles ?? "", item.usage_note ?? ""]
        .some((value) => value.toLocaleLowerCase("zh-CN").includes(query));
    });
    this.setData({ visibleItems });
  },

  onOpenUpload() {
    if (!hasActiveSession()) {
      wx.navigateTo({
        url: `/pages/login/index?redirect=${encodeURIComponent("/pages/referrals/index")}`,
      });
      return;
    }
    this.setData({ showUpload: true, agreed: false });
  },

  onCloseUpload() {
    if (this.data.submitting) return;
    this.setData({ showUpload: false, companySuggestions: [] });
  },

  onCompanyInput(event: WechatMiniprogram.Input) {
    const query = event.detail.value.trim();
    const selectedCompany = query === this.data.selectedCompany ? query : "";
    this.setData({
      companyQuery: event.detail.value,
      selectedCompany,
      companySuggestions: [],
      companyJobs: [],
      companyJobTitles: ["该公司通用 / 暂不确定"],
      selectedJobIndex: 0,
      loadingCompanies: Boolean(query),
    });
    if (companySearchTimer) clearTimeout(companySearchTimer);
    const generation = ++companySearchGeneration;
    if (!query) {
      this.setData({ loadingCompanies: false });
      return;
    }
    companySearchTimer = setTimeout(() => {
      void this.loadCompanySuggestions(query, generation);
    }, 250);
  },

  async loadCompanySuggestions(query: string, generation: number) {
    try {
      const response = await apiRequest<ReferralCompaniesResponse>(
        `/referrals?mode=companies&q=${encodeURIComponent(query)}`,
        { auth: false },
      );
      if (generation !== companySearchGeneration) return;
      this.setData({
        loadingCompanies: false,
        companySuggestions: response.data.companies,
      });
    } catch {
      if (generation !== companySearchGeneration) return;
      this.setData({ loadingCompanies: false, companySuggestions: [] });
    }
  },

  async onCompanySuggestionTap(event: WechatMiniprogram.TouchEvent) {
    const company = String(event.currentTarget.dataset.company || "");
    if (!company) return;
    companySearchGeneration += 1;
    this.setData({
      companyQuery: company,
      selectedCompany: company,
      companySuggestions: [],
      loadingCompanies: true,
      companyJobs: [],
      companyJobTitles: ["该公司通用 / 暂不确定"],
      selectedJobIndex: 0,
    });
    try {
      const response = await apiRequest<ReferralCompanyJobsResponse>(
        `/referrals?mode=jobs&companyName=${encodeURIComponent(company)}`,
        { auth: false },
      );
      const companyJobs = response.data.jobs;
      this.setData({
        companyJobs,
        companyJobTitles: ["该公司通用 / 暂不确定", ...companyJobs.map((job) => job.title)],
        loadingCompanies: false,
      });
    } catch {
      this.setData({ loadingCompanies: false });
      wx.showToast({ title: "岗位列表暂时无法读取", icon: "none" });
    }
  },

  onJobSelect(event: WechatMiniprogram.PickerChange) {
    this.setData({ selectedJobIndex: Number(event.detail.value) || 0 });
  },

  onCodeInput(event: WechatMiniprogram.Input) {
    this.setData({ code: event.detail.value });
  },

  onApplicableRolesInput(event: WechatMiniprogram.Input) {
    this.setData({ applicableRoles: event.detail.value });
  },

  onUsageNoteInput(event: WechatMiniprogram.Input) {
    this.setData({ usageNote: event.detail.value });
  },

  onExpireDateChange(event: WechatMiniprogram.PickerChange) {
    this.setData({ expiresAt: String(event.detail.value) });
  },

  onAgreeChange(event: WechatMiniprogram.CheckboxGroupChange) {
    this.setData({ agreed: event.detail.value.includes("agree") });
  },

  async onSubmitUpload() {
    if (this.data.submitting) return;
    if (!this.data.agreed) {
      wx.showToast({ title: "请先确认内推码来源与风险提示", icon: "none" });
      return;
    }
    if (!this.data.selectedCompany) {
      wx.showToast({ title: "请从岗位库公司中选择", icon: "none" });
      return;
    }
    this.setData({ submitting: true });
    try {
      const job = this.data.companyJobs[this.data.selectedJobIndex - 1];
      const response = await apiRequest<ReferralCreateResponse>("/referrals", {
        method: "POST",
        data: {
          action: "create",
          companyName: this.data.selectedCompany,
          jobId: job?.id ?? null,
          code: this.data.code,
          applicableRoles: this.data.applicableRoles,
          usageNote: this.data.usageNote,
          expiresAt: this.data.expiresAt,
        },
      });
      if (response.reviewStatus !== "removed") {
        const items = [toReferralView(response.item), ...this.data.items];
        this.setData({ items });
        this.applyFilters();
      }
      this.setData({
        showUpload: false,
        submitting: false,
        usableCount: this.data.items.filter((item) => !item.expired).length,
        companyCount: new Set(
          this.data.items.filter((item) => !item.expired).map((item) => item.company_name),
        ).size,
      });
      const message = response.reviewStatus === "removed"
        ? "内容未通过审核，已自动下架"
        : response.reviewStatus === "approved"
          ? "内推码已公开并通过审核"
          : "内推码已公开，智能审核转人工复核";
      wx.showModal({ title: "提交完成", content: message, showCancel: false });
    } catch (error) {
      wx.showToast({
        title: error instanceof Error ? error.message : "内推码上传失败，请重试。",
        icon: "none",
        duration: 2600,
      });
      this.setData({ submitting: false });
    }
  },

  onCopyCode(event: WechatMiniprogram.TouchEvent) {
    const code = String(event.currentTarget.dataset.code || "");
    if (!code) return;
    wx.setClipboardData({
      data: code,
      success() {
        wx.showToast({ title: "内推码已复制", icon: "success" });
      },
    });
  },

  onCopySource(event: WechatMiniprogram.TouchEvent) {
    const url = String(event.currentTarget.dataset.url || "");
    if (!url) return;
    wx.setClipboardData({
      data: url,
      success() {
        wx.showToast({ title: "来源链接已复制，可在浏览器中核对", icon: "none", duration: 2600 });
      },
    });
  },

  onReport(event: WechatMiniprogram.TouchEvent) {
    if (!hasActiveSession()) {
      wx.navigateTo({
        url: `/pages/login/index?redirect=${encodeURIComponent("/pages/referrals/index")}`,
      });
      return;
    }
    const referralCodeId = String(event.currentTarget.dataset.id || "");
    if (!referralCodeId) return;
    const reasons = [
      "内推码已失效或错误",
      "疑似收费、诈骗或代投",
      "包含联系方式或敏感信息",
      "公司或适用范围不匹配",
    ];
    wx.showActionSheet({
      itemList: reasons,
      success: (result) => {
        void this.submitReport(referralCodeId, reasons[result.tapIndex]);
      },
    });
  },

  async submitReport(referralCodeId: string, reason: string) {
    try {
      await apiRequest("/referrals", {
        method: "POST",
        data: { action: "report", referralCodeId, reason },
      });
      wx.showToast({ title: "举报已记录", icon: "success" });
    } catch (error) {
      wx.showToast({
        title: error instanceof Error ? error.message : "举报未提交，请重试。",
        icon: "none",
        duration: 2400,
      });
    }
  },
});

function toReferralView(item: MiniReferralCode): ReferralView {
  return {
    ...item,
    expired: Boolean(item.expires_at && item.expires_at < getTodayDate()),
    createdLabel: formatDate(item.created_at),
    sourceLabel: item.publisher_name ||
      (item.source_type === "tencent_job_link"
        ? "腾讯文档岗位链接"
        : item.source_platform
          ? `${item.source_platform}公开帖子`
          : "匿名分享"),
    sourceLink: item.source_url || item.source_urls?.[0] || "",
  };
}

function getTodayDate() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间待核对";
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}
