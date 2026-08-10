import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [migration, route, billing, access] = await Promise.all([
  readFile(new URL(
    "../supabase/migrations/20260810144500_star_interview_asr_reservations.sql",
    import.meta.url,
  ), "utf8"),
  readFile(new URL("../src/app/api/star-interview/asr/route.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/lib/star-interview-billing.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/lib/star-interview-access.ts", import.meta.url), "utf8"),
]);

function sqlFunction(name: string, nextName?: string) {
  const start = migration.indexOf(`create or replace function public.${name}`);
  const end = nextName
    ? migration.indexOf(`create or replace function public.${nextName}`, start)
    : migration.indexOf("revoke all on function", start);
  assert.ok(start >= 0 && end > start, `missing SQL function ${name}`);
  return migration.slice(start, end);
}

test("ASR request 持久保存唯一 v2 key、四态、token、lease、实测 units 与限时结果", () => {
  assert.match(migration, /create table public\.star_interview_asr_requests/);
  assert.match(migration, /unique \(user_id, meter_key\)/);
  assert.match(migration, /state in \('reserved', 'succeeded', 'consumed', 'failed'\)/);
  for (const field of [
    "reservation_token uuid",
    "lease_expires_at timestamptz",
    "units bigint",
    "reserved_fen bigint",
    "actual_charge_fen bigint",
    "nominal_charge_fen bigint",
    "response_body text",
    "cache_expires_at timestamptz",
  ]) assert.match(migration, new RegExp(field));
  assert.match(migration, /units between 1 and 45000/);
  assert.match(
    migration,
    /star_interview_asr_requests_cache_idx[\s\S]*cache_expires_at, user_id[\s\S]*where state = 'succeeded'/,
  );
});

test("reserve 在上游前按 v2 meter 与单次兼容 alias baseline 原子预扣", () => {
  const reserve = sqlFunction("reserve_star_interview_asr", "confirm_star_interview_asr_dispatch");
  assert.match(reserve, /from public\.star_interview_wallets[\s\S]*for update/);
  assert.match(reserve, /star_interview_asr_meter_aliases/);
  assert.match(reserve, /2026-08-17 00:00:00\+00/);
  assert.match(reserve, /legacy_meter\.max_units[\s\S]*legacy_meter\.nominal_cost_fen/);
  assert.match(reserve, /ceil\(greatest\(p_units, meter\.max_units\)::numeric \* 40 \/ 60000\)/);
  assert.match(reserve, /delta_cost := greatest\(0, new_total_cost - meter\.nominal_cost_fen\)/);
  assert.match(reserve, /if actual_reserve > wallet\.balance_fen[\s\S]*'action', 'insufficient'/);
  assert.match(reserve, /set balance_fen = balance_fen - actual_reserve/);
  assert.ok(reserve.indexOf("set balance_fen = balance_fen - actual_reserve")
    < reserve.indexOf("set state = 'reserved'"));

  const post = route.slice(route.indexOf("export async function POST"));
  assert.ok(post.indexOf("reserveStarInterviewASR") < post.indexOf("getStarInterviewASRConfiguration"));
  assert.ok(post.indexOf("reserveStarInterviewASR") < post.indexOf("fetchOpenAICompatibleJSON"));
  assert.doesNotMatch(post, /chargeStarInterviewUsage/);
});

test("并发同 key 返回 in_progress，不同 key 也由 wallet 行锁限制总预留", () => {
  const reserve = sqlFunction("reserve_star_interview_asr", "confirm_star_interview_asr_dispatch");
  assert.match(reserve, /asr_request\.state = 'reserved'[\s\S]*'action', 'in_progress'/);
  assert.match(reserve, /pg_advisory_xact_lock[\s\S]*star_interview_asr:/);
  assert.ok(reserve.indexOf("for update") < reserve.indexOf("actual_reserve > wallet.balance_fen"));

  const model = createASRModel(30);
  assert.equal(model.reserve("audio-a", 45_000), "claimed");
  assert.equal(model.reserve("audio-a", 45_000), "in_progress");
  assert.equal(model.reserve("audio-b", 45_000), "insufficient");
  assert.equal(model.upstreamCalls, 1);
});

test("1 分余额不能用新 meterKey 放大 45 秒上游调用", () => {
  const model = createASRModel(1);
  for (let index = 0; index < 20; index += 1) {
    assert.equal(model.reserve(`audio-${index}`, 45_000), "insufficient");
  }
  assert.equal(model.balance, 1);
  assert.equal(model.upstreamCalls, 0);
});

