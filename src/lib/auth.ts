import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database, Profile } from "@/lib/types";

const DEFAULT_AUTH_TIMEOUT_MS = 1800;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

function hasStoredBrowserSession() {
  if (typeof window === "undefined") return true;
  const nowInSeconds = Math.floor(Date.now() / 1000);
  let localStorageHasSession = false;
  let cookieHasSession = false;

  try {
    localStorageHasSession = Object.keys(window.localStorage)
      .filter((key) => key.startsWith("sb-") && key.includes("auth-token"))
      .some((key) => {
        try {
          const rawValue = window.localStorage.getItem(key);
          if (!rawValue) return false;
          const parsed = JSON.parse(rawValue) as {
            currentSession?: { expires_at?: number | null };
            expires_at?: number | null;
          };
          const expiresAt = parsed.currentSession?.expires_at ?? parsed.expires_at;
          return typeof expiresAt === "number" ? expiresAt > nowInSeconds + 10 : true;
        } catch {
          return false;
        }
      });
  } catch {
    localStorageHasSession = false;
  }

  try {
    cookieHasSession = document.cookie
      .split(";")
      .some((item) => item.trim().startsWith("sb-") && item.includes("auth-token"));
  } catch {
    cookieHasSession = false;
  }

  return localStorageHasSession || cookieHasSession;
}

export async function ensureProfile(
  supabase: SupabaseClient<Database>,
  user: User,
  profileInput?: {
    city?: string;
    displayName?: string;
    graduationYear?: string;
    major?: string;
    phone?: string;
    preferredRegions?: string[];
    school?: string;
    targetRoles?: string[];
  },
) {
  const displayName =
    profileInput?.displayName?.trim() ||
    (user.user_metadata?.display_name ?? user.email?.split("@")[0] ?? "秋招用户");
  const preferredRegions = profileInput?.preferredRegions ?? user.user_metadata?.preferred_regions ?? [];
  const targetRoles = profileInput?.targetRoles ?? user.user_metadata?.target_roles ?? [];

  const { error: createProfileError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      display_name: displayName,
      phone: normalizeProfileText(profileInput?.phone ?? user.user_metadata?.phone),
      city: normalizeProfileText(profileInput?.city ?? user.user_metadata?.city),
      school: normalizeProfileText(profileInput?.school ?? user.user_metadata?.school),
      major: normalizeProfileText(profileInput?.major ?? user.user_metadata?.major),
      graduation_year: normalizeProfileText(profileInput?.graduationYear ?? user.user_metadata?.graduation_year),
      preferred_regions: normalizeProfileTags(preferredRegions),
      target_roles: normalizeProfileTags(targetRoles),
      role: "user",
    },
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (createProfileError) throw createProfileError;

  if (profileInput) {
    const { error: updateProfileError } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        phone: normalizeProfileText(profileInput.phone),
        city: normalizeProfileText(profileInput.city),
        school: normalizeProfileText(profileInput.school),
        major: normalizeProfileText(profileInput.major),
        graduation_year: normalizeProfileText(profileInput.graduationYear),
        preferred_regions: normalizeProfileTags(preferredRegions),
        target_roles: normalizeProfileTags(targetRoles),
      })
      .eq("id", user.id);
    if (updateProfileError) throw updateProfileError;
  }
}

export async function getCurrentUser(
  supabase: SupabaseClient<Database>,
  timeoutMs = DEFAULT_AUTH_TIMEOUT_MS,
) {
  if (!hasStoredBrowserSession()) return null;

  const {
    data: { session },
  } = await withTimeout(
    supabase.auth.getSession(),
    timeoutMs,
    "读取登录状态超时。",
  );
  return session?.user ?? null;
}

export async function getCurrentUserOrNull(
  supabase: SupabaseClient<Database>,
  timeoutMs = DEFAULT_AUTH_TIMEOUT_MS,
) {
  try {
    return await getCurrentUser(supabase, timeoutMs);
  } catch {
    return null;
  }
}

export async function getMyProfile(supabase: SupabaseClient<Database>) {
  const user = await getCurrentUser(supabase);
  if (!user) return { user: null, profile: null };

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { user, profile: data as Profile | null };
}

export function translateAuthError(message?: string) {
  if (!message) return "操作失败，请稍后再试。";
  const lower = message.toLowerCase();
  if (lower.includes("invalid login")) return "邮箱或密码不正确。";
  if (lower.includes("email not confirmed")) return "请先完成邮箱验证。";
  if (lower.includes("password")) return "密码不符合要求，请至少输入 6 位。";
  if (lower.includes("already registered")) return "这个邮箱已经注册，请直接登录。";
  if (lower.includes("rate limit")) return "操作太频繁，请稍后再试。";
  return "操作失败，请检查邮箱和密码。";
}

function normalizeProfileTags(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => String(item).trim())
        .filter(Boolean)
        .slice(0, 12),
    ),
  );
}

function normalizeProfileText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
