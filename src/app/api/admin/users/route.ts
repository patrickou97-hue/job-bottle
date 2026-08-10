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
import {
  checkAdminUserMutationPolicy,
} from "@/lib/admin-user-policy";
import {
  cancelAdminUserMutation,
  finalizeAdminUserMutation,
  recoverAdminUserMutation,
  reserveAdminUserMutation,
  type AdminUserMutationGuardResult,
} from "@/lib/admin-user-mutation-guard";
import {
  buildGuardedAuthPatch,
  buildGuardedAuthRollbackPatch,
  classifyGuardedAuthState,
  guardedAuthMatchesOriginal,
  isEmptyGuardedAuthPatch,
  STAR_INTERVIEW_ACCESS_KEY,
  type GuardedAuthPlan,
} from "@/lib/admin-auth-mutation";
import {
  requireAdminAccess,
  requirePrimaryAdminRecoveryAccess,
} from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Profile, ProfileRole } from "@/lib/types";

const AUTH_PAGE_SIZE = 1000;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const DATABASE_CHUNK_SIZE = 500;
const USAGE_PAGE_SIZE = 1000;
const HOUR_MS = 60 * 60 * 1000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// The recovery RPC enforces a five-minute quiescence window before it may
// restore and release a guard. Keeping this route's hard lifetime below that
// window fences any pre-recovery GoTrue request from a later generation.
export const maxDuration = 60;

type AdminProfile = Pick<Profile, "id" | "display_name" | "role" | "school" | "target_roles">;
type AdminWechatIdentity = { id: string; user_id: string };

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("view") === "recovery") {
    return listAdminMutationGuards();
  }
  const access = await requireAdminAccess();
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

