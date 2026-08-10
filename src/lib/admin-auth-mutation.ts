export const STAR_INTERVIEW_ACCESS_KEY = "star_interview_unlimited_access";

export type GuardedAuthPlan = {
  currentDisabled: boolean;
  previousBannedUntil: string | null;
  previousAccessKeyPresent: boolean;
  previousAccessValue: unknown;
  nextDisabled: boolean;
  mutateAccessKey: boolean;
  nextAccessValue: boolean;
};

export type GuardedAuthSnapshot = {
  banned_until?: string | null;
  app_metadata?: Record<string, unknown> | null;
};

export type GuardedAuthPatch = {
  ban_duration?: string;
  app_metadata?: Record<string, unknown>;
};

export function buildGuardedAuthPatch(plan: GuardedAuthPlan): GuardedAuthPatch {
  const patch: GuardedAuthPatch = {};
  if (plan.currentDisabled !== plan.nextDisabled) {
    patch.ban_duration = plan.nextDisabled ? "876000h" : "none";
  }
  if (plan.mutateAccessKey) {
    patch.app_metadata = { [STAR_INTERVIEW_ACCESS_KEY]: plan.nextAccessValue };
  }
  return patch;
}

/**
 * Roll back only the Auth fields owned by this workflow. A missing legacy key
 * is represented explicitly as null so GoTrue removes/neutralizes that key;
 * unrelated app_metadata is never copied from a stale snapshot.
 */
export function buildGuardedAuthRollbackPatch(plan: GuardedAuthPlan): GuardedAuthPatch {
  const patch: GuardedAuthPatch = {};
  if (plan.currentDisabled !== plan.nextDisabled) {
    patch.ban_duration = plan.currentDisabled ? "876000h" : "none";
  }
  if (plan.mutateAccessKey) {
    patch.app_metadata = {
      [STAR_INTERVIEW_ACCESS_KEY]: plan.previousAccessKeyPresent
        ? plan.previousAccessValue
        : null,
    };
  }
  return patch;
}

export function classifyGuardedAuthState(
  plan: GuardedAuthPlan,
  user: GuardedAuthSnapshot,
): "target" | "original" | "ambiguous" {
  const disabled = isFutureDate(user.banned_until);
  const banChanged = plan.currentDisabled !== plan.nextDisabled;
  const targetBanMatches = banChanged
    ? disabled === plan.nextDisabled
    : sameTimestamp(user.banned_until, plan.previousBannedUntil);
  const metadata = user.app_metadata ?? {};
  const targetMetadataMatches = plan.mutateAccessKey
    ? Object.prototype.hasOwnProperty.call(metadata, STAR_INTERVIEW_ACCESS_KEY)
      && metadata[STAR_INTERVIEW_ACCESS_KEY] === plan.nextAccessValue
    : originalMetadataMatches(plan, metadata);

  if (targetBanMatches && targetMetadataMatches) return "target";
  if (guardedAuthMatchesOriginal(plan, user)) {
    return "original";
  }
  return "ambiguous";
}

export function guardedAuthMatchesOriginal(
  plan: GuardedAuthPlan,
  user: GuardedAuthSnapshot,
) {
  return sameTimestamp(user.banned_until, plan.previousBannedUntil)
    && originalMetadataMatches(plan, user.app_metadata ?? {});
}

export function isEmptyGuardedAuthPatch(patch: GuardedAuthPatch) {
  return patch.ban_duration === undefined && patch.app_metadata === undefined;
}

function originalMetadataMatches(
  plan: GuardedAuthPlan,
  metadata: Record<string, unknown>,
) {
  const present = Object.prototype.hasOwnProperty.call(metadata, STAR_INTERVIEW_ACCESS_KEY);
  if (!plan.previousAccessKeyPresent) {
    return !present || metadata[STAR_INTERVIEW_ACCESS_KEY] === null;
  }
  return present && jsonEqual(
    metadata[STAR_INTERVIEW_ACCESS_KEY],
    plan.previousAccessValue,
  );
}

function jsonEqual(left: unknown, right: unknown) {
  if (Object.is(left, right)) return true;
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}

function isFutureDate(value: string | null | undefined) {
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && timestamp > Date.now();
}

function sameTimestamp(
  left: string | null | undefined,
  right: string | null | undefined,
) {
  if (!left || !right) return !left && !right;
  const leftTimestamp = new Date(left).getTime();
  const rightTimestamp = new Date(right).getTime();
  return Number.isFinite(leftTimestamp)
    && Number.isFinite(rightTimestamp)
    && leftTimestamp === rightTimestamp;
}
