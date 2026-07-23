import { loginWithWechat } from "../../services/auth";

Page({
  data: {
    agreed: false,
    submitting: false,
    errorMessage: "",
    redirect: "",
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

  onLogin() {
    if (!this.data.agreed) {
      this.setData({ errorMessage: "请先阅读并同意隐私政策和用户协议。" });
      return;
    }
    if (this.data.submitting) return;

    this.setData({ submitting: true, errorMessage: "" });
    void loginWithWechat()
      .then((result) => {
        wx.showToast({
          title: result.isNewUser ? "欢迎来到拾星" : "登录成功",
          icon: "success",
        });
        if (this.data.redirect) {
          wx.redirectTo({ url: this.data.redirect });
          return;
        }
        wx.switchTab({ url: "/pages/jobs/index" });
      })
      .catch((error: unknown) => {
        this.setData({
          errorMessage:
            error instanceof Error ? error.message : "登录失败，请重试。",
        });
      })
      .finally(() => this.setData({ submitting: false }));
  },
});
