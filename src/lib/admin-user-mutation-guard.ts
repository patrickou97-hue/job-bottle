import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ProfileRole } from "@/lib/types";

type AdminClient = SupabaseClient<Database>;

export type AdminUserMutationGuardResult = {
  action:
    | "claimed"
    | "busy"
    | "forbidden"
    | "conflict"
    | "stale"
    | "applied"
    | "missing"
    | "quiescing"
    | "recovered";
  code?: string;
  error?: string;
  reservationToken?: string;
  mutationKind?: "profile_auth" | "star_interview_access";
  currentRole?: ProfileRole;
  currentDisabled?: boolean;
  previousBannedUntil: string | null;
  previousAccessKeyPresent?: boolean;
  previousAccessValue?: unknown;
  nextRole?: ProfileRole;
  nextDisabled?: boolean;
  mutateAccessKey?: boolean;
  nextAccessValue?: boolean;
  role?: ProfileRole;
  displayName?: string;
  retryAfterSeconds?: number;
};

export async function reserveAdminUserMutation(
  admin: AdminClient,
  input: {
    actorUserId: string;
    targetUserId: string;
    mutationKind: "profile_auth" | "star_interview_access";
    nextRole?: ProfileRole | null;
    nextDisabled?: boolean | null;
    nextStarInterviewAccess?: boolean | null;
  },
) {
  const { data, error } = await admin.rpc("reserve_admin_user_mutation", {
    p_actor_user_id: input.actorUserId,
    p_target_user_id: input.targetUserId,
    p_mutation_kind: input.mutationKind,
    p_next_role: input.nextRole ?? null,
    p_next_disabled: input.nextDisabled ?? null,
    p_next_star_interview_access: input.nextStarInterviewAccess ?? null,
  });
  if (error) throw error;
  return parseGuardResult(data);
}

export async function finalizeAdminUserMutation(
  admin: AdminClient,
  input: {
    reservationToken: string;
    actorUserId: string;
    targetUserId: string;
    displayName: string;
  },
) {
  const { data, error } = await admin.rpc("finalize_admin_user_mutation", {
    p_reservation_token: input.reservationToken,
    p_actor_user_id: input.actorUserId,
    p_target_user_id: input.targetUserId,
    p_display_name: input.displayName,
  });
  if (error) throw error;
  return parseGuardResult(data);
}

export async function cancelAdminUserMutation(
  admin: AdminClient,
  input: {
    reservationToken: string;
    actorUserId: string;
    targetUserId: string;
  },
) {
  const { data, error } = await admin.rpc("cancel_admin_user_mutation", {
    p_reservation_token: input.reservationToken,
    p_actor_user_id: input.actorUserId,
    p_target_user_id: input.targetUserId,
  });
  if (error) throw error;
  return data === true;
}

export async function recoverAdminUserMutation(
  admin: AdminClient,
  input: {
    primaryUserId: string;
    targetUserId: string;
    reservationToken: string;
    reason: string;
  },
) {
  const { data, error } = await admin.rpc("recover_admin_user_mutation", {
    p_primary_user_id: input.primaryUserId,
    p_target_user_id: input.targetUserId,
    p_reservation_token: input.reservationToken,
    p_reason: input.reason,
  });
  if (error) throw error;
  return parseGuardResult(data);
}

function parseGuardResult(value: unknown): AdminUserMutationGuardResult {
  const record = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const action = record.action;
  if (![
    "claimed",
    "busy",
    "forbidden",
    "conflict",
    "stale",
    "applied",
    "missing",
    "quiescing",
    "recovered",
  ].includes(String(action))) {
    throw new Error("Invalid admin user mutation guard response");
  }
  return {
    action: action as AdminUserMutationGuardResult["action"],
    code: typeof record.code === "string" ? record.code : undefined,
    error: typeof record.error === "string" ? record.error : undefined,
    reservationToken: typeof record.reservation_token === "string"
      ? record.reservation_token
      : undefined,
    mutationKind: isMutationKind(record.mutation_kind) ? record.mutation_kind : undefined,
    currentRole: isProfileRole(record.current_role) ? record.current_role : undefined,
    currentDisabled: typeof record.current_disabled === "boolean"
      ? record.current_disabled
      : undefined,
    previousBannedUntil: typeof record.previous_banned_until === "string"
      ? record.previous_banned_until
      : null,
    previousAccessKeyPresent: typeof record.previous_access_key_present === "boolean"
      ? record.previous_access_key_present
      : undefined,
    previousAccessValue: record.previous_access_value,
    nextRole: isProfileRole(record.next_role) ? record.next_role : undefined,
    nextDisabled: typeof record.next_disabled === "boolean" ? record.next_disabled : undefined,
    mutateAccessKey: typeof record.mutate_access_key === "boolean"
      ? record.mutate_access_key
      : undefined,
    nextAccessValue: typeof record.next_access_value === "boolean"
      ? record.next_access_value
      : undefined,
    role: isProfileRole(record.role) ? record.role : undefined,
    displayName: typeof record.display_name === "string" ? record.display_name : undefined,
    retryAfterSeconds: typeof record.retry_after_seconds === "number"
      && Number.isInteger(record.retry_after_seconds)
      && record.retry_after_seconds >= 0
      ? record.retry_after_seconds
      : undefined,
  };
}

function isMutationKind(value: unknown): value is "profile_auth" | "star_interview_access" {
  return value === "profile_auth" || value === "star_interview_access";
}

function isProfileRole(value: unknown): value is ProfileRole {
  return value === "user" || value === "admin";
}