async function listAdminMutationGuards() {
  const recoveryAccess = await requirePrimaryAdminRecoveryAccess();
  if ("response" in recoveryAccess) return recoveryAccess.response;

  try {
    const admin = createAdminClient();
    const { data: guards, error: guardError } = await admin
      .from("admin_user_mutation_guards")
      .select("target_user_id,reservation_token,mutation_kind,reserved_at,recovery_requested_at,recovery_reason")
      .order("reserved_at", { ascending: true })
      .limit(100);
    if (guardError) throw guardError;
    const targetIds = (guards ?? []).map((guard) => guard.target_user_id);
    const profiles = targetIds.length
      ? await admin.from("profiles").select("id,display_name").in("id", targetIds)
      : { data: [], error: null };
    if (profiles.error) throw profiles.error;
    const displayNames = new Map(
      (profiles.data ?? []).map((profile) => [profile.id, profile.display_name]),
    );
    const authUsers = await Promise.all(targetIds.map(async (targetUserId) => {
      const { data, error } = await admin.auth.admin.getUserById(targetUserId);
      return [targetUserId, error ? null : data.user] as const;
    }));
    const authById = new Map(authUsers);

    return NextResponse.json(
      {
        guards: (guards ?? []).map((guard) => ({
          targetUserId: guard.target_user_id,
          reservationToken: guard.reservation_token,
          mutationKind: guard.mutation_kind,
          reservedAt: guard.reserved_at,
          recoveryRequestedAt: guard.recovery_requested_at,
          recoveryReason: guard.recovery_reason,
          displayName: displayNames.get(guard.target_user_id) ?? null,
          email: authById.get(guard.target_user_id)?.email ?? null,
        })),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: getServerError(error) },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (isAdminMutationRecovery(body)) {
      const recoveryAccess = await requirePrimaryAdminRecoveryAccess();
      if ("response" in recoveryAccess) return recoveryAccess.response;
      const recovered = await recoverAdminUserMutation(createAdminClient(), {
        primaryUserId: recoveryAccess.userId,
        targetUserId: body.id,
        reservationToken: body.reservationToken,
        reason: body.reason,
      });
      if (recovered.action !== "recovered") return adminMutationGuardResponse(recovered);
      return NextResponse.json({
        recovered: true,
        id: body.id,
        role: recovered.role,
        displayName: recovered.displayName,
      });
    }

    const access = await requireAdminAccess();
    if ("response" in access) return access.response;
    if (isStarInterviewAccessUpdate(body)) {
      if (!access.isPrimaryAdmin) {
        return NextResponse.json({ error: "只有主管理员可以调整 StarInterview 无限访问。" }, { status: 403 });
      }
      return await updateStarInterviewAccess(
        access.userId,
        body.id,
        body.unlimitedAccess,
      );
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
    const previousProfile = await admin
      .from("profiles")
      .select("id,display_name,role,school,target_roles")
      .eq("id", input.id)
      .maybeSingle();
    if (previousProfile.error) throw previousProfile.error;
    const mutationPolicy = checkAdminUserMutationPolicy({
      actorUserId: access.userId,
      actorIsPrimaryAdmin: access.isPrimaryAdmin,
      targetUserId: input.id,
      targetEmail: previousAuth.user.email,
      currentRole: previousProfile.data?.role ?? "user",
      nextRole: input.role,
      nextDisabled: input.disabled,
    });
    if (!mutationPolicy.allowed) {
      return NextResponse.json(
        { error: mutationPolicy.error, code: mutationPolicy.code },
        { status: mutationPolicy.status },
      );
    }

    // The Auth ban and profiles role live behind different APIs. Reserve the
    // target before touching Auth, then atomically revalidate and apply the
    // profile mutation. Every failure either restores Auth before releasing the
    // guard or leaves the target fail-closed for explicit recovery.
    const reservation = await reserveAdminUserMutation(admin, {
      actorUserId: access.userId,
      targetUserId: input.id,
      mutationKind: "profile_auth",
      nextRole: input.role,
      nextDisabled: input.disabled,
    });
    if (reservation.action !== "claimed"
      || !reservation.reservationToken
      || !reservation.currentRole
      || !reservation.nextRole) {
      return adminMutationGuardResponse(reservation);
    }

    const guard = {
      reservationToken: reservation.reservationToken,
      actorUserId: access.userId,
      targetUserId: input.id,
    };
    const authPlan = guardAuthPlan(reservation);
    const authUser = await applyGuardedAuthTarget(admin, guard, authPlan);
    const finalized = await finalizeAdminUserMutation(admin, {
      ...guard,
      displayName: input.displayName || "秋招用户",
    });
    if (finalized.action !== "applied") {
      const safelyRolledBack = await rollbackGuardedAuthAndCancel(
        admin,
        guard,
        authPlan,
      );
      if (!safelyRolledBack) {
        throw new Error("管理员账户变更状态无法证明，目标账户已保持锁定，需由主管理员恢复。");
      }
      return adminMutationGuardResponse(finalized);
    }

    // `applied` means the database transaction has already committed and the
    // guard has been released. A malformed/lost payload must never make us
    // "roll back" Auth after that commit, because doing so could leave the
    // profile and Auth halves disagreeing without a guard. Re-read the durable
    // profile instead; if even that cannot be proven, fail the response and
    // let the operator refresh rather than starting a compensating write.
    let appliedRole = finalized.role;
    let appliedDisplayName = finalized.displayName;
    if (!appliedRole || appliedDisplayName === undefined) {
      const { data: appliedProfile, error: appliedProfileError } = await admin
        .from("profiles")
        .select("role,display_name")
        .eq("id", input.id)
        .maybeSingle();
      if (appliedProfileError
        || !appliedProfile
        || (appliedProfile.role !== "user" && appliedProfile.role !== "admin")) {
        throw new Error("管理员账户变更已经提交，但结果回读失败；请刷新列表确认最新状态。");
      }
      appliedRole = appliedProfile.role;
      appliedDisplayName = appliedProfile.display_name ?? "秋招用户";
    }

    const profile: AdminProfile = {
      id: input.id,
      display_name: appliedDisplayName,
      role: appliedRole,
      school: previousProfile.data?.school ?? null,
      target_roles: previousProfile.data?.target_roles ?? [],
    };
    return NextResponse.json({
      user: toSummary(
        authUser,
        profile,
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

function adminMutationGuardResponse(result: AdminUserMutationGuardResult) {
  const status = result.action === "missing"
    ? 404
    : ["busy", "conflict", "stale", "quiescing"].includes(result.action)
      ? 409
      : result.code === "ADMIN_SELF_PROTECTED" ? 400 : 403;
  const retryAfter = result.action === "quiescing"
    ? Math.max(1, result.retryAfterSeconds ?? 300)
    : result.action === "busy" ? 3 : undefined;
  return NextResponse.json(
    {
      error: result.error || "账户管理操作未能安全完成，请刷新后重试。",
      code: result.code || "ADMIN_MUTATION_REJECTED",
      action: result.action,
      retryAfterSeconds: retryAfter,
    },
    {
      status,
      headers: retryAfter ? { "Retry-After": String(retryAfter) } : undefined,
    },
  );
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

function isAdminMutationRecovery(value: unknown): value is {
  id: string;
  action: "recover_admin_mutation";
  reservationToken: string;
  reason: string;
} {
  if (!value || typeof value !== "object") return false;
  const input = value as Record<string, unknown>;
  return typeof input.id === "string"
    && UUID_PATTERN.test(input.id)
    && input.action === "recover_admin_mutation"
    && typeof input.reservationToken === "string"
    && UUID_PATTERN.test(input.reservationToken)
    && typeof input.reason === "string"
    && input.reason.trim().length >= 2
    && input.reason.trim().length <= 200;
}

async function updateStarInterviewAccess(
  actorUserId: string,
  id: string,
  unlimitedAccess: boolean,
) {
  const admin = createAdminClient();
  const reservation = await reserveAdminUserMutation(admin, {
    actorUserId,
    targetUserId: id,
    mutationKind: "star_interview_access",
    nextStarInterviewAccess: unlimitedAccess,
  });
  if (reservation.action !== "claimed" || !reservation.reservationToken) {
    return adminMutationGuardResponse(reservation);
  }
  const guard = {
    reservationToken: reservation.reservationToken,
    actorUserId,
    targetUserId: id,
  };
  const authPlan = guardAuthPlan(reservation);
  await applyGuardedAuthTarget(admin, guard, authPlan);
  const finalized = await finalizeAdminUserMutation(admin, {
    ...guard,
    displayName: "",
  });
  if (finalized.action !== "applied") {
    const safelyRolledBack = await rollbackGuardedAuthAndCancel(admin, guard, authPlan);
    if (!safelyRolledBack) {
      throw new Error("StarInterview 访问权限状态无法证明，目标账户已保持锁定，需由主管理员恢复。");
    }
    return adminMutationGuardResponse(finalized);
  }
  return NextResponse.json({
    id,
    starInterviewUnlimitedAccess: unlimitedAccess,
    starInterviewAccessSource: "explicit",
  });
}

type GuardIdentity = {
  reservationToken: string;
  actorUserId: string;
  targetUserId: string;
};

function guardAuthPlan(reservation: AdminUserMutationGuardResult): GuardedAuthPlan {
  if (reservation.currentDisabled === undefined
    || reservation.previousAccessKeyPresent === undefined
    || reservation.nextDisabled === undefined
    || reservation.mutateAccessKey === undefined
    || reservation.nextAccessValue === undefined) {
    throw new Error("管理员安全预留未返回完整 Auth 快照，目标账户已保持锁定。");
  }
  return {
    currentDisabled: reservation.currentDisabled,
    previousBannedUntil: reservation.previousBannedUntil,
    previousAccessKeyPresent: reservation.previousAccessKeyPresent,
    previousAccessValue: reservation.previousAccessValue,
    nextDisabled: reservation.nextDisabled,
    mutateAccessKey: reservation.mutateAccessKey,
    nextAccessValue: reservation.nextAccessValue,
  };
}

async function applyGuardedAuthTarget(
  admin: SupabaseClient<Database>,
  guard: GuardIdentity,
  plan: GuardedAuthPlan,
) {
  const patch = buildGuardedAuthPatch(plan);
  let mutationError: unknown = null;
  let mutationAttempted = false;
  if (!isEmptyGuardedAuthPatch(patch)) {
    mutationAttempted = true;
    try {
      const result = await admin.auth.admin.updateUserById(guard.targetUserId, patch);
      mutationError = result.error;
    } catch (error) {
      mutationError = error;
    }
  }

  const { data: observed, error: observedError } = await admin.auth.admin
    .getUserById(guard.targetUserId);
  if (observedError || !observed.user) {
    throw new Error("Auth 变更结果无法回读，目标账户已保持锁定，需由主管理员恢复。", {
      cause: observedError ?? mutationError,
    });
  }
  const state = classifyGuardedAuthState(plan, observed.user);
  if (state === "target") return observed.user;
  if (state === "original") {
    if (mutationAttempted) {
      throw new Error(
        mutationError
          ? "Auth 请求结果仍可能异步生效，目标账户已保持锁定，需由主管理员恢复。"
          : "Auth 请求已发出但未达到目标状态，目标账户已保持锁定，需由主管理员恢复。",
        { cause: mutationError },
      );
    }
    const cancelled = await cancelAdminUserMutation(admin, guard);
    if (!cancelled) {
      throw new Error("Auth 虽仍为原状态，但安全锁无法证明可释放，目标账户已保持锁定。");
    }
    throw new Error("Auth 变更未生效，已确认原状态并安全取消本次操作。", {
      cause: mutationError,
    });
  }
  throw new Error("Auth 变更结果既非原状态也非目标状态，目标账户已保持锁定，需由主管理员恢复。", {
    cause: mutationError,
  });
}

async function rollbackGuardedAuthAndCancel(
  admin: SupabaseClient<Database>,
  guard: GuardIdentity,
  plan: GuardedAuthPlan,
) {
  const rollbackPatch = buildGuardedAuthRollbackPatch(plan);
  if (!isEmptyGuardedAuthPatch(rollbackPatch)) {
    try {
      await admin.auth.admin.updateUserById(guard.targetUserId, rollbackPatch);
    } catch {
      // The result is uncertain until the authoritative read below.
    }
  }
  const { data: observed, error } = await admin.auth.admin.getUserById(guard.targetUserId);
  if (error || !observed.user || !guardedAuthMatchesOriginal(plan, observed.user)) {
    return false;
  }
  return cancelAdminUserMutation(admin, guard);
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
