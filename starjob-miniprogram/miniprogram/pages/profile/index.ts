import { logout } from "../../services/auth";
import { apiRequest } from "../../services/request";
import { hasActiveSession } from "../../services/session";
import type { ProfileResponse } from "../../types/api";
import type { Profile } from "../../types/domain";

type ProfileView = Profile & {
  preferredRegionsLabel: string;
  targetRolesLabel: string;
};

Page({
  data: {
    authenticated: false,
    loading: false,
    errorMessage: "",
    profile: null as ProfileView | null,
    loggingOut: false,
  },

  onShow() {
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
        profile: {
          ...response.data.profile,
          preferredRegionsLabel:
            response.data.profile.preferredRegions.join("、") || "未设置",
          targetRolesLabel:
            response.data.profile.targetRoles.join("、") || "未设置",
        },
      });
    } catch (error) {
      this.setData({
        loading: false,
        errorMessage:
          error instanceof Error ? error.message : "个人资料读取失败。",
      });
    }
  },

  onLogin() {
    wx.navigateTo({ url: "/pages/login/index" });
  },

  onRetry() {
    void this.loadProfile();
  },

  onFeedback() {
    wx.showModal({
      title: "反馈入口",
      content: "正式反馈接口接入前，请先通过拾星网站反馈页联系我们。",
      showCancel: false,
    });
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
