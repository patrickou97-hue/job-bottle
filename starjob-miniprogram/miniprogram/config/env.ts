export const API_BASE_URL = "https://www.starjob.space/api/miniprogram";

// 真实岗位 API 已实现；若线上不可用，页面展示错误态，不回退伪造数据。
export const USE_SAMPLE_JOB_DATA = false;

// 送审包只开放生产服务端已经覆盖的能力。完整实现仍保留在本地，
// 对应接口上线后只需切换这里，无需重新制作页面。
export const RELEASE_CAPABILITIES = {
  emailLogin: true,
  webLoginCode: false,
  resumeCreation: true,
  applicationProgressUpdate: true,
} as const;
