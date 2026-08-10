import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const reservationModulePath = "../src/lib/star-interview-completion-reservation." + "ts";
const {
  acquireCompletionReservation,
  assertCompletionDispatchAllowed,
  CompletionDispatchBlockedError,
  parseCompletionDispatchIntent,
} = await import(reservationModulePath);

type FakeResult = {
  action: "claimed" | "cached" | "in_progress" | "failed" | "consumed";
  reservationToken?: string;
  responseBody?: string;
};

function createFakeReservationStore() {
  let state: FakeResult = { action: "failed" };
  let attempt = 0;
  return {
    reserve: async (): Promise<FakeResult> => {
      if (state.action === "failed") {
        attempt += 1;
        state = { action: "in_progress" };
        return {
          action: "claimed" as const,
          reservationToken: `token-${attempt}`,
        };
      }
      return { ...state };
    },
    inspect: async () => ({ ...state }),
    complete(body: string) {
      state = { action: "cached", responseBody: body };
    },
    fail() {
      state = { action: "failed" };
    },
  };
}

const shortWait = () => new Promise<void>((resolve) => setTimeout(resolve, 1));

test("concurrent identical requests make one upstream call and share one result", async () => {
  const store = createFakeReservationStore();
  let upstreamCalls = 0;

  const execute = async () => {
    const reservation = await acquireCompletionReservation({
      reserve: store.reserve,
      inspect: store.inspect,
      pollIntervalMs: 1,
      maxWaitMs: 1_000,
      wait: shortWait,
    });
    if (reservation.action === "cached") return reservation.responseBody;
    assert.equal(reservation.action, "claimed");
    upstreamCalls += 1;
    await new Promise<void>((resolve) => setTimeout(resolve, 15));
    store.complete("persisted-answer");
    return "persisted-answer";
  };

  const [first, concurrentRetry] = await Promise.all([execute(), execute()]);
  assert.equal(upstreamCalls, 1);
  assert.equal(first, "persisted-answer");
  assert.equal(concurrentRetry, "persisted-answer");
});

test("completed retries are cache-only while a failed reservation can be reclaimed", async () => {
  const store = createFakeReservationStore();
  let upstreamCalls = 0;

  const first = await acquireCompletionReservation({
    reserve: store.reserve,
    inspect: store.inspect,
    wait: shortWait,
  });
  assert.equal(first.action, "claimed");
  upstreamCalls += 1;
  store.fail();

  const retryAfterFailure = await acquireCompletionReservation({
    reserve: store.reserve,
    inspect: store.inspect,
    wait: shortWait,
  });
  assert.equal(retryAfterFailure.action, "claimed");
  upstreamCalls += 1;
  store.complete("recovered-answer");

  const completedRetry = await acquireCompletionReservation({
    reserve: store.reserve,
    inspect: store.inspect,
    wait: shortWait,
  });
  assert.equal(completedRetry.action, "cached");
  assert.equal(completedRetry.responseBody, "recovered-answer");
  assert.equal(upstreamCalls, 2);
});

test("a legacy charged tombstone never becomes a new upstream claim", async () => {
  let reserveCalls = 0;
  let inspectCalls = 0;
  let upstreamCalls = 0;
  const reservation = await acquireCompletionReservation({
    reserve: async (): Promise<FakeResult> => {
      reserveCalls += 1;
      return { action: "consumed" as const };
    },
    inspect: async (): Promise<FakeResult> => {
      inspectCalls += 1;
      return { action: "consumed" as const };
    },
  });
  if (reservation.action === "claimed") upstreamCalls += 1;
  assert.equal(reservation.action, "consumed");
  assert.equal(reserveCalls, 1);
  assert.equal(inspectCalls, 0);
  assert.equal(upstreamCalls, 0);
});

