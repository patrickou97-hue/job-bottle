import { loginWithEmail, loginWithWechat } from "../../services/auth";
import { RELEASE_CAPABILITIES } from "../../config/env";

Page({
  data: {
    mode: "wechat" as "email" | "wechat",
    emailLoginAvailable: RELEASE_CAPABILITIES.emailLogin,
    email: "",
    password: "",
    agreed: false,
    submitting: false,
    errorMessage: "",
    redirect: "",
  },

  onModeTap(event: WechatMiniprogram.TouchEvent) {
    if (!RELEASE_CAPABILITIES.emailLogin) return;
    const mode = event.currentTarget.dataset.mode === "wechat" ? "wechat" : "email";
    this.setData({ mode, errorMessage: "" });
  },

  onEmailInput(event: WechatMiniprogram.Input) {
    this.setData({ email: event.detail.value, errorMessage: "" });
  },

  onPasswordInput(event: WechatMiniprogram.Input) {
    this.setData({ password: event.detail.value, errorMessage: "" });
  },

  onLoad(options: Record<string, string | undefined>) {
    this.setData({
      redirect: options.redirect ? decodeURIComponent(options.redirect) : "",
    });
  },

  onAgreementChange(event: WechatMiniprogram.CheckboxGroupChange) {
    this.setData({
      agreed: event.detail.value.includes("agreed"),
      errorMessage: "",
    });
  },

  onEmailLogin() {
    if (!this.validateAgreement()) return;
    if (!this.data.email.trim() || !this.data.password) {
      this.setData({ errorMessage: "请输入邮箱和密码。" });
      return;
    }
    if (this.data.submitting) return;
    this.setData({ submitting: true, errorMessage: "" });
    void loginWithEmail(this.data.email, this.data.password)
      .then(() => this.finishLogin("登录成功"))
      .catch((error: unknown) => {
        this.setData({
          errorMessage:
            error instanceof Error ? error.message : "登录失败，请重试。",
        });
      })
      .finally(() => this.setData({ submitting: false }));
  },

  onWechatLogin() {
    if (!this.validateAgreement()) return;
    if (this.data.submitting) return;
    this.setData({ submitting: true, errorMessage: "" });
    void loginWithWechat()
      .then((result) =>
        this.finishLogin(result.isNewUser ? "欢迎来到拾星" : "登录成功"),
      )
      .catch((error: unknown) => {
        this.setData({
          errorMessage:
            error instanceof Error ? error.message : "登录失败，请重试。",
        });
      })
      .finally(() => this.setData({ submitting: false }));
  },

  validateAgreement() {
    if (!this.data.agreed) {
      this.setData({ errorMessage: "请先阅读并同意隐私政策和用户协议。" });
      return false;
    }
    return true;
  },

  finishLogin(title: string) {
    wx.showToast({ title, icon: "success" });
    if (this.data.redirect) {
      if (isTabPage(this.data.redirect)) {
        wx.switchTab({ url: this.data.redirect });
      } else {
        wx.redirectTo({ url: this.data.redirect });
      }
      return;
    }
    wx.switchTab({ url: "/pages/galaxy/index" });
  },
});

function isTabPage(url: string) {
  return [
    "/pages/galaxy/index",
    "/pages/jobs/index",
    "/pages/bottle/index",
    "/pages/resumes/index",
    "/pages/profile/index",
  ].includes(url);
}
