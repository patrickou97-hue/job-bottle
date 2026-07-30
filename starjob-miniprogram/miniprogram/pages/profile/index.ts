import { getWechatLoginCode, logout } from "../../services/auth";
import { RELEASE_CAPABILITIES } from "../../config/env";
import { apiRequest } from "../../services/request";
import { hasActiveSession, saveSession } from "../../services/session";
import type {
  AccountBindingResponse,
  AccountStatusResponse,
  ApplicationListResponse,
  JobListResponse,
  ProfileResponse,
  ResumeListResponse,
  WebLoginCodeResponse,
} from "../../types/api";
import type { Job, Profile } from "../../types/domain";

type ProfileView = Profile & {
  identitySummary: string;
  preferredRegionsLabel: string;
  targetRolesLabel: string;
};
type RecommendedJob = Job & { reason: string };

Page({
  data: {
    authenticated: false,
    loading: false,
    errorMessage: "",
    profile: null as ProfileView | null,
    completionPercent: 0,
    applicationCount: 0,
    activeApplicationCount: 0,
    resumeCount: 0,
    recommendedJobs: [] as RecommendedJob[],
    avatarLetter: "星",
    loggingOut: false,
    generatingWebCode: false,
    webLoginCodeAvailable: RELEASE_CAPABILITIES.webLoginCode,
    editing: false,
    saving: false,
    draftDisplayName: "",
    draftPhone: "",
    draftCity: "",
    draftSchool: "",
    draftMajor: "",
    draftGraduationYear: "",
    draftPreferredRegions: "",
    draftTargetRoles: "",
    accountStatus: null as AccountStatusResponse["data"] | null,
    accountLoading: false,
    showEmailBinding: false,
    bindingEmail: "",
    bindingPassword: "",
  },

  onShow() {
    this.getTabBar?.()?.setData({ selectedPath: "/pages/profile/index" });
    const authenticated = hasActiveSession();
    this.setData({ authenticated });
    if (authenticated) void this.loadProfile();
  },

  async loadProfile() {
    this.setData({ loading: true, errorMessage: "" });
    try {
      const response = await apiRequest<ProfileResponse>("/profile");
      this.setData({
        loading: false,
        avatarLetter: response.data.profile.displayName.trim().slice(0, 1) || "星",
        draftDisplayName: response.data.profile.displayName,
        draftPhone: response.data.profile.phone,
        draftCity: response.data.profile.city,
        draftSchool: response.data.profile.school,
        draftMajor: response.data.profile.major,
        draftGraduationYear: response.data.profile.graduationYear,
        draftPreferredRegions: response.data.profile.preferredRegions.join("、"),
        draftTargetRoles: response.data.profile.targetRoles.join("、"),
        profile: toProfileView(response.data.profile),
        completionPercent: getProfileCompletion(response.data.profile),
      });
      void this.loadWorkspace(response.data.profile);
      void this.loadAccountStatus();
    } catch (error) {
      this.setData({
        loading: false,
        errorMessage:
          error instanceof Error ? error.message : "个人资料读取失败。",
      });
    }
  },

  async loadWorkspace(profile: Profile) {
    const [applicationsResult, resumesResult, jobsResult] =
      await Promise.allSettled([
        apiRequest<ApplicationListResponse>("/applications"),
        apiRequest<ResumeListResponse>("/resumes"),
        apiRequest<JobListResponse>("/jobs", { auth: false }),
      ]);
    const applications =
      applicationsResult.status === "fulfilled"
        ? applicationsResult.value.data.applications
        : [];
    const resumes =
      resumesResult.status === "fulfilled"
        ? resumesResult.value.data.resumes
        : [];
    const jobs =
      jobsResult.status === "fulfilled" ? jobsResult.value.data.jobs : [];
    this.setData({
      applicationCount: applications.length,
      activeApplicationCount: applications.filter(
        (item) => !["offer", "rejected", "withdrawn"].includes(item.status),
      ).length,
      resumeCount: resumes.length,
      recommendedJobs: jobs
        .filter((job) => jobMatchesPreferences(job, profile))
        .slice(0, 3)
        .map((job) => ({
          ...job,
          reason: getRecommendationReason(job, profile),
        })),
    });
  },

  onRecommendedJobTap(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id || "");
    if (!id) return;
    wx.navigateTo({ url: `/pages/jobs/detail?id=${encodeURIComponent(id)}` });
  },

  onLogin() {
    wx.navigateTo({ url: "/pages/login/index" });
  },

  onRetry() {
    void this.loadProfile();
  },

  onToggleEdit() {
    this.setData({ editing: !this.data.editing, errorMessage: "" });
  },

  onOpenSupport() {
    wx.navigateTo({ url: "/pages/support/index" });
  },

  async loadAccountStatus() {
    try {
      const response = await apiRequest<AccountStatusResponse>("/auth/account");
      this.setData({ accountStatus: response.data });
    } catch {
      // The profile remains usable when account status cannot be read.
    }
  },

  onToggleEmailBinding() {
    this.setData({ showEmailBinding: !this.data.showEmailBinding });
  },

  onBindingEmailInput(event: WechatMiniprogram.Input) {
    this.setData({ bindingEmail: event.detail.value });
  },

  onBindingPasswordInput(event: WechatMiniprogram.Input) {
    this.setData({ bindingPassword: event.detail.value });
  },

  async onBindWechat() {
    if (this.data.accountLoading) return;
    this.setData({ accountLoading: true });
    try {
      const code = await getWechatLoginCode();
      await apiRequest<AccountBindingResponse>("/auth/account", {
        method: "POST",
        data: { action: "bind_wechat", code },
      });
      wx.showToast({ title: "微信已绑定", icon: "success" });
      await this.loadAccountStatus();
    } catch (error) {
      wx.showToast({
        title: error instanceof Error ? error.message : "绑定失败",
        icon: "none",
      });
    } finally {
      this.setData({ accountLoading: false });
    }
  },

  async onBindEmail() {
    if (this.data.accountLoading) return;
    if (!this.data.bindingEmail.trim() || !this.data.bindingPassword) {
      wx.showToast({ title: "请输入邮箱和密码", icon: "none" });
      return;
    }
    this.setData({ accountLoading: true });
    try {
      const response = await apiRequest<AccountBindingResponse>(
        "/auth/account",
        {
          method: "POST",
          data: {
            action: "bind_email",
            email: this.data.bindingEmail,
            password: this.data.bindingPassword,
          },
        },
      );
      if (response.data.session) saveSession(response.data.session);
      this.setData({
        showEmailBinding: false,
        bindingEmail: "",
        bindingPassword: "",
      });
      wx.showToast({ title: "邮箱账号已合并", icon: "success" });
      await this.loadAccountStatus();
      await this.loadProfile();
    } catch (error) {
      wx.showToast({
        title: error instanceof Error ? error.message : "绑定失败",
        icon: "none",
      });
    } finally {
      this.setData({ accountLoading: false });
    }
  },

  onUnbindWechat() {
    wx.showModal({
      title: "解绑微信？",
      content: "解绑后仍可使用已绑定邮箱登录。",
      confirmText: "确认解绑",
      confirmColor: "#9f2d3f",
      success: (result) => {
        if (result.confirm) void this.unbindWechat();
      },
    });
  },

  async unbindWechat() {
    this.setData({ accountLoading: true });
    try {
      await apiRequest("/auth/account", { method: "DELETE" });
      wx.showToast({ title: "微信已解绑", icon: "success" });
      await this.loadAccountStatus();
    } catch (error) {
      wx.showToast({
        title: error instanceof Error ? error.message : "解绑失败",
        icon: "none",
      });
    } finally {
      this.setData({ accountLoading: false });
    }
  },

  onDraftInput(event: WechatMiniprogram.Input) {
    const field = String(event.currentTarget.dataset.field || "");
    if (!field) return;
    this.setData({ [field]: event.detail.value });
  },

  onSaveProfile() {
    if (this.data.saving) return;
    this.setData({ saving: true, errorMessage: "" });
    void apiRequest<ProfileResponse>("/profile", {
      method: "PUT",
      data: {
        displayName: this.data.draftDisplayName,
        phone: this.data.draftPhone,
        city: this.data.draftCity,
        school: this.data.draftSchool,
        major: this.data.draftMajor,
        graduationYear: this.data.draftGraduationYear,
        preferredRegions: parseList(this.data.draftPreferredRegions),
        targetRoles: parseList(this.data.draftTargetRoles),
      },
    })
      .then((response) => {
        const profile = response.data.profile;
        this.setData({
          editing: false,
          avatarLetter: profile.displayName.trim().slice(0, 1) || "星",
          profile: toProfileView(profile),
        });
        wx.showToast({ title: "资料已同步", icon: "success" });
      })
      .catch((error: unknown) => {
        this.setData({
          errorMessage:
            error instanceof Error ? error.message : "资料保存失败，请重试。",
        });
      })
      .finally(() => this.setData({ saving: false }));
  },

  onGenerateWebCode() {
    if (this.data.generatingWebCode) return;
    this.setData({ generatingWebCode: true });
    void apiRequest<WebLoginCodeResponse>("/auth/web-code", {
      method: "POST",
    })
      .then((response) => {
        const code = response.data.code;
        wx.showModal({
          title: "网页登录码",
          content: `${code}\n\n5 分钟内有效，仅可使用一次。请在拾星网页版登录页选择“微信登录”后输入。`,
          confirmText: "复制",
          success(result) {
            if (result.confirm) {
              wx.setClipboardData({ data: code });
            }
          },
        });
      })
      .catch((error: unknown) => {
        wx.showToast({
          title: error instanceof Error ? error.message : "生成失败，请重试",
          icon: "none",
        });
      })
      .finally(() => this.setData({ generatingWebCode: false }));
  },

  onLogout() {
    if (this.data.loggingOut) return;
    this.setData({ loggingOut: true });
    void logout()
      .then(() => {
        this.setData({
          authenticated: false,
          profile: null,
        });
        wx.showToast({ title: "已退出登录", icon: "success" });
      })
      .catch(() => {
        this.setData({
          authenticated: false,
          profile: null,
        });
      })
      .finally(() => this.setData({ loggingOut: false }));
  },
});

