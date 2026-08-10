import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { StarInterviewAccessMode, StarInterviewFeature } from "@/lib/star-interview-access";
import type { StarInterviewLedgerEntry } from "@/lib/types";

export const STAR_INTERVIEW_PRICING = {
  asrFenPerMinute: 40,
  completionFenPerAnswer: 80,
  targetInterviewFen: 2_000,
} as const;

export type StarInterviewWalletSnapshot = {
  balanceFen: number;
  totalGrantedFen: number;
  totalRechargedFen: number;
  totalSpentFen: number;
  nominalSpentFen: number;
  currency: "CNY";
  updatedAt: string;
};

export type StarInterviewChargeResult = {
  allowed: boolean;
  balanceFen: number;
  requiredFen: number;
  nominalChargeFen: number;
  actualChargeFen: number;
};

export type StarInterviewASRReservationAction =
  | "claimed"
  | "cached"
  | "in_progress"
  | "insufficient"
  | "confirmed"
  | "consumed"
  | "forbidden"
  | "completed"
  | "failed"
  | "stale";

export type StarInterviewASRReservation = StarInterviewChargeResult & {
  action: StarInterviewASRReservationAction;
  reservationToken?: string;
  leaseExpiresAt?: string;
  released?: boolean;
  responseBody?: string;
  consumed?: boolean;
  code?: string;
};

export type StarInterviewCompletionReservationAction =
  | "claimed"
  | "cached"
  | "in_progress"
  | "expired"
  | "expired_result"
  | "dispatching"
  | "dispatched"
  | "committed"
  | "consumed"
  | "failed"
  | "insufficient"
  | "conflict"
  | "missing"
  | "stale"
  | "completed";

export type StarInterviewCompletionReservation = StarInterviewChargeResult & {
  action: StarInterviewCompletionReservationAction;
  reservationToken?: string;
  leaseExpiresAt?: string;
  responseBody?: string;
  responseContentType?: string;
};

export async function getStarInterviewWallet(userId: string): Promise<StarInterviewWalletSnapshot> {
  const { data, error } = await createAdminClient().rpc("get_star_interview_wallet", {
    p_user_id: userId,
  });
  if (error) throw error;
  const value = asRecord(data);
  return {
    balanceFen: asInteger(value.balance_fen),
    totalGrantedFen: asInteger(value.total_granted_fen),
    totalRechargedFen: asInteger(value.total_recharged_fen),
    totalSpentFen: asInteger(value.total_spent_fen),
    nominalSpentFen: asInteger(value.nominal_spent_fen),
    currency: "CNY",
    updatedAt: typeof value.updated_at === "string" ? value.updated_at : new Date().toISOString(),
  };
}

export async function consumeStarInterviewUsage(input: {
  userId: string;
  feature: StarInterviewFeature;
  meterKey: string;
  units: number;
  mode: StarInterviewAccessMode;
}): Promise<StarInterviewChargeResult> {
  const { data, error } = await createAdminClient().rpc("consume_star_interview_usage", {
    p_user_id: input.userId,
    p_feature: input.feature,
    p_meter_key: input.meterKey,
    p_units: Math.max(1, Math.round(input.units)),
    p_unlimited: input.mode === "unlimited",
  });
  if (error) throw error;
  const value = asRecord(data);
  return {
    allowed: value.allowed === true,
    balanceFen: asInteger(value.balance_fen),
    requiredFen: asInteger(value.required_fen),
    nominalChargeFen: asInteger(value.nominal_charge_fen),
    actualChargeFen: asInteger(value.actual_charge_fen),
  };
}

export async function reserveStarInterviewASR(input: {
  userId: string;
  meterKey: string;
  units: number;
  mode: StarInterviewAccessMode;
}): Promise<StarInterviewASRReservation> {
  const { data, error } = await createAdminClient().rpc("reserve_star_interview_asr", {
    p_user_id: input.userId,
    p_meter_key: input.meterKey,
    p_units: Math.max(1, Math.round(input.units)),
    p_unlimited: input.mode === "unlimited",
  });
  if (error) throw error;
  return parseASRReservation(data);
}

export async function completeStarInterviewASR(input: {
  userId: string;
  meterKey: string;
  reservationToken: string;
  responseBody: string | null;
  consumed?: boolean;
}): Promise<StarInterviewASRReservation> {
  const { data, error } = await createAdminClient().rpc("complete_star_interview_asr", {
    p_user_id: input.userId,
    p_meter_key: input.meterKey,
    p_reservation_token: input.reservationToken,
    p_response_body: input.responseBody,
    p_consumed: input.consumed === true,
  });
  if (error) throw error;
  return parseASRReservation(data);
}