test("complete 才写 meter、累计消耗和 ledger；成功 key 在 24h 内只回放缓存", () => {
  const complete = sqlFunction("complete_star_interview_asr", "fail_star_interview_asr");
  assert.match(complete, /update public\.star_interview_usage_meters/);
  assert.match(complete, /total_spent_fen = total_spent_fen \+ actual_charge/);
  assert.match(complete, /nominal_spent_fen = nominal_spent_fen \+ delta_cost/);
  assert.match(complete, /insert into public\.star_interview_ledger/);
  assert.ok(complete.indexOf("update public.star_interview_usage_meters")
    < complete.indexOf("set state = case when p_consumed"));

  const post = route.slice(route.indexOf("export async function POST"));
  assert.ok(post.indexOf("completeStarInterviewASR") < post.lastIndexOf("return NextResponse.json"));
  assert.match(post, /RPC may have committed before its response was lost[\s\S]*Never issue a[\s\S]*compensating refund/);
  assert.doesNotMatch(access, /getStarInterviewWallet\(session\.sub\)/);
  assert.doesNotMatch(access, /getStarInterviewWallet\(session\.sub\)/);
  assert.match(migration, /cache_expires_at = case[\s\S]*interval '24 hours'/);
  assert.match(route, /reservation\.action === "cached"[\s\S]*X-StarInterview-Replayed/);

  const model = createASRModel(30);
  assert.equal(model.reserve("same", 45_000), "claimed");
  assert.equal(model.complete("same"), "succeeded");
  assert.equal(model.balance, 0);
  assert.equal(model.reserve("same", 45_000), "cached");
  assert.equal(model.balance, 0);
  assert.equal(model.upstreamCalls, 1);
  assert.equal(model.totalSpent, 30);
});

