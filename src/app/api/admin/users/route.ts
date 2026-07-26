import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type {
  AdminUserActivityFilter,
  AdminUserMetrics,
  AdminUserRoleFilter,
  AdminUserSort,
  AdminUserStarInterviewFilter,
  AdminUserStatusFilter,
  AdminUserSummary,
  AdminUserUpdate,
} from "@/lib/admin-users";
import {
  getAccountType,
  isWechatInternalEmail,
} from "@/lib/account-identity";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database, Profile, ProfileRole } from "@/lib/types";

const AUTH_PAGE_SIZE = 1000;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const DATABASE_CHUNK_SIZE = 500;
const USAGE_PAGE_SIZE = 1000;
const HOUR_MS = 60 * 60 * 1000;
const PRIMARY_ADMIN_EMAIL = "raywang6688@outlook.com";
const STAR_INTERVIEW_ACCESS_KEY = "star_interview_unlimited_access";

type AdminProfile = Pick<Profile, "id" | "display_name" | "role" | "school" | "target_roles">;
type AdminWechatIdentity = { id: string; user_id: string };

export async function GET(request: NextRequest) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;

  try {
    const filters = parseListFilters(request.nextUrl.searchParams);
    const admin = createAdminClient();
    const authUsers = await listAllAuthUsers(admin);
    const authUserIds = authUsers.map((user) => user.id);
    const [profiles, wechatIdentities] = await Promise.all([
      fetchProfiles(admin, authUserIds),
      fetchWechatIdentities(admin, authUserIds),
    ]);
    const metrics = buildMetrics(authUsers, profiles);
    const filteredUsers = authUsers
      .filter((user) => matchesFilters(
        user,
        profiles.get(user.id),
        wechatIdentities.get(user.id),
        filters,
      ))
      .sort(getUserComparator(filters.sort));
    const totalFiltered = filteredUsers.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / filters.pageSize));
    const page = Math.min(filters.page, totalPages);
    const start = (page - 1) * filters.pageSize;
    const pageUsers = filteredUsers.slice(start, start + filters.pageSize);
    const pageIds = pageUsers.map((user) => user.id);
    const [applicationCounts, resumeCounts] = await Promise.all([
      fetchUsageCounts(admin, "user_applications", pageIds),
      fetchUsageCounts(admin, "resumes", pageIds),
    ]);
    const users = pageUsers.map((user) => toSummary(
      user,
      profiles.get(user.id),
      wechatIdentities.get(user.id),
      applicationCounts.get(user.id) ?? 0,
      resumeCounts.get(user.id) ?? 0,
    ));

    return NextResponse.json({
      users,
      page,
      pageSize: filters.pageSize,
      totalFiltered,
      totalPages,
      metrics,
      currentUserId: access.userId,
      canManageStarInterviewAccess: access.isPrimaryAdmin,
    });
  } catch (error) {
    return NextResponse.json({ error: getServerError(error) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;

  try {
    const body = await request.json().catch(() => null);
    if (isStarInterviewAccessUpdate(body)) {
      if (!access.isPrimaryAdmin) {
        return NextResponse.json({ error: "只有主管理员可以调整 StarInterview 无限访问。" }, { status: 403 });
      }
      return await updateStarInterviewAccess(body.id, body.unlimitedAccess);
    }
    if (isConfirmEmailUpdate(body)) {
      return await confirmUserEmail(body.id);
    }

    const input = validateUpdate(body);
    if (input.id === access.userId && (input.disabled || input.role !== "admin")) {
      return NextResponse.json({ error: "不能停用或降级当前管理员账号。" }, { status: 400 });
    }

    const admin = createAdminClient();
    const [applicationCountResult, resumeCountResult, wechatIdentityResult] = await Promise.all([
      admin.from("user_applications").select("id", { count: "exact", head: true }).eq("user_id", input.id),
      admin.from("resumes").select("id", { count: "exact", head: true }).eq("user_id", input.id),
      admin.from("wechat_identities").select("id,user_id").eq("user_id", input.id).maybeSingle(),
    ]);
    if (applicationCountResult.error) throw applicationCountResult.error;
    if (resumeCountResult.error) throw resumeCountResult.error;
    if (wechatIdentityResult.error) throw wechatIdentityResult.error;

    const { data: previousAuth, error: previousAuthError } = await admin.auth.admin.getUserById(input.id);
    if (previousAuthError) throw previousAuthError;
    const wasDisabled = isFutureDate(previousAuth.user.banned_until);
    const previousProfile = await admin
      .from("profiles")
      .select("role")
      .eq("id", input.id)
      .maybeSingle();
    if (previousProfile.error) throw previousProfile.error;
    const preserveImplicitAccess = typeof previousAuth.user.app_metadata?.[STAR_INTERVIEW_ACCESS_KEY] !== "boolean"
      ? {
          app_metadata: {
            ...previousAuth.user.app_metadata,
            [STAR_INTERVIEW_ACCESS_KEY]: resolveStarInterviewAccess(
              previousAuth.user,
              previousProfile.data?.role ?? "user",
            ).unlimited,
          },
        }
      : {};
    const { data: authData, error: authError } = await admin.auth.admin.updateUserById(input.id, {
      ban_duration: input.disabled ? "876000h" : "none",
      ...preserveImplicitAccess,
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
        (wechatIdentityResult.data as AdminWechatIdentity | null) ?? undefined,
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

async function confirmUserEmail(id: string) {
  const admin = createAdminClient();
  const { data: previousAuth, error: previousAuthError } = await admin.auth.admin.getUserById(id);
  if (previousAuthError) throw previousAuthError;
  if (!previousAuth.user.email || isWechatInternalEmail(previousAuth.user.email)) {
    return NextResponse.json(
      { error: "微信技术账号没有可确认的真实邮箱。" },
      { status: 400 },
    );
  }

  const [{ data: profile, error: profileError }, applicationCountResult, resumeCountResult, wechatIdentityResult] = await Promise.all([
    admin.from("profiles").select("id,display_name,role,school,target_roles").eq("id", id).maybeSingle(),
    admin.from("user_applications").select("id", { count: "exact", head: true }).eq("user_id", id),
    admin.from("resumes").select("id", { count: "exact", head: true }).eq("user_id", id),
    admin.from("wechat_identities").select("id,user_id").eq("user_id", id).maybeSingle(),
  ]);
  if (profileError) throw profileError;
  if (applicationCountResult.error) throw applicationCountResult.error;
  if (resumeCountResult.error) throw resumeCountResult.error;
  if (wechatIdentityResult.error) throw wechatIdentityResult.error;

  let user = previousAuth.user;
  if (!user.email_confirmed_at) {
    const { data, error } = await admin.auth.admin.updateUserById(id, { email_confirm: true });
    if (error) throw error;
    user = data.user;
  }

  return NextResponse.json({
    user: toSummary(
      user,
      (profile as AdminProfile | null) ?? undefined,
      (wechatIdentityResult.data as AdminWechatIdentity | null) ?? undefined,
      applicationCountResult.count ?? 0,
      resumeCountResult.count ?? 0,
    ),
  });
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
    return {
      userId: user.id,
      isPrimaryAdmin: user.email?.trim().toLowerCase() === PRIMARY_ADMIN_EMAIL,
    };
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

function isConfirmEmailUpdate(value: unknown): value is { id: string; action: "confirm_email" } {
  if (!value || typeof value !== "object") return false;
  const input = value as Record<string, unknown>;
  return typeof input.id === "string" && Boolean(input.id) && input.action === "confirm_email";
}

function isStarInterviewAccessUpdate(value: unknown): value is {
  id: string;
  action: "star_interview_access";
  unlimitedAccess: boolean;
} {
  if (!value || typeof value !== "object") return false;
  const input = value as Record<string, unknown>;
  return typeof input.id === "string"
    && Boolean(input.id)
    && input.action === "star_interview_access"
    && typeof input.unlimitedAccess === "boolean";
}

async function updateStarInterviewAccess(id: string, unlimitedAccess: boolean) {
  const admin = createAdminClient();
  const { data: current, error: currentError } = await admin.auth.admin.getUserById(id);
  if (currentError || !current.user) throw currentError ?? new Error("目标用户不存在。");
  const { error } = await admin.auth.admin.updateUserById(id, {
    app_metadata: {
      ...current.user.app_metadata,
      [STAR_INTERVIEW_ACCESS_KEY]: unlimitedAccess,
    },
  });
  if (error) throw error;
  return NextResponse.json({
    id,
    starInterviewUnlimitedAccess: unlimitedAccess,
    starInterviewAccessSource: "explicit",
  });
}

function toSummary(
  user: User,
  profile: AdminProfile | undefined,
  wechatIdentity: AdminWechatIdentity | undefined,
  applicationCount: number,
  resumeCount: number,
): AdminUserSummary {
  const accountType = getAccountType(user.email, Boolean(wechatIdentity));
  const realEmail = user.email && !isWechatInternalEmail(user.email)
    ? user.email
    : null;
  const starInterviewAccess = resolveStarInterviewAccess(user, profile?.role ?? "user");
  return {
    id: user.id,
    email: realEmail ?? "微信用户",
    accountType,
    wechatIdentityId: wechatIdentity?.id ?? null,
    displayName: profile?.display_name ?? "秋招用户",
    role: profile?.role ?? "user",
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at ?? null,
    emailConfirmedAt: realEmail ? user.email_confirmed_at ?? null : null,
    bannedUntil: isFutureDate(user.banned_until) ? user.banned_until ?? null : null,
    applicationCount,
    resumeCount,
    school: profile?.school ?? null,
    targetRoles: profile?.target_roles ?? [],
    starInterviewUnlimitedAccess: starInterviewAccess.unlimited,
    starInterviewAccessSource: starInterviewAccess.source,
  };
}

function clampPage(value: string | null) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? Math.min(page, 1000) : 1;
}

function clampPageSize(value: string | null) {
  const pageSize = Number(value);
  return Number.isInteger(pageSize) && pageSize > 0
    ? Math.min(pageSize, MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;
}

function parseListFilters(searchParams: URLSearchParams) {
  const activity = searchParams.get("activity");
  const role = searchParams.get("role");
  const status = searchParams.get("status");
  const sort = searchParams.get("sort");
  return {
    page: clampPage(searchParams.get("page")),
    pageSize: clampPageSize(searchParams.get("pageSize")),
    query: (searchParams.get("query") ?? "").trim().slice(0, 120).toLocaleLowerCase("zh-CN"),
    activity: (["24h", "3d", "7d", "never"] as const).includes(activity as Exclude<AdminUserActivityFilter, "all">)
      ? activity as AdminUserActivityFilter
      : "all",
    role: role === "admin" || role === "user" ? role as AdminUserRoleFilter : "all",
    status: (["enabled", "disabled", "unconfirmed"] as const).includes(status as Exclude<AdminUserStatusFilter, "all">)
      ? status as AdminUserStatusFilter
      : "all",
    starInterviewAccess: searchParams.get("starInterviewAccess") === "unlimited"
      || searchParams.get("starInterviewAccess") === "standard"
      ? searchParams.get("starInterviewAccess") as AdminUserStarInterviewFilter
      : "all",
    sort: (["created_desc", "created_asc", "email_asc"] as const).includes(sort as Exclude<AdminUserSort, "activity_desc">)
      ? sort as AdminUserSort
      : "activity_desc",
  };
}

async function listAllAuthUsers(admin: SupabaseClient<Database>) {
  const users: User[] = [];
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: AUTH_PAGE_SIZE });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < AUTH_PAGE_SIZE) return users;
  }
  throw new Error("用户数量超过当前管理页的安全读取上限。");
}

async function fetchProfiles(admin: SupabaseClient<Database>, ids: string[]) {
  const profiles = new Map<string, AdminProfile>();
  for (let index = 0; index < ids.length; index += DATABASE_CHUNK_SIZE) {
    const chunk = ids.slice(index, index + DATABASE_CHUNK_SIZE);
    if (!chunk.length) continue;
    const { data, error } = await admin.from("profiles").select("id,display_name,role,school,target_roles").in("id", chunk);
    if (error) throw error;
    (data as AdminProfile[]).forEach((profile) => profiles.set(profile.id, profile));
  }
  return profiles;
}

async function fetchWechatIdentities(admin: SupabaseClient<Database>, ids: string[]) {
  const identities = new Map<string, AdminWechatIdentity>();
  for (let index = 0; index < ids.length; index += DATABASE_CHUNK_SIZE) {
    const chunk = ids.slice(index, index + DATABASE_CHUNK_SIZE);
    if (!chunk.length) continue;
    const { data, error } = await admin
      .from("wechat_identities")
      .select("id,user_id")
      .in("user_id", chunk);
    if (error) throw error;
    (data as AdminWechatIdentity[]).forEach((identity) => identities.set(identity.user_id, identity));
  }
  return identities;
}

async function fetchUsageCounts(
  admin: SupabaseClient<Database>,
  table: "user_applications" | "resumes",
  ids: string[],
) {
  if (!ids.length) return new Map<string, number>();
  const counts = new Map<string, number>();
  for (let offset = 0; offset < 100_000; offset += USAGE_PAGE_SIZE) {
    const { data, error } = await admin
      .from(table)
      .select("user_id")
      .in("user_id", ids)
      .order("id", { ascending: true })
      .range(offset, offset + USAGE_PAGE_SIZE - 1);
    if (error) throw error;
    for (const { user_id } of (data ?? []) as { user_id: string }[]) {
      counts.set(user_id, (counts.get(user_id) ?? 0) + 1);
    }
    if ((data?.length ?? 0) < USAGE_PAGE_SIZE) return counts;
  }
  throw new Error("用户使用记录超过当前管理页的安全读取上限。");
}

function buildMetrics(users: User[], profiles: Map<string, AdminProfile>): AdminUserMetrics {
  const now = Date.now();
  return users.reduce<AdminUserMetrics>((metrics, user) => {
    const lastSignIn = getTimestamp(user.last_sign_in_at);
    metrics.totalUsers += 1;
    if (lastSignIn >= now - 24 * HOUR_MS) metrics.active24h += 1;
    if (lastSignIn >= now - 3 * 24 * HOUR_MS) metrics.active3d += 1;
    if (!lastSignIn) metrics.neverSignedIn += 1;
    if (isFutureDate(user.banned_until)) metrics.disabledUsers += 1;
    if (resolveStarInterviewAccess(user, profiles.get(user.id)?.role ?? "user").unlimited) {
      metrics.starInterviewUnlimitedUsers += 1;
    }
    return metrics;
  }, {
    totalUsers: 0,
    active24h: 0,
    active3d: 0,
    neverSignedIn: 0,
    disabledUsers: 0,
    starInterviewUnlimitedUsers: 0,
  });
}

function matchesFilters(
  user: User,
  profile: AdminProfile | undefined,
  wechatIdentity: AdminWechatIdentity | undefined,
  filters: ReturnType<typeof parseListFilters>,
) {
  if (filters.query) {
    const haystack = [
      user.id,
      wechatIdentity?.id,
      user.email,
      profile?.display_name,
      profile?.school,
      ...(profile?.target_roles ?? []),
    ].filter(Boolean).join(" ").toLocaleLowerCase("zh-CN");
    if (!haystack.includes(filters.query)) return false;
  }

  if (filters.role !== "all" && (profile?.role ?? "user") !== filters.role) return false;
  const starInterviewAccess = resolveStarInterviewAccess(user, profile?.role ?? "user").unlimited;
  if (filters.starInterviewAccess === "unlimited" && !starInterviewAccess) return false;
  if (filters.starInterviewAccess === "standard" && starInterviewAccess) return false;

  const disabled = isFutureDate(user.banned_until);
  if (filters.status === "enabled" && disabled) return false;
  if (filters.status === "disabled" && !disabled) return false;
  const hasRealEmail = Boolean(user.email && !isWechatInternalEmail(user.email));
  if (filters.status === "unconfirmed" && (!hasRealEmail || user.email_confirmed_at)) return false;

  const lastSignIn = getTimestamp(user.last_sign_in_at);
  const now = Date.now();
  if (filters.activity === "never" && lastSignIn) return false;
  if (filters.activity === "24h" && lastSignIn < now - 24 * HOUR_MS) return false;
  if (filters.activity === "3d" && lastSignIn < now - 3 * 24 * HOUR_MS) return false;
  if (filters.activity === "7d" && lastSignIn < now - 7 * 24 * HOUR_MS) return false;
  return true;
}

function resolveStarInterviewAccess(user: User, role: ProfileRole) {
  const explicitValue = user.app_metadata?.[STAR_INTERVIEW_ACCESS_KEY];
  if (typeof explicitValue === "boolean") {
    return { unlimited: explicitValue, source: "explicit" as const };
  }
  if (role === "admin") {
    return { unlimited: true, source: "admin_default" as const };
  }
  return { unlimited: false, source: "default" as const };
}

function getUserComparator(sort: AdminUserSort) {
  return (left: User, right: User) => {
    if (sort === "created_desc") return getTimestamp(right.created_at) - getTimestamp(left.created_at);
    if (sort === "created_asc") return getTimestamp(left.created_at) - getTimestamp(right.created_at);
    if (sort === "email_asc") return (left.email ?? "").localeCompare(right.email ?? "", "zh-CN");
    return (getTimestamp(right.last_sign_in_at) || getTimestamp(right.created_at))
      - (getTimestamp(left.last_sign_in_at) || getTimestamp(left.created_at));
  };
}

function getTimestamp(value: string | undefined | null) {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function isFutureDate(value: string | undefined) {
  return Boolean(value && new Date(value).getTime() > Date.now());
}

function getServerError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (message.includes("SUPABASE_SERVICE_ROLE_KEY")) return message;
  return "管理员用户数据操作失败。当前账户设置未改变，请检查服务端配置后重试。";
}
