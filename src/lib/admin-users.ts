import type { ProfileRole } from "@/lib/types";
import type { AccountType } from "@/lib/account-identity";

export type AdminUserSummary = {
  id: string;
  email: string;
  accountType: AccountType;
  wechatIdentityId: string | null;
  displayName: string;
  role: ProfileRole;
  createdAt: string;
  lastSignInAt: string | null;
  emailConfirmedAt: string | null;
  bannedUntil: string | null;
  applicationCount: number;
  resumeCount: number;
  school: string | null;
  targetRoles: string[];
  starInterviewUnlimitedAccess: boolean;
  starInterviewAccessSource: "explicit" | "admin_default" | "default";
};

export type AdminUserMetrics = {
  totalUsers: number;
  active24h: number;
  active3d: number;
  neverSignedIn: number;
  disabledUsers: number;
  starInterviewUnlimitedUsers: number;
};

export type AdminUserActivityFilter = "all" | "24h" | "3d" | "7d" | "never";
export type AdminUserRoleFilter = "all" | ProfileRole;
export type AdminUserStatusFilter = "all" | "enabled" | "disabled" | "unconfirmed";
export type AdminUserStarInterviewFilter = "all" | "unlimited" | "standard";
export type AdminUserSort = "activity_desc" | "created_desc" | "created_asc" | "email_asc";

export type AdminUsersResponse = {
  users: AdminUserSummary[];
  page: number;
  pageSize: number;
  totalFiltered: number;
  totalPages: number;
  metrics: AdminUserMetrics;
  currentUserId: string;
  canManageStarInterviewAccess: boolean;
};

export type AdminUserUpdate = {
  displayName: string;
  role: ProfileRole;
  disabled: boolean;
};

export type AdminUserMutationGuardSummary = {
  targetUserId: string;
  reservationToken: string;
  mutationKind: "profile_auth" | "star_interview_access";
  reservedAt: string;
  recoveryRequestedAt: string | null;
  recoveryReason: string | null;
  displayName: string | null;
  email: string | null;
};

export type AdminUserQuery = {
  page?: number;
  pageSize?: number;
  query?: string;
  activity?: AdminUserActivityFilter;
  role?: AdminUserRoleFilter;
  status?: AdminUserStatusFilter;
  starInterviewAccess?: AdminUserStarInterviewFilter;
  sort?: AdminUserSort;
};

export async function fetchAdminUsers(input: AdminUserQuery = {}) {
  const params = new URLSearchParams();
  params.set("page", String(input.page ?? 1));
  params.set("pageSize", String(input.pageSize ?? 25));
  if (input.query?.trim()) params.set("query", input.query.trim());
  if (input.activity && input.activity !== "all") params.set("activity", input.activity);
  if (input.role && input.role !== "all") params.set("role", input.role);
  if (input.status && input.status !== "all") params.set("status", input.status);
  if (input.starInterviewAccess && input.starInterviewAccess !== "all") {
    params.set("starInterviewAccess", input.starInterviewAccess);
  }
  if (input.sort && input.sort !== "activity_desc") params.set("sort", input.sort);

  const response = await fetch(`/api/admin/users?${params.toString()}`, { cache: "no-store" });
  const payload = await readJson(response);
  if (!response.ok) throw new Error(getErrorMessage(payload, "用户列表暂时无法读取，请稍后重试。"));
  return payload as AdminUsersResponse;
}

export async function fetchAdminUserMutationGuards() {
  const response = await fetch("/api/admin/users?view=recovery", { cache: "no-store" });
  const payload = await readJson(response);
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) {
    throw new Error(getErrorMessage(payload, "待恢复安全操作暂时无法读取，请稍后重试。"));
  }
  return payload as { guards: AdminUserMutationGuardSummary[] };
}

export async function recoverAdminUserMutation(
  guard: Pick<AdminUserMutationGuardSummary, "targetUserId" | "reservationToken">,
  reason: string,
) {
  const response = await fetch("/api/admin/users", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: guard.targetUserId,
      action: "recover_admin_mutation",
      reservationToken: guard.reservationToken,
      reason,
    }),
  });
  const payload = await readJson(response);
  if (response.ok) {
    return { action: "recovered" as const };
  }
  if (response.status === 409
    && isRecord(payload)
    && payload.action === "quiescing") {
    return {
      action: "quiescing" as const,
      retryAfterSeconds: typeof payload.retryAfterSeconds === "number"
        ? payload.retryAfterSeconds
        : Number(response.headers.get("Retry-After") ?? 300),
      message: getErrorMessage(payload, "安全恢复仍在静默期。"),
    };
  }
  throw new Error(getErrorMessage(payload, "账户安全恢复失败，请重新核对后再试。"));
}

export async function updateStarInterviewAccess(id: string, unlimitedAccess: boolean) {
  const response = await fetch("/api/admin/users", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, action: "star_interview_access", unlimitedAccess }),
  });
  const payload = await readJson(response);
  if (!response.ok) throw new Error(getErrorMessage(payload, "StarInterview 访问权限更新失败，原设置未改变。"));
  return payload as {
    id: string;
    starInterviewUnlimitedAccess: boolean;
    starInterviewAccessSource: "explicit";
  };
}

export async function updateAdminUser(id: string, input: AdminUserUpdate) {
  const response = await fetch("/api/admin/users", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ...input }),
  });
  const payload = await readJson(response);
  if (!response.ok) throw new Error(getErrorMessage(payload, "用户账户更新失败，原设置未改变。"));
  return payload as { user: AdminUserSummary };
}

export async function confirmAdminUserEmail(id: string) {
  const response = await fetch("/api/admin/users", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, action: "confirm_email" }),
  });
  const payload = await readJson(response);
  if (!response.ok) throw new Error(getErrorMessage(payload, "邮箱确认状态更新失败，原状态未改变。"));
  return payload as { user: AdminUserSummary };
}

async function readJson(response: Response) {
  return response.json().catch(() => ({})) as Promise<unknown>;
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
    return payload.error;
  }
  return fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