test("配置缺失和已知上游错误都 fail 退款；失败后可安全重试", () => {
  const fail = sqlFunction("fail_star_interview_asr", "reconcile_star_interview_asr_leases");
  assert.match(fail, /set balance_fen = balance_fen \+ asr_request\.reserved_fen/);
  assert.match(fail, /set state = 'failed'/);
  assert.match(route, /if \(!config\)[\s\S]*settleFailedASRReservation\([\s\S]*ASR configuration missing/);
  assert.match(route, /catch \(error\)[\s\S]*settleFailedASRReservation\(/);

  const model = createASRModel(30);
  assert.equal(model.reserve("retry", 45_000), "claimed");
  assert.equal(model.fail("retry"), "failed");
  assert.equal(model.balance, 30);
  assert.equal(model.reserve("retry", 45_000), "claimed");
  assert.equal(model.upstreamCalls, 2);
});

test("上游发出后的调用方取消会结算扣费，发出前取消与明确上游失败才退款", () => {
  assert.match(route, /StarInterviewCallerAbortError/);
  assert.match(route, /let upstreamFetchStarted = false/);
  assert.match(route, /onFetchStarted: \(\) => \{ upstreamFetchStarted = true; \}/);
  const settlement = route.slice(
    route.indexOf("async function settleFailedASRReservation"),
    route.indexOf("function retryAfterSeconds"),
  );
  assert.match(
    settlement,
    /upstreamFetchStarted && error instanceof StarInterviewCallerAbortError[\s\S]*responseBody: null[\s\S]*consumed: true/,
  );
  assert.match(settlement, /failStarInterviewASR/);
  assert.ok(
    settlement.indexOf("completeStarInterviewASR")
      < settlement.indexOf("failStarInterviewASR"),
  );
});

test("reserve 与 fetch 前 confirm 都从 Auth/Profile 重算权限并拦截 guard、封禁和模式变化", () => {
  const reserve = sqlFunction("reserve_star_interview_asr", "confirm_star_interview_asr_dispatch");
  const confirm = sqlFunction("confirm_star_interview_asr_dispatch", "complete_star_interview_asr");
  for (const body of [reserve, confirm]) {
    assert.match(body, /admin-user-mutation:/);
    assert.match(body, /from auth\.users/);
    assert.match(body, /from public\.profiles/);
    assert.match(body, /admin_user_mutation_guards/);
    assert.match(body, /banned_until/);
    assert.match(body, /raw_app_meta_data[\s\S]*star_interview_unlimited_access/);
  }
  assert.match(reserve, /resolved_unlimited := case/);
  assert.match(confirm, /asr_request\.unlimited is distinct from resolved_unlimited/);
  assert.match(confirm, /asr_request\.reserved_fen <> \(case[\s\S]*?end\) then/);
  assert.match(confirm, /asr_request\.lease_expires_at <= now\(\)/);
  assert.match(route, /beforeDispatch: async \(\) => \{[\s\S]*confirmStarInterviewASRDispatch/);
  assert.ok(route.indexOf("beforeDispatch") < route.indexOf("onFetchStarted"));
});

test("缓存过期和调用方取消后的 consumed key 都不会再次调用上游", () => {
  const reconcile = sqlFunction(
    "reconcile_star_interview_asr_leases",
    "consume_star_interview_usage",
  );
  assert.match(reconcile, /state = 'succeeded'[\s\S]*cache_expires_at/);
  assert.match(reconcile, /set state = 'consumed'[\s\S]*response_body = null/);
  assert.match(reconcile, /'purged', purged_count/);
  assert.match(route, /reservation\.action === "consumed"[\s\S]*STAR_INTERVIEW_ASR_RESULT_CONSUMED/);

  const model = createASRModel(30);
  assert.equal(model.reserve("expired", 45_000), "claimed");
  assert.equal(model.complete("expired"), "succeeded");
  model.expireCache("expired");
  assert.equal(model.reserve("expired", 45_000), "consumed");
  assert.equal(model.upstreamCalls, 1);
});

test("全局 cron 回收没有后续流量的 expired reserved，且遵循 wallet 到 request 锁序", () => {
  const reconcile = sqlFunction(
    "reconcile_star_interview_asr_leases",
    "consume_star_interview_usage",
  );
  assert.match(reconcile, /from public\.star_interview_asr_requests[\s\S]*state = 'reserved'/);
  assert.match(reconcile, /pg_try_advisory_xact_lock/);
  assert.ok(reconcile.indexOf("from public.star_interview_wallets")
    < reconcile.indexOf("for update skip locked"));
  assert.match(reconcile, /balance_fen = balance_fen \+ asr_request\.reserved_fen/);
  assert.match(migration, /'star-interview-asr-lease-reconcile'[\s\S]*'\* \* \* \* \*'[\s\S]*reconcile_star_interview_asr_leases\(500\)/);

  const first = createASRModel(30);
  const second = createASRModel(30);
  first.reserve("a", 45_000);
  second.reserve("b", 45_000);
  first.expireAll();
  second.expireAll();
  assert.equal(first.balance + second.balance, 60);
});

test("rolling deploy wrapper 在负查询与旧 post-charge 之间持有相同用户锁", () => {
  const wrapper = sqlFunction("consume_star_interview_usage");
  assert.match(migration, /rename to consume_star_interview_usage_before_asr_reservations/);
  assert.match(wrapper, /pg_advisory_xact_lock[\s\S]*star_interview_asr:/);
  assert.ok(wrapper.indexOf("from public.star_interview_wallets")
    < wrapper.indexOf("from public.star_interview_asr_requests"));
  assert.match(wrapper, /complete_star_interview_asr\([\s\S]*active_token/);
  assert.match(wrapper, /consume_star_interview_usage_before_asr_reservations/);
});

test("ASR reservation 表与全部 RPC 仅向 service_role 开放", () => {
  assert.match(migration, /revoke all on table public\.star_interview_asr_requests[\s\S]*from public, anon, authenticated/);
  for (const name of [
    "reserve_star_interview_asr",
    "confirm_star_interview_asr_dispatch",
    "complete_star_interview_asr",
    "fail_star_interview_asr",
    "reconcile_star_interview_asr_leases",
  ]) {
    assert.match(migration, new RegExp(`revoke all on function public\\.${name}\\([\\s\\S]*?from public, anon, authenticated`));
    assert.match(migration, new RegExp(`grant execute on function public\\.${name}\\([\\s\\S]*?to service_role`));
  }
});

test("路由只给规范化 base64 添加一次 data URI 前缀", () => {
  assert.match(route, /normalizedAudio = normalizeBase64WavAudio\(parsed\.data\.audio\)/);
  assert.match(route, /data: `data:audio\/wav;base64,\$\{normalizedAudio\}`/);
  assert.doesNotMatch(route, /base64,\$\{parsed\.data\.audio\}/);
  assert.match(billing, /reserve_star_interview_asr/);
  assert.match(billing, /complete_star_interview_asr/);
  assert.match(billing, /fail_star_interview_asr/);
});

type RequestState = {
  state: "reserved" | "succeeded" | "consumed" | "failed";
  held: number;
  cost: number;
  response?: string;
};

function createASRModel(initialBalance: number) {
  const requests = new Map<string, RequestState>();
  let balance = initialBalance;
  let totalSpent = 0;
  let upstreamCalls = 0;
  return {
    get balance() { return balance; },
    get totalSpent() { return totalSpent; },
    get upstreamCalls() { return upstreamCalls; },
    reserve(key: string, units: number) {
      const current = requests.get(key);
      if (current?.state === "reserved") return "in_progress" as const;
      if (current?.state === "succeeded") return "cached" as const;
      if (current?.state === "consumed") return "consumed" as const;
      const totalCost = Math.ceil(units * 40 / 60_000);
      const paid = 0;
      const delta = Math.max(0, totalCost - paid);
      if (delta > balance) return "insufficient" as const;
      balance -= delta;
      requests.set(key, { state: "reserved", held: delta, cost: Math.max(paid, totalCost) });
      upstreamCalls += 1;
      return "claimed" as const;
    },
    complete(key: string) {
      const current = requests.get(key);
      assert.equal(current?.state, "reserved");
      totalSpent += current.held;
      requests.set(key, { ...current, state: "succeeded", held: 0, response: "transcript" });
      return "succeeded" as const;
    },
    fail(key: string) {
      const current = requests.get(key);
      assert.equal(current?.state, "reserved");
      balance += current.held;
      requests.set(key, { state: "failed", held: 0, cost: 0 });
      return "failed" as const;
    },
    expireAll() {
      for (const [key, current] of requests) {
        if (current.state !== "reserved") continue;
        balance += current.held;
        requests.set(key, { state: "failed", held: 0, cost: 0 });
      }
    },
    expireCache(key: string) {
      const current = requests.get(key);
      assert.equal(current?.state, "succeeded");
      requests.set(key, { ...current, state: "consumed", response: undefined });
    },
  };
}
