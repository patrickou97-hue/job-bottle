import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import type { AdminUserSummary, AdminUserUpdate } from "@/lib/admin-users";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Profile, ProfileRole } from "@/lib/types";

const PAGE_SIZE = 100;

export async function GET(request: NextRequest) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;

  try {
    const page = clampPage(request.nextUrl.searchParams.get("page"));
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) throw error;

    const ids = data.users.map((user) => user.id);
    const [profilesResult, applicationsResult, resumesResult] = await Promise.all([
      ids.length ? admin.from("profiles").select("*").in("id", ids) : Promise.resolve({ data: [], error: null }),
      ids.length ? admin.from("user_applications").select("user_id").in("user_id", ids) : Promise.resolve({ data: [], error: null }),
      ids.length ? admin.from("resumes").select("user_id").in("user_id", ids) : Promise.resolve({ data: [], error: null }),
    ]);
    if (profilesResult.error) throw profilesResult.error;
    if (applicationsResult.error) throw applicationsResult.error;
    if (resumesResult.error) throw resumesResult.error;

    const profiles = new Map((profilesResult.data as Profile[]).map((profile) => [profile.id, profile]));
    const applicationCounts = countByUser(applicationsResult.data ?? []);
    const resumeCounts = countByUser(resumesResult.data ?? []);
    const users = data.users.map((user) => toSummary(
      user,
      profiles.get(user.id),
      applicationCounts.get(user.id) ?? 0,
      resumeCounts.get(user.id) ?? 0,
    ));

    return NextResponse.json({
      users,
      page,
      hasMore: data.users.length === PAGE_SIZE,
      currentUserId: access.userId,
    });
  } catch (error) {
    return NextResponse.json({ error: getServerError(error) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;

  try {
    const input = validateUpdate(await request.json().catch(() => null));
    if (input.id === access.userId && (input.disabled || input.role !== "admin")) {
      return NextResponse.json({ error: "不能停用或降级当前管理员账号。" }, { status: 400 });
    }

    const admin = createAdminClient();
    const [applicationCountResult, resumeCountResult] = await Promise.all([
      admin.from("user_applications").select("id", { count: "exact", head: true }).eq("user_id", input.id),
      admin.from("resumes").select("id", { count: "exact", head: true }).eq("user_id", input.id),
    ]);
    if (applicationCountResult.error) throw applicationCountResult.error;
    if (resumeCountResult.error) throw resumeCountResult.error;

    const { data: previousAuth, error: previousAuthError } = await admin.auth.admin.getUserById(input.id);
    if (previousAuthError) throw previousAuthError;
    const wasDisabled = isFutureDate(previousAuth.user.banned_until);
    const { data: authData, error: authError } = await admin.auth.admin.updateUserById(input.id, {
      ban_duration: input.disabled ? "876000h" : "none",
    });
    if (authError) throw authError;

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .upsert({
        id: input.id,
        display_name: input.displayName || "秋招用户",
        role: input.role,
      }, { onConflict: "id" })
      .select("*")
      .single();
    if (profileError) {
      await admin.auth.admin.updateUserById(input.id, {
        ban_duration: wasDisabled ? "876000h" : "none",
      });
      throw profileError;
    }

    return NextResponse.json({
      user: toSummary(
        authData.user,
        profile as Profile,
        applicationCountResult.count ?? 0,
        resumeCountResult.count ?? 0,
      ),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "请求格式无效。";
    const status = message === "请求格式无效。" ? 400 : 500;
    return NextResponse.json({ error: status === 400 ? message : getServerError(error) }, { status });
  }
}

async function requireAdmin() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return { response: NextResponse.json({ error: "请先登录管理员账号。" }, { status: 401 }) };
    }
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) {
      return { response: NextResponse.json({ error: "管理员权限读取失败，请稍后重试。" }, { status: 500 }) };
    }
    if (profile?.role !== "admin") {
      return { response: NextResponse.json({ error: "无权限管理用户账户。" }, { status: 403 }) };
    }
    return { userId: user.id };
  } catch {
    return { response: NextResponse.json({ error: "管理员鉴权服务暂时不可用。" }, { status: 503 }) };
  }
}

function validateUpdate(value: unknown): AdminUserUpdate & { id: string } {
  if (!value || typeof value !== "object") throw new Error("请求格式无效。");
  const input = value as Record<string, unknown>;
  const role = input.role;
  if (typeof input.id !== "string" || !input.id || (role !== "user" && role !== "admin") || typeof input.disabled !== "boolean") {
    throw new Error("请求格式无效。");
  }
  return {
    id: input.id,
    displayName: typeof input.displayName === "string" ? input.displayName.trim().slice(0, 60) : "",
    role: role as ProfileRole,
    disabled: input.disabled,
  };
}

function toSummary(user: User, profile: Profile | undefined, applicationCount: number, resumeCount: number): AdminUserSummary {
  return {
    id: user.id,
    email: user.email ?? "未设置邮箱",
    displayName: profile?.display_name ?? "秋招用户",
    role: profile?.role ?? "user",
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at ?? null,
    emailConfirmedAt: user.email_confirmed_at ?? null,
    bannedUntil: isFutureDate(user.banned_until) ? user.banned_until ?? null : null,
    applicationCount,
    resumeCount,
    school: profile?.school ?? null,
    targetRoles: profile?.target_roles ?? [],
  };
}

function countByUser(rows: { user_id: string }[]) {
  const counts = new Map<string, number>();
  rows.forEach(({ user_id }) => counts.set(user_id, (counts.get(user_id) ?? 0) + 1));
  return counts;
}

function clampPage(value: string | null) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? Math.min(page, 1000) : 1;
}

function isFutureDate(value: string | undefined) {
  return Boolean(value && new Date(value).getTime() > Date.now());
}

function getServerError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (message.includes("SUPABASE_SERVICE_ROLE_KEY")) return message;
  return "管理员用户数据操作失败。当前账户设置未改变，请检查服务端配置后重试。";
}
