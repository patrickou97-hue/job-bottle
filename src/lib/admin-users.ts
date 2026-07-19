import type { ProfileRole } from "@/lib/types";

export type AdminUserSummary = {
  id: string;
  email: string;
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
};

export type AdminUserMetrics = {
  totalUsers: number;
  active24h: number;
  active3d: number;
  neverSignedIn: number;
  disabledUsers: number;
};

export type AdminUserActivityFilter = "all" | "24h" | "3d" | "7d" | "never";
export type AdminUserRoleFilter = "all" | ProfileRole;
export type AdminUserStatusFilter = "all" | "enabled" | "disabled" | "unconfirmed";
export type AdminUserSort = "activity_desc" | "created_desc" | "created_asc" | "email_asc";

export type AdminUsersResponse = {
  users: AdminUserSummary[];
  page: number;
  pageSize: number;
  totalFiltered: number;
  totalPages: number;
  metrics: AdminUserMetrics;
  currentUserId: string;
};

export type AdminUserUpdate = {
  displayName: string;
  role: ProfileRole;
  disabled: boolean;
};

export type AdminUserQuery = {
  page?: number;
  pageSize?: number;
  query?: string;
  activity?: AdminUserActivityFilter;
  role?: AdminUserRoleFilter;
  status?: AdminUserStatusFilter;
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
  if (input.sort && input.sort !== "activity_desc") params.set("sort", input.sort);

  const response = await fetch(`/api/admin/users?${params.toString()}`, { cache: "no-store" });
  const payload = await readJson(response);
  if (!response.ok) throw new Error(getErrorMessage(payload, "用户列表读取失败，请稍后重试。"));
  return payload as AdminUsersResponse;
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