export async function confirmStarInterviewASRDispatch(input: {
  userId: string;
  meterKey: string;
  reservationToken: string;
}): Promise<StarInterviewASRReservation> {
  const { data, error } = await createAdminClient().rpc(
    "confirm_star_interview_asr_dispatch",
    {
      p_user_id: input.userId,
      p_meter_key: input.meterKey,
      p_reservation_token: input.reservationToken,
    },
  );
  if (error) throw error;
  return parseASRReservation(data);
}

export async function failStarInterviewASR(input: {
  userId: string;
  meterKey: string;
  reservationToken: string;
  reason: string;
}): Promise<StarInterviewASRReservation> {
  const { data, error } = await createAdminClient().rpc("fail_star_interview_asr", {
    p_user_id: input.userId,
    p_meter_key: input.meterKey,
    p_reservation_token: input.reservationToken,
    p_reason: input.reason.slice(0, 200),
  });
  if (error) throw error;
  return parseASRReservation(data);
}

export async function reserveStarInterviewCompletion(input: {
  userId: string;
  meterKey: string;
  requestHash: string;
  stream: boolean;
  mode: StarInterviewAccessMode;
}): Promise<StarInterviewCompletionReservation> {
  const { data, error } = await createAdminClient().rpc("reserve_star_interview_completion", {
    p_user_id: input.userId,
    p_meter_key: input.meterKey,
    p_request_hash: input.requestHash,
    p_stream: input.stream,
    p_unlimited: input.mode === "unlimited",
  });
  if (error) throw error;
  return parseCompletionReservation(data);
}

export async function getStarInterviewCompletion(input: {
  userId: string;
  meterKey: string;
  requestHash: string;
}): Promise<StarInterviewCompletionReservation> {
  const { data, error } = await createAdminClient().rpc("get_star_interview_completion", {
    p_user_id: input.userId,
    p_meter_key: input.meterKey,
    p_request_hash: input.requestHash,
  });
  if (error) throw error;
  return parseCompletionReservation(data);
}

export async function completeStarInterviewCompletion(input: {
  userId: string;
  meterKey: string;
  requestHash: string;
  reservationToken: string;
  responseBody: string;
  responseContentType: string;
}): Promise<StarInterviewCompletionReservation> {
  const { data, error } = await createAdminClient().rpc("complete_star_interview_completion", {
    p_user_id: input.userId,
    p_meter_key: input.meterKey,
    p_request_hash: input.requestHash,
    p_reservation_token: input.reservationToken,
    p_response_body: input.responseBody,
    p_response_content_type: input.responseContentType,
  });
  if (error) throw error;
  return parseCompletionReservation(data);
}

export async function commitStarInterviewCompletionStream(input: {
  userId: string;
  meterKey: string;
  requestHash: string;
  reservationToken: string;
}): Promise<StarInterviewCompletionReservation> {
  const { data, error } = await createAdminClient().rpc(
    "commit_star_interview_completion_stream",
    {
      p_user_id: input.userId,
      p_meter_key: input.meterKey,
      p_request_hash: input.requestHash,
      p_reservation_token: input.reservationToken,
    },
  );
  if (error) throw error;
  return parseCompletionReservation(data);
}

export async function markStarInterviewCompletionDispatched(input: {
  userId: string;
  meterKey: string;
  requestHash: string;
  reservationToken: string;
}): Promise<StarInterviewCompletionReservation> {
  const { data, error } = await createAdminClient().rpc(
    "mark_star_interview_completion_dispatched",
    {
      p_user_id: input.userId,
      p_meter_key: input.meterKey,
      p_request_hash: input.requestHash,
      p_reservation_token: input.reservationToken,
    },
  );
  if (error) throw error;
  return parseCompletionReservation(data);
}

export async function markStarInterviewCompletionDispatchIntent(input: {
  userId: string;
  meterKey: string;
  requestHash: string;
  reservationToken: string;
}): Promise<StarInterviewCompletionReservation> {
  const { data, error } = await createAdminClient().rpc(
    "mark_star_interview_completion_dispatch_intent",
    {
      p_user_id: input.userId,
      p_meter_key: input.meterKey,
      p_request_hash: input.requestHash,
      p_reservation_token: input.reservationToken,
    },
  );
  if (error) throw error;
  return parseCompletionReservation(data);
}

export async function failStarInterviewCompletion(input: {
  userId: string;
  meterKey: string;
  requestHash: string;
  reservationToken: string;
  reason: string;
  refund?: boolean;
}) {
  const { data, error } = await createAdminClient().rpc("fail_star_interview_completion", {
    p_user_id: input.userId,
    p_meter_key: input.meterKey,
    p_request_hash: input.requestHash,
    p_reservation_token: input.reservationToken,
    p_reason: input.reason.slice(0, 200),
    p_refund: input.refund !== false,
  });
  if (error) throw error;
  return parseCompletionReservation(data);
}