test("a waiter never turns into a late claimant in the same HTTP request", async () => {
  let reserveCalls = 0;
  let inspectCalls = 0;
  const result = await acquireCompletionReservation({
    reserve: async (): Promise<FakeResult> => {
      reserveCalls += 1;
      return { action: "in_progress" };
    },
    inspect: async (): Promise<FakeResult> => {
      inspectCalls += 1;
      return { action: "failed" };
    },
    pollIntervalMs: 1,
    wait: shortWait,
  });

  assert.equal(result.action, "failed");
  assert.equal(reserveCalls, 1);
  assert.equal(inspectCalls, 1);
});

test("dispatch intent parser fails closed when authority changes", () => {
  assert.deepEqual(parseCompletionDispatchIntent({ action: "dispatching" }), {
    action: "dispatching",
  });
  assert.doesNotThrow(() => assertCompletionDispatchAllowed({ action: "dispatching" }));

  const blocked = parseCompletionDispatchIntent({ action: "blocked" });
  assert.throws(
    () => assertCompletionDispatchAllowed(blocked),
    (error: unknown) => error instanceof CompletionDispatchBlockedError,
  );
  assert.throws(
    () => parseCompletionDispatchIntent({ action: "unexpected" }),
    /Invalid StarInterview completion dispatch intent response/,
  );
});

test("rolling deploy old-first and new-first paths cannot both subtract balance", async () => {
  const migration = await readFile(
    new URL(
      "../supabase/migrations/20260810143000_star_interview_completion_reservations.sql",
      import.meta.url,
    ),
    "utf8",
  );
  const legacyConsume = migration.slice(
    migration.indexOf("create or replace function public.consume_star_interview_usage"),
    migration.indexOf("create or replace function public.reserve_star_interview_completion"),
  );
  const walletLock = legacyConsume.indexOf("from public.star_interview_wallets");
  const requestLock = legacyConsume.indexOf("from public.star_interview_completion_requests");
  assert.ok(walletLock >= 0 && walletLock < requestLock);

  const reservedCompatibility = legacyConsume.slice(
    legacyConsume.indexOf("if found and completion_request.state in ('reserved', 'dispatching', 'dispatched') then"),
    legacyConsume.indexOf("if found and completion_request.state in ('streaming'"),
  );
  assert.match(reservedCompatibility, /actual_charge := completion_request\.reserved_fen/);
  assert.match(reservedCompatibility, /total_spent_fen = total_spent_fen \+ actual_charge/);
  assert.match(reservedCompatibility, /set state = 'consumed'/);
  assert.doesNotMatch(reservedCompatibility, /balance_fen = balance_fen - actual_charge/);
  assert.match(
    legacyConsume,
    /ceil\(greatest\(p_units, meter\.max_units\)::numeric \* 40 \/ 60000\)::bigint/,
  );

  const reserveFunction = migration.slice(
    migration.indexOf("create or replace function public.reserve_star_interview_completion"),
    migration.indexOf("create or replace function public.mark_star_interview_completion_dispatch_intent"),
  );
  assert.ok(
    reserveFunction.indexOf("legacy completion already charged")
      < reserveFunction.indexOf("balance_fen = balance_fen - charge"),
  );
});

