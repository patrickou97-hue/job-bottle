export const PRIMARY_ADMIN_EMAIL = "raywang6688@outlook.com";

type AdminUserRole = "user" | "admin";

export type AdminUserMutationPolicyInput = {
  actorUserId: string;
  actorIsPrimaryAdmin: boolean;
  targetUserId: string;
  targetEmail?: string | null;
  currentRole: AdminUserRole;
  nextRole: AdminUserRole;
  nextDisabled: boolean;
};

export type AdminUserMutationPolicyResult =
  | { allowed: true }
  | { allowed: false; status: 400 | 403; error: string; code: string };

export function isPrimaryAdminEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() === PRIMARY_ADMIN_EMAIL;
}

export function checkAdminUserMutationPolicy(
  input: AdminUserMutationPolicyInput,
): AdminUserMutationPolicyResult {
  if (
    input.actorUserId === input.targetUserId
    && (input.nextDisabled || input.nextRole !== "admin")
  ) {
    return {
      allowed: false,
      status: 400,
      error: "不能停用或降级当前管理员账号。",
      code: "ADMIN_SELF_PROTECTED",
    };
  }

  if (
    isPrimaryAdminEmail(input.targetEmail)
    && (input.nextDisabled || input.nextRole !== "admin")
  ) {
    return {
      allowed: false,
      status: 403,
      error: "主管理员账号不能被停用或降级。",
      code: "PRIMARY_ADMIN_PROTECTED",
    };
  }

  const changesAdminRole = input.currentRole !== input.nextRole
    && (input.currentRole === "admin" || input.nextRole === "admin");
  const disablesAdmin = input.currentRole === "admin" && input.nextDisabled;
  if (!input.actorIsPrimaryAdmin && (changesAdminRole || disablesAdmin)) {
    return {
      allowed: false,
      status: 403,
      error: "只有主管理员可以调整管理员角色或停用管理员账号。",
      code: "PRIMARY_ADMIN_REQUIRED",
    };
  }

  return { allowed: true };
}
