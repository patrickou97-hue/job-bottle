import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ReferralCode } from "./types";
import { deriveTencentReferralCodes } from "./referral-source.mjs";

type TencentReferralSourceJob = {
  id: string;
  company_name: string;
  batch_type: string | null;
  job_titles: string | null;
  apply_url: string | null;
  is_active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ReferralCodeListItem = Pick<ReferralCode,
  "id" | "company_name" | "job_id" | "applicable_roles" | "code" | "usage_note" |
  "expires_at" | "created_at" | "updated_at"
> & {
  isPreview?: boolean;
  source_type?: "tencent_job_link" | "public_post";
  publisher_name?: "拾星小助手整理";
  source_job_ids?: string[];
  source_urls?: string[];
  source_platform?: "小红书" | "牛客" | "力扣";
  source_url?: string;
  published_at?: string | null;
  source_verified_at?: string;
};

export type ReferralCodeInput = {
  companyName: string;
  jobId?: string | null;
  applicableRoles?: string;
  code: string;
  usageNote?: string;
  expiresAt?: string;
};

export type ReferralCodeCreateResult = {
  item: ReferralCodeListItem;
  reviewStatus: "approved" | "removed" | "error" | "queued" | "preview";
};

const PUBLIC_REFERRAL_COLUMNS = "id,company_name,job_id,applicable_roles,code,usage_note,expires_at,created_at,updated_at";
const LOCAL_REFERRAL_STORAGE_KEY = "starjob-local-referral-codes-v1";
const LOCAL_REPORTED_STORAGE_KEY = "starjob-local-reported-referral-codes-v1";
const REFERRAL_READ_TIMEOUT_MS = 3500;
const REMOTE_SOURCE_TIMEOUT_MS = 6000;
const PROHIBITED_REFERRAL_CONTENT = /(https?:\/\/|www\.|微信|v信|qq|收费|付费|转账|红包|验证码|密码|身份证|银行卡)/i;
const REFERRAL_CODE_PATTERN = /^[A-Za-z0-9_-]{2,64}$/;

const LOCAL_PREVIEW_CODES: ReferralCodeListItem[] = [
  {
    id: "local-preview-jd",
    company_name: "京东",
    job_id: null,
    applicable_roles: "校招技术、产品与运营岗位",
    code: "DEMO-JD-2026",
    usage_note: "本地界面演示码，不可用于真实投递。正式版本只展示用户自行上传的内容。",
    expires_at: "2026-09-30",
    created_at: "2026-08-16T10:00:00.000Z",
    updated_at: "2026-08-16T10:00:00.000Z",
    isPreview: true,
  },
  {
    id: "local-preview-tencent",
    company_name: "腾讯",
    job_id: null,
    applicable_roles: "校招岗位，具体以官方投递页为准",
    code: "DEMO-TX-STAR",
    usage_note: "本地界面演示码，不可用于真实投递。请在使用前核对公司与岗位信息。",
    expires_at: null,
    created_at: "2026-08-15T08:30:00.000Z",
    updated_at: "2026-08-15T08:30:00.000Z",
    isPreview: true,
  },
];

export async function fetchReferralCodes(
  supabase: SupabaseClient<Database>,
  companyName?: string,
  sourceJobs?: TencentReferralSourceJob[],
) {
  let query = supabase
    .from("referral_codes")
    .select(PUBLIC_REFERRAL_COLUMNS)
    .order("created_at", { ascending: false });
  if (companyName?.trim()) query = query.eq("company_name", companyName.trim());
  let result: Awaited<typeof query>;
  try {
    result = await withReferralReadTimeout(query);
  } catch (error) {
    if (isReferralReadTimeoutError(error) && canUseLocalPreview()) {
      return mergeSourceReferralCodes(getLocalPreviewCodes(), sourceJobs, companyName);
    }
    throw error;
  }
  const { data, error } = result;
  if (!error) {
    const remoteSources = await fetchRemoteSourceReferralCodes(companyName);
    return mergeSourceReferralCodes((data ?? []) as unknown as ReferralCodeListItem[], sourceJobs, companyName, remoteSources);
  }
  if (isMissingReferralTableError(error) && canUseLocalPreview()) {
    return mergeSourceReferralCodes(getLocalPreviewCodes(), sourceJobs, companyName);
  }
  throw error;
}

export async function createReferralCode(
  input: ReferralCodeInput,
): Promise<ReferralCodeCreateResult> {
  const errorMessage = validateReferralCodeInput(input);
  if (errorMessage) throw new Error(errorMessage);
  const payload = {
    company_name: input.companyName.trim(),
    job_id: input.jobId || null,
    applicable_roles: cleanOptional(input.applicableRoles),
    code: normalizeReferralCode(input.code),
    usage_note: cleanOptional(input.usageNote),
    expires_at: input.expiresAt || null,
    is_active: true,
  };
  let response: Response;
  try {
    response = await fetch("/api/referrals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch (error) {
    if (canUseLocalPreview()) return { item: saveLocalPreviewCode(payload), reviewStatus: "preview" };
    throw error;
  }
  const body = await response.json().catch(() => null) as {
    item?: ReferralCodeListItem;
    reviewStatus?: ReferralCodeCreateResult["reviewStatus"];
    error?: string;
  } | null;
  if (response.ok && body?.item && body.reviewStatus) {
    return { item: body.item, reviewStatus: body.reviewStatus };
  }
  if (canUseLocalPreview() && response.status === 503) {
    return { item: saveLocalPreviewCode(payload), reviewStatus: "preview" };
  }
  throw new Error(body?.error || "内推码上传失败，请稍后重试。");
}

export async function reportReferralCode(
  supabase: SupabaseClient<Database>,
  userId: string,
  referralCodeId: string,
  reason: string,
) {
  const cleanReason = reason.trim();
  if (cleanReason.length < 2 || cleanReason.length > 300) throw new Error("请填写 2–300 字的举报原因。");
  const { error } = await supabase.from("referral_code_reports").insert({
    referral_code_id: referralCodeId,
    reporter_id: userId,
    reason: cleanReason,
  });
  if (!error) return;
  if (isMissingReferralTableError(error) && canUseLocalPreview()) {
    saveLocalReport(referralCodeId);
    return;
  }
  if (getErrorCode(error) === "23505") throw new Error("你已经举报过这条内推码了。");
  throw error;
}

export function validateReferralCodeInput(input: ReferralCodeInput) {
  const companyName = input.companyName.trim();
  const applicableRoles = input.applicableRoles?.trim() ?? "";
  const usageNote = input.usageNote?.trim() ?? "";
  const code = normalizeReferralCode(input.code);
  if (!companyName || companyName.length > 80) return "请选择正确的公司。";
  if (!REFERRAL_CODE_PATTERN.test(code)) return "内推码需为 2–64 位字母、数字、短横线或下划线。";
  if (applicableRoles.length > 160) return "适用范围最多填写 160 字。";
  if (usageNote.length > 500) return "使用说明最多填写 500 字。";
  if (PROHIBITED_REFERRAL_CONTENT.test(`${applicableRoles} ${usageNote}`)) {
    return "请移除联系方式、外部链接、收费交易或身份证件等敏感内容。";
  }
  if (input.expiresAt && input.expiresAt < getTodayDate()) return "有效期不能早于今天。";
  return "";
}

export function normalizeReferralCode(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

export function matchReferralCompanies(companies: string[], query: string, limit = 8) {
  const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");
  if (!normalizedQuery) return [];
  return companies
    .filter((company) => company.toLocaleLowerCase("zh-CN").includes(normalizedQuery))
    .sort((left, right) => {
      const leftExact = left.toLocaleLowerCase("zh-CN") === normalizedQuery;
      const rightExact = right.toLocaleLowerCase("zh-CN") === normalizedQuery;
      if (leftExact !== rightExact) return leftExact ? -1 : 1;
      return left.localeCompare(right, "zh-CN");
    })
    .slice(0, Math.max(1, limit));
}

export function isReferralCodeExpired(item: Pick<ReferralCodeListItem, "expires_at">) {
  return Boolean(item.expires_at && item.expires_at < getTodayDate());
}

export function isLocalReferralPreviewItem(item: ReferralCodeListItem) {
  return Boolean(item.isPreview);
}

function cleanOptional(value?: string) {
  return value?.trim() || null;
}

function getTodayDate() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function isMissingReferralTableError(error: unknown) {
  const message = typeof error === "object" && error && "message" in error
    ? String(error.message)
    : String(error ?? "");
  return /referral_codes|referral_code_reports/i.test(message)
    && /relation|schema cache|does not exist|could not find/i.test(message);
}

function getErrorCode(error: unknown) {
  return typeof error === "object" && error && "code" in error ? String(error.code) : "";
}

function withReferralReadTimeout<T>(operation: PromiseLike<T>) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("REFERRAL_READ_TIMEOUT")), REFERRAL_READ_TIMEOUT_MS);
  });
  return Promise.race([Promise.resolve(operation), timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

function isReferralReadTimeoutError(error: unknown) {
  return error instanceof Error && error.message === "REFERRAL_READ_TIMEOUT";
}

function canUseLocalPreview() {
  if (typeof window === "undefined") return false;
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
}

function getLocalPreviewCodes() {
  if (!canUseLocalPreview()) return [];
  try {
    const stored = JSON.parse(window.localStorage.getItem(LOCAL_REFERRAL_STORAGE_KEY) ?? "[]");
    return [...(Array.isArray(stored) ? stored : []), ...LOCAL_PREVIEW_CODES] as ReferralCodeListItem[];
  } catch {
    return [...LOCAL_PREVIEW_CODES];
  }
}

function saveLocalPreviewCode(payload: {
  company_name: string;
  job_id: string | null;
  applicable_roles: string | null;
  code: string;
  usage_note: string | null;
  expires_at: string | null;
}) {
  const now = new Date().toISOString();
  const item: ReferralCodeListItem = {
    id: `local-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`,
    ...payload,
    created_at: now,
    updated_at: now,
    isPreview: true,
  };
  const existing = getLocalPreviewCodes().filter((entry) => !entry.id.startsWith("local-preview-"));
  window.localStorage.setItem(LOCAL_REFERRAL_STORAGE_KEY, JSON.stringify([item, ...existing]));
  return item;
}

function saveLocalReport(referralCodeId: string) {
  try {
    const existing = JSON.parse(window.localStorage.getItem(LOCAL_REPORTED_STORAGE_KEY) ?? "[]");
    const ids = new Set(Array.isArray(existing) ? existing : []);
    ids.add(referralCodeId);
    window.localStorage.setItem(LOCAL_REPORTED_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Local preview reporting is best-effort and never affects production data.
  }
}

function mergeSourceReferralCodes(
  persisted: ReferralCodeListItem[],
  sourceJobs: TencentReferralSourceJob[] | undefined,
  companyName: string | undefined,
  remoteSources: ReferralCodeListItem[] = [],
) {
  const filtered = persisted.filter((item) => !companyName || item.company_name === companyName);
  const remote = remoteSources.filter((item) => !companyName || item.company_name === companyName);
  if (!sourceJobs && remote.length === 0) return filtered;
  const sourceItems = deriveTencentReferralCodes(sourceJobs)
    .filter((item) => !companyName || item.company_name === companyName) as ReferralCodeListItem[];
  sourceItems.push(...remote);
  const existingKeys = new Set(filtered.map((item) => `${item.company_name.toLocaleLowerCase("zh-CN")}\u0000${item.code.toLocaleLowerCase("en-US")}`));
  const uniqueSources = sourceItems.filter((item) => {
    const key = `${item.company_name.toLocaleLowerCase("zh-CN")}\u0000${item.code.toLocaleLowerCase("en-US")}`;
    if (existingKeys.has(key)) return false;
    existingKeys.add(key);
    return true;
  });
  return [...uniqueSources, ...filtered];
}

async function fetchRemoteSourceReferralCodes(companyName?: string) {
  if (typeof window === "undefined") return [] as ReferralCodeListItem[];
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REMOTE_SOURCE_TIMEOUT_MS);
  try {
    const query = companyName ? `?company=${encodeURIComponent(companyName)}` : "";
    const response = await fetch(`/api/referrals/source${query}`, { cache: "no-store", signal: controller.signal });
    if (!response.ok) return [];
    const body = await response.json().catch(() => null) as { rows?: ReferralCodeListItem[] } | null;
    return Array.isArray(body?.rows) ? body.rows : [];
  } catch {
    return [];
  } finally {
    window.clearTimeout(timeoutId);
  }
}
