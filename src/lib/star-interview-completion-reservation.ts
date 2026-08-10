export type CompletionReservationAction =
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

export type CompletionReservationState = {
  action: CompletionReservationAction;
};

export type CompletionDispatchIntentAction =
  | "dispatching"
  | "blocked"
  | "conflict"
  | "consumed"
  | "stale";

export type CompletionDispatchIntentState = {
  action: CompletionDispatchIntentAction;
};

export class CompletionDispatchBlockedError extends Error {
  constructor() {
    super("Completion authorization changed before dispatch");
    this.name = "CompletionDispatchBlockedError";
  }
}

export function parseCompletionDispatchIntent(value: unknown): CompletionDispatchIntentState {
  const record = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const action = record.action;
  if (action !== "dispatching"
    && action !== "blocked"
    && action !== "conflict"
    && action !== "consumed"
    && action !== "stale") {
    throw new Error("Invalid StarInterview completion dispatch intent response");
  }
  return { action };
}

export function assertCompletionDispatchAllowed(state: CompletionDispatchIntentState) {
  if (state.action === "dispatching") return;
  if (state.action === "blocked") throw new CompletionDispatchBlockedError();
  throw new Error(`Completion dispatch intent rejected: ${state.action}`);
}

/**
 * Join an existing durable request or atomically claim a failed/expired one.
 *
 * The route calls upstream only for the `claimed` result. Concurrent callers
 * poll the database row and reuse `cached`; they never create a second model
 * request while a valid lease exists.
 */
export async function acquireCompletionReservation<T extends CompletionReservationState>(input: {
  reserve: () => Promise<T>;
  inspect: () => Promise<T>;
  signal?: AbortSignal;
  maxWaitMs?: number;
  pollIntervalMs?: number;
  now?: () => number;
  wait?: (milliseconds: number, signal?: AbortSignal) => Promise<void>;
}): Promise<T> {
  const now = input.now ?? Date.now;
  const deadline = now() + (input.maxWaitMs ?? 52_000);
  const pollIntervalMs = input.pollIntervalMs ?? 350;
  const wait = input.wait ?? waitFor;
  let state = await input.reserve();

  // A request that joined an existing lease may wait for its cache, but it
  // must never become a new claimant near the end of the same HTTP function.
  // A fresh retry can claim failed/expired work with a full execution budget.
  while (state.action === "in_progress") {
    throwIfAborted(input.signal);
    if (now() >= deadline) return state;
    await wait(pollIntervalMs, input.signal);
    state = await input.inspect();
  }

  return state;
}

function throwIfAborted(signal?: AbortSignal) {
  if (!signal?.aborted) return;
  if (signal.reason instanceof Error) throw signal.reason;
  throw new DOMException("Request aborted", "AbortError");
}

function waitFor(milliseconds: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason instanceof Error
        ? signal.reason
        : new DOMException("Request aborted", "AbortError"));
      return;
    }
    const callerSignal = signal;
    const onAbort = () => {
      clearTimeout(timeout);
      callerSignal?.removeEventListener("abort", onAbort);
      reject(callerSignal?.reason instanceof Error
        ? callerSignal.reason
        : new DOMException("Request aborted", "AbortError"));
    };
    const timeout = setTimeout(() => {
      callerSignal?.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);
    callerSignal?.addEventListener("abort", onAbort, { once: true });
  });
}
