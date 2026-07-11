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

export type AdminUsersResponse = {
  users: AdminUserSummary[];
  page: number;
  hasMore: boolean;
  currentUserId: string;
};

export type AdminUserUpdate = {
  displayName: string;
  role: ProfileRole;
  disabled: boolean;
};

export async function fetchAdminUsers(page = 1) {
  const response = await fetch(`/api/admin/users?page=${page}`, { cache: "no-store" });
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

async function readJson(response: Response) {
  return response.json().catch(() => ({})) as Promise<unknown>;
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
    return payload.error;
  }
  return fallback;
}
