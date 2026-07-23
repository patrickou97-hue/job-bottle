import { API_BASE_URL } from "../config/env";
import type { ApiErrorPayload } from "../types/api";
import { getValidAccessToken, refreshSession } from "./session";

// 微信小程序 wx.request 不支持 PATCH；更新接口统一使用 PUT 或动作型 POST。
type RequestMethod = "GET" | "POST" | "PUT" | "DELETE";

type RequestOptions = {
  method?: RequestMethod;
  data?: Record<string, unknown>;
  auth?: boolean;
  retryGetOnNetworkError?: boolean;
};

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code?: string;
  readonly requestId?: string;

  constructor(
    message: string,
    options: { statusCode: number; code?: string; requestId?: string },
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.requestId = options.requestId;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const method = options.method ?? "GET";
  const shouldUseAuth = options.auth ?? true;
  const token = shouldUseAuth ? await getValidAccessToken() : null;

  try {
    return await requestOnce<T>(path, {
      ...options,
      method,
      token,
    });
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.statusCode === 401 &&
      shouldUseAuth
    ) {
      const refreshed = await refreshSession();
      if (refreshed) {
        return requestOnce<T>(path, {
          ...options,
          method,
          token: refreshed.accessToken,
        });
      }
    }
    if (
      method === "GET" &&
      options.retryGetOnNetworkError !== false &&
      isNetworkError(error)
    ) {
      return requestOnce<T>(path, {
        ...options,
        method,
        token,
      });
    }
    throw error;
  }
}

function requestOnce<T>(
  path: string,
  options: RequestOptions & { method: RequestMethod; token: string | null },
) {
  return new Promise<T>((resolve, reject) => {
    wx.request({
      url: `${API_BASE_URL}${path}`,
      method: options.method,
      data: options.data,
      timeout: 12_000,
      header: {
        "content-type": "application/json",
        ...(options.token
          ? { Authorization: `Bearer ${options.token}` }
          : {}),
      },
      success(response) {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response.data as T);
          return;
        }
        const payload = (response.data ?? {}) as ApiErrorPayload;
        reject(
          new ApiError(
            payload.error || readableStatusMessage(response.statusCode),
            {
              statusCode: response.statusCode,
              code: payload.code,
              requestId: payload.requestId,
            },
          ),
        );
      },
      fail(error) {
        reject(new Error(error.errMsg || "网络连接失败，请重试。"));
      },
    });
  });
}

function readableStatusMessage(statusCode: number) {
  if (statusCode === 401) return "登录状态已失效，请重新登录。";
  if (statusCode === 403) return "当前账号没有执行此操作的权限。";
  if (statusCode === 404) return "请求的内容不存在或已下线。";
  if (statusCode === 409) return "数据刚刚发生变化，请刷新后重试。";
  if (statusCode === 429) return "操作太频繁，请稍后再试。";
  return "服务暂时不可用，请稍后重试。";
}

function isNetworkError(error: unknown) {
  return (
    error instanceof Error &&
    !("statusCode" in error)
  );
}
