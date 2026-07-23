import { API_BASE_URL } from "../config/env";
import type { RefreshResponse } from "../types/api";

const SESSION_STORAGE_KEY = "starjob:miniprogram:session:v1";
const EXPIRY_SKEW_MS = 30_000;

let refreshPromise: Promise<StarJobSession | null> | null = null;

function updateGlobalSession(session: StarJobSession | null) {
  try {
    getApp<StarJobAppOptions>().globalData.session = session;
  } catch {
    // App 初始化前只更新本地存储，onLaunch 会恢复。
  }
}

export function restoreSession(): StarJobSession | null {
  try {
    const session = wx.getStorageSync<StarJobSession>(SESSION_STORAGE_KEY);
    if (!session || typeof session !== "object") return null;
    if (
      !session.accessToken ||
      !session.refreshToken ||
      !session.userId ||
      session.refreshTokenExpiresAt <= Date.now()
    ) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function saveSession(session: StarJobSession) {
  wx.setStorageSync(SESSION_STORAGE_KEY, session);
  updateGlobalSession(session);
}

export function clearSession() {
  try {
    wx.removeStorageSync(SESSION_STORAGE_KEY);
  } finally {
    updateGlobalSession(null);
  }
}

export function getSession() {
  try {
    return getApp<StarJobAppOptions>().globalData.session ?? restoreSession();
  } catch {
    return restoreSession();
  }
}

export function hasActiveSession() {
  const session = getSession();
  return Boolean(session && session.refreshTokenExpiresAt > Date.now());
}

export async function getValidAccessToken() {
  const session = getSession();
  if (!session) return null;
  if (session.accessTokenExpiresAt > Date.now() + EXPIRY_SKEW_MS) {
    return session.accessToken;
  }
  const refreshed = await refreshSession();
  return refreshed?.accessToken ?? null;
}

export function refreshSession() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = performRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

async function performRefresh(): Promise<StarJobSession | null> {
  const current = getSession();
  if (!current || current.refreshTokenExpiresAt <= Date.now()) {
    clearSession();
    return null;
  }

  try {
    const response = await rawRequest<RefreshResponse>(
      `${API_BASE_URL}/auth/refresh`,
      { refreshToken: current.refreshToken },
    );
    saveSession(response.data.session);
    return response.data.session;
  } catch {
    clearSession();
    return null;
  }
}

function rawRequest<T>(url: string, data: Record<string, unknown>) {
  return new Promise<T>((resolve, reject) => {
    wx.request({
      url,
      method: "POST",
      data,
      timeout: 12_000,
      header: {
        "content-type": "application/json",
      },
      success(response) {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response.data as T);
          return;
        }
        reject(new Error("登录状态刷新失败。"));
      },
      fail() {
        reject(new Error("网络连接失败。"));
      },
    });
  });
}
