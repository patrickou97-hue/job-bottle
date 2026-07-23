import type { WechatLoginResponse } from "../types/api";
import { apiRequest } from "./request";
import { clearSession, getSession, saveSession } from "./session";

export async function loginWithWechat() {
  const code = await getWechatLoginCode();
  const response = await apiRequest<WechatLoginResponse>("/auth/wechat", {
    method: "POST",
    auth: false,
    data: { code },
  });
  saveSession(response.data.session);
  return response.data;
}

export async function logout() {
  const session = getSession();
  try {
    if (session) {
      await apiRequest("/auth/logout", {
        method: "POST",
        data: { refreshToken: session.refreshToken },
      });
    }
  } finally {
    clearSession();
  }
}

function getWechatLoginCode() {
  return new Promise<string>((resolve, reject) => {
    wx.login({
      timeout: 10_000,
      success(result) {
        if (result.code) {
          resolve(result.code);
          return;
        }
        reject(new Error("微信未返回登录凭证，请重试。"));
      },
      fail() {
        reject(new Error("微信登录暂时不可用，请稍后重试。"));
      },
    });
  });
}