export async function adjustStarInterviewBalance(input: {
  userId: string;
  amountFen: number;
  entryType: "admin_grant" | "recharge" | "refund" | "correction";
  referenceKey: string;
  note: string;
  actorUserId: string | null;
}) {
  const admin = createAdminClient();
  const amountFen = Math.round(input.amountFen);
  let result;
  if (input.entryType === "admin_grant") {
    if (!input.actorUserId) {
      throw new Error("Administrator balance grants require an actor.");
    }
    result = await admin.rpc("adjust_star_interview_admin_grant", {
      p_user_id: input.userId,
      p_amount_fen: amountFen,
      p_reference_key: input.referenceKey,
      p_note: input.note,
      p_actor_user_id: input.actorUserId,
    });
  } else {
    result = await admin.rpc("adjust_star_interview_balance", {
      p_user_id: input.userId,
      p_amount_fen: amountFen,
      p_entry_type: input.entryType,
      p_reference_key: input.referenceKey,
      p_note: input.note,
      p_actor_user_id: input.actorUserId,
    });
  }
  const { data, error } = result;
  if (error) throw error;
  const value = asRecord(data);
  return {
    balanceFen: asInteger(value.balance_fen),
    duplicate: value.duplicate === true,
  };
}

export async function listStarInterviewLedger(userId: string, limit = 30) {
  const { data, error } = await createAdminClient()
    .from("star_interview_ledger")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 100));
  if (error) throw error;
  return (data ?? []) as StarInterviewLedgerEntry[];
}

export function starInterviewChargeHeaders(result: StarInterviewChargeResult) {
  return {
    "X-StarInterview-Balance-Fen": String(result.balanceFen),
    "X-StarInterview-Charge-Fen": String(result.actualChargeFen),
    "X-StarInterview-Nominal-Charge-Fen": String(result.nominalChargeFen),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asInteger(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

function parseCompletionReservation(value: unknown): StarInterviewCompletionReservation {
  const record = asRecord(value);
  const action = typeof record.action === "string" ? record.action : "";
  if (!isCompletionReservationAction(action)) {
    throw new Error("Invalid StarInterview completion reservation response");
  }
  return {
    action,
    allowed: action !== "insufficient" && action !== "conflict" && action !== "stale",
    balanceFen: asInteger(record.balance_fen),
    requiredFen: asInteger(record.required_fen),
    nominalChargeFen: asInteger(record.nominal_charge_fen),
    actualChargeFen: asInteger(record.actual_charge_fen),
    reservationToken: typeof record.reservation_token === "string"
      ? record.reservation_token
      : undefined,
    leaseExpiresAt: typeof record.lease_expires_at === "string"
      ? record.lease_expires_at
      : undefined,
    responseBody: typeof record.response_body === "string"
      ? record.response_body
      : undefined,
    responseContentType: typeof record.response_content_type === "string"
      ? record.response_content_type
      : undefined,
  };
}

function parseASRReservation(value: unknown): StarInterviewASRReservation {
  const record = asRecord(value);
  const action = typeof record.action === "string" ? record.action : "";
  if (!isASRReservationAction(action)) {
    throw new Error("Invalid StarInterview ASR reservation response");
  }
  return {
    action,
    allowed: record.allowed === true,
    balanceFen: asInteger(record.balance_fen),
    requiredFen: asInteger(record.required_fen),
    nominalChargeFen: asInteger(record.nominal_charge_fen),
    actualChargeFen: asInteger(record.actual_charge_fen),
    reservationToken: typeof record.reservation_token === "string"
      ? record.reservation_token
      : undefined,
    leaseExpiresAt: typeof record.lease_expires_at === "string"
      ? record.lease_expires_at
      : undefined,
    released: typeof record.released === "boolean" ? record.released : undefined,
    responseBody: typeof record.response_body === "string" ? record.response_body : undefined,
    consumed: typeof record.consumed === "boolean" ? record.consumed : undefined,
    code: typeof record.code === "string" ? record.code : undefined,
  };
}

function isASRReservationAction(value: string): value is StarInterviewASRReservationAction {
  return [
    "claimed",
    "cached",
    "in_progress",
    "insufficient",
    "confirmed",
    "consumed",
    "forbidden",
    "completed",
    "failed",
    "stale",
  ].includes(value);
}

function isCompletionReservationAction(
  value: string,
): value is StarInterviewCompletionReservationAction {
  return [
    "claimed",
    "cached",
    "in_progress",
    "expired",
    "expired_result",
    "dispatching",
    "dispatched",
    "committed",
    "consumed",
    "failed",
    "insufficient",
    "conflict",
    "missing",
    "stale",
    "completed",
  ].includes(value);
}
