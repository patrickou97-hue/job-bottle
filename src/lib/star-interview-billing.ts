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

export async function adjustStarInterviewBalance(input: {
  userId: string;
  amountFen: number;
  entryType: "admin_grant" | "recharge" | "refund" | "correction";
  referenceKey: string;
  note: string;
  actorUserId: string | null;
}) {
  const { data, error } = await createAdminClient().rpc("adjust_star_interview_balance", {
    p_user_id: input.userId,
    p_amount_fen: Math.round(input.amountFen),
    p_entry_type: input.entryType,
    p_reference_key: input.referenceKey,
    p_note: input.note,
    p_actor_user_id: input.actorUserId,
  });
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