test("route and migration enforce durable reservation, stream commit, and recovery", async () => {
  const [route, access, billing, migration] = await Promise.all([
    readFile(new URL("../src/app/api/star-interview/completion/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/star-interview-access.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/star-interview-billing.ts", import.meta.url), "utf8"),
    readFile(
      new URL(
        "../supabase/migrations/20260810143000_star_interview_completion_reservations.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);

  const post = route.slice(route.indexOf("export async function POST"));
  const reserveIndex = post.indexOf("acquireCompletionReservation");
  const configIndex = post.indexOf("getStarInterviewLLMConfiguration");
  const jsonUpstreamIndex = post.indexOf("fetchOpenAICompatibleJSON");
  assert.ok(reserveIndex >= 0 && reserveIndex < jsonUpstreamIndex);
  assert.ok(reserveIndex < configIndex);
  assert.match(route, /stream:\s*parsed\.data\.stream/);
  assert.match(access, /from\("admin_user_mutation_guards"\)/);
  assert.match(access, /already-paid key/);
  assert.doesNotMatch(access, /getStarInterviewWallet/);
  assert.doesNotMatch(access, /mode === "standard" && _feature === "asr"/);
  const reserveBilling = billing.slice(
    billing.indexOf("export async function reserveStarInterviewCompletion"),
    billing.indexOf("export async function getStarInterviewCompletion"),
  );
  assert.doesNotMatch(reserveBilling, /purge_star_interview_completion_cache/);

  assert.match(
    migration,
    /state in \('reserved', 'dispatching', 'dispatched', 'streaming', 'succeeded', 'failed', 'consumed'\)/,
  );
  assert.match(migration, /create or replace function public\.reserve_star_interview_completion/);
  assert.match(migration, /create or replace function public\.mark_star_interview_completion_dispatch_intent/);
  assert.match(migration, /create or replace function public\.mark_star_interview_completion_dispatched/);
  assert.match(migration, /create or replace function public\.commit_star_interview_completion_stream/);
  assert.match(migration, /create or replace function public\.complete_star_interview_completion/);
  assert.match(migration, /create or replace function public\.fail_star_interview_completion/);
  assert.match(migration, /state = 'streaming'[\s\S]*actual_charge_fen = charge/);
  assert.match(migration, /should_refund := coalesce\(p_refund, true\)/);
  assert.match(migration, /completion_request\.reservation_token <> p_reservation_token/);
  assert.match(migration, /meter_key = p_meter_key::text/);
  assert.match(migration, /meter_key like 'v2:' \|\| p_meter_key::text \|\| ':%'/);
  assert.match(migration, /legacy completion already charged/);
  const reserveFunction = migration.slice(
    migration.indexOf("create or replace function public.reserve_star_interview_completion"),
    migration.indexOf("create or replace function public.mark_star_interview_completion_dispatch_intent"),
  );
  assert.ok(
    reserveFunction.indexOf("legacy completion already charged")
      < reserveFunction.indexOf("charge := case when effective_unlimited"),
  );
  const failFunction = migration.slice(
    migration.indexOf("create or replace function public.fail_star_interview_completion"),
    migration.indexOf("revoke all on function public.reserve_star_interview_completion"),
  );
  assert.match(
    failFunction,
    /if should_refund then[\s\S]*balance_fen = balance_fen \+ completion_request\.reserved_fen[\s\S]*end if/,
  );
  assert.match(failFunction, /when should_refund then 'failed' else 'consumed' end/);
  assert.match(failFunction, /cancelled_after_dispatch/);

  const expiredSweep = migration.slice(
    migration.indexOf("with expired as"),
    migration.indexOf("-- A streaming request has already"),
  );
  assert.match(expiredSweep, /where user_id = p_user_id/);
  assert.match(expiredSweep, /sum\(reserved_fen\)/);
  assert.match(expiredSweep, /balance_fen = balance_fen \+ expired_release/);

  const cacheSweep = migration.slice(
    migration.indexOf("create or replace function public.purge_star_interview_completion_cache"),
    migration.indexOf("create or replace function public.consume_star_interview_usage"),
  );
  assert.doesNotMatch(cacheSweep, /limit\s+\d+/);
  assert.match(cacheSweep, /for update skip locked/);
  assert.doesNotMatch(cacheSweep, /user_id = p_user_id/);
  assert.match(cacheSweep, /returns bigint/);
  assert.match(migration, /cache_expires_at = now\(\) \+ interval '24 hours'/);
  assert.match(migration, /create extension if not exists pg_cron/);
  assert.match(migration, /star-interview-completion-cache-purge/);
  assert.match(migration, /'\* \* \* \* \*'/);
  assert.match(migration, /create or replace function public\.reconcile_star_interview_completion_leases/);
  assert.match(migration, /if completion_request\.state = 'reserved' then/);
  assert.match(migration, /if completion_request\.state in \('dispatching', 'dispatched'\) then/);
  assert.match(migration, /'dispatch_phase_at_expiry', completion_request\.state/);
  assert.match(migration, /lease_expires_at = now\(\) \+ interval '210 seconds'/);

  assert.match(migration, /user_id uuid primary key references auth\.users/);
  assert.match(migration, /on conflict \(user_id\) do nothing/);
  assert.match(migration, /now\(\) < timestamptz '2026-08-17 00:00:00\+00'/);
  assert.match(migration, /split_part\(v2_meter_key, ':', 2\) = lower\(legacy_meter_key::text\)/);

  assert.match(
    migration,
    /grant execute on function public\.commit_star_interview_completion_stream\([\s\S]*\) to service_role/,
  );
  assert.doesNotMatch(
    migration,
    /grant execute on function public\.commit_star_interview_completion_stream\([\s\S]*\) to authenticated/,
  );
});

test("completion reservation and dispatch close the account authority snapshot", async () => {
  const [route, migration] = await Promise.all([
    readFile(new URL("../src/app/api/star-interview/completion/route.ts", import.meta.url), "utf8"),
    readFile(
      new URL(
        "../supabase/migrations/20260810143000_star_interview_completion_reservations.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);
  const reserveFunction = migration.slice(
    migration.indexOf("create or replace function public.reserve_star_interview_completion"),
    migration.indexOf("create or replace function public.mark_star_interview_completion_dispatch_intent"),
  );
  const dispatchFunction = migration.slice(
    migration.indexOf("create or replace function public.mark_star_interview_completion_dispatch_intent"),
    migration.indexOf("create or replace function public.mark_star_interview_completion_dispatched"),
  );

  for (const sqlFunction of [reserveFunction, dispatchFunction]) {
    const accountLock = sqlFunction.indexOf("admin-user-mutation:");
    const completionLock = sqlFunction.indexOf("star_interview_completion:");
    assert.ok(accountLock >= 0 && accountLock < completionLock);
    assert.match(sqlFunction, /from auth\.users/);
    assert.match(sqlFunction, /from public\.profiles/);
    assert.match(sqlFunction, /from public\.admin_user_mutation_guards/);
    assert.match(sqlFunction, /account_auth\.banned_until > now\(\)/);
    assert.match(sqlFunction, /'star_interview_unlimited_access'/);
    assert.match(sqlFunction, /jsonb_typeof\(access_value\) = 'boolean'/);
  }

  assert.match(reserveFunction, /p_unlimited boolean/);
  assert.match(reserveFunction, /charge := case when effective_unlimited then 0 else 80 end/);
  assert.doesNotMatch(reserveFunction, /charge := case when p_unlimited/);

  assert.match(dispatchFunction, /expected_charge := case when effective_unlimited then 0 else 80 end/);
  assert.match(dispatchFunction, /completion_request\.reserved_fen <> expected_charge/);
  assert.match(dispatchFunction, /'action', 'blocked'/);
  assert.ok(
    dispatchFunction.indexOf("'action', 'blocked'")
      < dispatchFunction.indexOf("set state = 'dispatching'"),
  );
  assert.ok(
    dispatchFunction.indexOf("completion_request.reserved_fen <> expected_charge")
      < dispatchFunction.indexOf("if completion_request.state = 'dispatching' then"),
  );

  const post = route.slice(route.indexOf("export async function POST"));
  assert.match(post, /mark_star_interview_completion_dispatch_intent/);
  assert.match(post, /assertCompletionDispatchAllowed\(intent\)/);
  assert.match(post, /error instanceof CompletionDispatchBlockedError/);
  assert.match(post, /STAR_INTERVIEW_ACCOUNT_STATE_CHANGED/);
  assert.ok(
    post.indexOf("await releaseCompletionClaim(claim, error")
      < post.indexOf("error instanceof CompletionDispatchBlockedError"),
  );
});