function parseList(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[、,，/\s]+/u)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ).slice(0, 12);
}

function toProfileView(profile: Profile): ProfileView {
  return {
    ...profile,
    identitySummary: [
      profile.school || "学校待完善",
      profile.graduationYear || "毕业年份待完善",
    ].join(" · "),
    preferredRegionsLabel: profile.preferredRegions.join("、") || "未设置",
    targetRolesLabel: profile.targetRoles.join("、") || "未设置",
  };
}

function getProfileCompletion(profile: Profile) {
  const checks = [
    profile.displayName,
    profile.phone,
    profile.city,
    profile.school,
    profile.major,
    profile.graduationYear,
    profile.preferredRegions.length > 0 ? "yes" : "",
    profile.targetRoles.length > 0 ? "yes" : "",
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function jobMatchesPreferences(job: Job, profile: Profile) {
  const regionMatched =
    profile.preferredRegions.length === 0 ||
    /全国|全球/u.test(job.locations) ||
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
      const normalized = role.toLowerCase();
      if (roleText.includes(normalized)) return true;
      return job.jobCategories.some((category) => {
        const stem = category.replace(/类$/u, "").toLowerCase();
        return normalized.includes(stem) || stem.includes(normalized);
      });
    });
  return regionMatched && roleMatched;
}

function getRecommendationReason(job: Job, profile: Profile) {
  const role = profile.targetRoles.find((item) =>
    [job.jobTitles, job.industry, ...job.jobCategories]
      .join(" ")
      .toLowerCase()
      .includes(item.toLowerCase()),
  );
  const region = profile.preferredRegions.find((item) =>
    job.locations.includes(item),
  );
  return [role && `方向：${role}`, region && `地区：${region}`]
    .filter(Boolean)
    .join(" · ") || "符合当前求职偏好";
}
