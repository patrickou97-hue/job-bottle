import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [migration, usersRoute, accessHelper, forumPostsRoute, forumPinRoute, balanceRoute, starInterviewAccess, billingHelper] = await Promise.all([
  readFile(new URL(
    "../supabase/migrations/20260810142000_admin_user_mutation_guard.sql",
    import.meta.url,
  ), "utf8"),
  readFile(new URL("../src/app/api/admin/users/route.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/lib/admin-access.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/app/api/admin/forum/posts/route.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/app/api/admin/forum/pin/route.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/app/api/admin/star-interview-balance/route.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/lib/star-interview-access.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/lib/star-interview-billing.ts", import.meta.url), "utf8"),
]);

function sqlFunction(name: string, nextName?: string) {
  const start = migration.indexOf(`create or replace function public.${name}`);
  const end = nextName
    ? migration.indexOf(`create or replace function public.${nextName}`, start)
    : migration.indexOf("revoke all on function", start);
  assert.ok(start >= 0 && end > start, `missing SQL function ${name}`);
  return migration.slice(start, end);
}

test("持久 guard 是立即撤权条件，授权不会早于最终原子解锁", () => {
  assert.match(migration, /target_user_id uuid primary key/);
  assert.match(migration, /join auth\.users u on u\.id = p\.id/);
  assert.match(migration, /not coalesce\(u\.banned_until > now\(\), false\)/);
  assert.match(migration, /not exists \([\s\S]*admin_user_mutation_guards g[\s\S]*g\.target_user_id = p\.id/);
  assert.doesNotMatch(migration, /lease_expires_at|delete[\s\S]{0,120}reserved_at\s*</i);

  const finalize = sqlFunction(
    "finalize_admin_user_mutation",
    "cancel_admin_user_mutation",
  );
  assert.match(finalize, /guard\.recovery_requested_at is not null/);
  assert.match(finalize, /from public\.admin_user_mutation_guards actor_guard[\s\S]*actor_guard\.target_user_id = p_actor_user_id/);
  assert.ok(
    finalize.indexOf("update public.profiles")
      < finalize.indexOf("delete from public.admin_user_mutation_guards"),
  );
});

test("reserve 从 Auth/Profile 权威读取身份、封禁与版本，不信任路由布尔值", () => {
  const reserve = sqlFunction(
    "reserve_admin_user_mutation",
    "finalize_admin_user_mutation",
  );
  assert.match(reserve, /select \* into actor_auth[\s\S]*from auth\.users[\s\S]*for share/);
  assert.match(reserve, /coalesce\(actor_auth\.banned_until > now\(\), false\)/);
  assert.match(reserve, /select \* into actor_profile[\s\S]*actor_profile\.role is distinct from 'admin'/);
  assert.match(reserve, /where target_user_id = p_actor_user_id[\s\S]*ADMIN_ACTOR_RECOVERY_REQUIRED/);
  assert.match(reserve, /actor_is_primary := lower\(coalesce\(actor_auth\.email/);
  assert.match(reserve, /actor_auth_updated_at[\s\S]*actor_auth\.updated_at/);
  assert.match(reserve, /actor_profile_updated_at[\s\S]*actor_profile\.updated_at/);
  assert.doesNotMatch(reserve, /p_actor_is_primary|p_target_is_primary/);
});

test("finalize 对旧管理员、旧版本、恢复中 guard 与非目标 Auth 一律 fail-closed", () => {
  const finalize = sqlFunction(
    "finalize_admin_user_mutation",
    "cancel_admin_user_mutation",
  );
  assert.match(finalize, /actor_profile\.updated_at is distinct from guard\.actor_profile_updated_at/);
  assert.match(finalize, /actor_auth\.updated_at is distinct from guard\.actor_auth_updated_at/);
  assert.match(finalize, /actor_guard\.target_user_id = p_actor_user_id/);
  assert.match(finalize, /target_auth\.banned_until is distinct from guard\.previous_banned_until/);
  assert.match(finalize, /target_access_value is distinct from to_jsonb\(guard\.next_access_value\)/);
  assert.match(finalize, /target_profile\.role is distinct from guard\.previous_role/);
  assert.match(finalize, /'code', 'ADMIN_TARGET_AUTH_CHANGED'/);
});

test("cancel 只有在 Auth/Profile 可证明为原快照时才释放 guard", () => {
  const cancel = sqlFunction(
    "cancel_admin_user_mutation",
    "recover_admin_user_mutation",
  );
  assert.match(cancel, /guard\.recovery_requested_at is not null/);
  assert.match(cancel, /target_profile\.role is distinct from guard\.previous_role/);
  assert.match(cancel, /target_profile\.display_name is distinct from guard\.previous_display_name/);
  assert.match(cancel, /target_auth\.banned_until is distinct from guard\.previous_banned_until/);
  assert.match(cancel, /target_access_value is distinct from guard\.previous_access_value/);
  assert.ok(cancel.indexOf("return false") < cancel.indexOf("delete from public.admin_user_mutation_guards"));
});

test("恢复为主管理员两阶段静默恢复，不按 TTL 盲删且先恢复 Auth 再解锁", () => {
  const recover = sqlFunction("recover_admin_user_mutation");
  assert.match(recover, /p_reservation_token uuid/);
  assert.match(recover, /guard\.reservation_token <> p_reservation_token/);
  assert.match(migration, /recovery_requested_at timestamptz/);
  assert.match(recover, /lower\(coalesce\(primary_auth\.email, ''\)\) <> 'raywang6688@outlook\.com'/);
  assert.match(recover, /quiesce_seconds constant integer := 300/);
  assert.match(recover, /'action', 'quiescing'/);
  assert.match(recover, /guard\.recovery_requested_at \+ make_interval/);
  assert.match(recover, /set banned_until = guard\.previous_banned_until/);
  assert.match(recover, /jsonb_set\([\s\S]*guard\.previous_access_value/);
  assert.match(recover, /restored_metadata := restored_metadata - 'star_interview_unlimited_access'/);
  assert.match(recover, /target_profile\.role is distinct from guard\.previous_role/);
  assert.doesNotMatch(recover, /update public\.profiles/);
  assert.match(recover, /'display_name', target_profile\.display_name/);
  assert.ok(recover.indexOf("insert into public.admin_user_mutation_recoveries")
    < recover.indexOf("delete from public.admin_user_mutation_guards"));
  assert.match(usersRoute, /export const maxDuration = 60/);
  assert.match(usersRoute, /reservationToken: body\.reservationToken/);
});

test("Auth 写入结果无论 API 报错与否都权威回读，并按 target/original/ambiguous 分流", () => {
  const applyStart = usersRoute.indexOf("async function applyGuardedAuthTarget");
  const rollbackStart = usersRoute.indexOf("async function rollbackGuardedAuthAndCancel");
  const apply = usersRoute.slice(applyStart, rollbackStart);
  assert.ok(applyStart >= 0 && rollbackStart > applyStart);
  assert.match(apply, /updateUserById\(guard\.targetUserId, patch\)/);
  assert.match(apply, /mutationError = result\.error/);
  assert.match(apply, /getUserById\(guard\.targetUserId\)/);
  assert.ok(apply.indexOf("updateUserById") < apply.indexOf("getUserById"));
  assert.match(apply, /if \(state === "target"\) return observed\.user/);
  assert.match(apply, /if \(state === "original"\)[\s\S]*if \(mutationAttempted\)[\s\S]*保持锁定[\s\S]*cancelAdminUserMutation/);
  assert.match(apply, /既非原状态也非目标状态[\s\S]*保持锁定/);
});

test("display_name 的 NULL 与空值按原值精确快照比较，恢复保留 guard 期间合法新值", () => {
  assert.match(migration, /previous_display_name text,/);
  assert.doesNotMatch(migration, /coalesce\(nullif\(target_profile\.display_name/);
  assert.match(migration, /target_profile\.display_name is distinct from guard\.previous_display_name/);
  const recover = sqlFunction("recover_admin_user_mutation");
  assert.doesNotMatch(recover, /update public\.profiles/);
  assert.match(recover, /'display_name', target_profile\.display_name/);
  assert.ok(
    recover.indexOf("select * into target_auth from auth.users")
      < recover.indexOf("select * into target_profile from public.profiles"),
  );
});

test("finalize 响应不确定时不会盲目回滚，只有确定的非 applied 结果才进入回滚", () => {
  const profileFlow = usersRoute.slice(
    usersRoute.indexOf("const finalized = await finalizeAdminUserMutation", usersRoute.indexOf("export async function PATCH")),
    usersRoute.indexOf("const profile: AdminProfile"),
  );
  assert.match(profileFlow, /^const finalized = await finalizeAdminUserMutation/m);
  assert.match(profileFlow, /if \(finalized\.action !== "applied"\) \{[\s\S]*rollbackGuardedAuthAndCancel/);
  assert.match(profileFlow, /if \(!appliedRole \|\| appliedDisplayName === undefined\)[\s\S]*select\("role,display_name"\)/);
  assert.ok(
    profileFlow.indexOf("rollbackGuardedAuthAndCancel")
      < profileFlow.indexOf("if (!appliedRole || appliedDisplayName === undefined)"),
  );
  assert.doesNotMatch(profileFlow, /catch[\s\S]*rollbackGuardedAuthAndCancel/);
});

test("StarInterview 权限与角色/封禁共享同一 target guard，metadata 仅写自己的单键", () => {
  const starFlow = usersRoute.slice(
    usersRoute.indexOf("async function updateStarInterviewAccess"),
    usersRoute.indexOf("type GuardIdentity"),
  );
  assert.match(starFlow, /reserveAdminUserMutation[\s\S]*mutationKind: "star_interview_access"/);
  assert.match(starFlow, /applyGuardedAuthTarget[\s\S]*finalizeAdminUserMutation/);
  assert.doesNotMatch(usersRoute, /\.\.\.\s*(?:current|previousAuth\.user)\.app_metadata/);
  assert.match(starInterviewAccess, /from\("admin_user_mutation_guards"\)/);
  assert.match(starInterviewAccess, /STAR_INTERVIEW_ACCOUNT_RECOVERY_REQUIRED/);
  assert.doesNotMatch(starInterviewAccess, /getStarInterviewWallet/);
  assert.doesNotMatch(starInterviewAccess, /mode === "standard" && _feature === "asr"/);
});

test("所有管理员 API 都经过共享 guard-aware 鉴权，余额接口额外要求主管理员", () => {
  assert.match(accessHelper, /supabase\.rpc\("is_admin"\)/);
  assert.match(accessHelper, /ADMIN_ACCESS_SUSPENDED/);
  for (const source of [usersRoute, forumPostsRoute, forumPinRoute]) {
    assert.match(source, /requireAdminAccess\(/);
  }
  assert.doesNotMatch(forumPostsRoute, /createAdminClient/);
  assert.equal((forumPostsRoute.match(/const \{ supabase \} = access/g) ?? []).length, 2);
  assert.match(forumPostsRoute, /const \{ user, supabase \} = access/);
  assert.equal((forumPostsRoute.match(/await supabase\s*\.from\("forum_posts"\)/g) ?? []).length, 3);
  assert.equal((balanceRoute.match(/requireAdminAccess\(\{ primaryOnly: true \}\)/g) ?? []).length, 2);
});

test("所有 guard RPC 仅授予 service_role", () => {
  for (const name of [
    "reserve_admin_user_mutation",
    "finalize_admin_user_mutation",
    "cancel_admin_user_mutation",
    "recover_admin_user_mutation",
  ]) {
    assert.match(migration, new RegExp(`revoke all on function public\\.${name}\\([\\s\\S]*?from public, anon, authenticated`));
    assert.match(migration, new RegExp(`grant execute on function public\\.${name}\\([\\s\\S]*?to service_role`));
  }
});

test("主管理员余额发放在每笔数据库事务内复核 Auth、角色、封禁与 own guard", () => {
  const grant = sqlFunction(
    "adjust_star_interview_admin_grant",
    "reserve_admin_user_mutation",
  );
  assert.match(grant, /pg_advisory_xact_lock/);
  assert.match(grant, /select \* into actor_auth from auth\.users[\s\S]*for share/);
  assert.match(grant, /select \* into actor_profile from public\.profiles[\s\S]*for share/);
  assert.match(grant, /raywang6688@outlook\.com/);
  assert.match(grant, /actor_profile\.role is distinct from 'admin'/);
  assert.match(grant, /actor_auth\.banned_until > now\(\)/);
  assert.match(grant, /admin_user_mutation_guards[\s\S]*target_user_id = p_actor_user_id/);
  assert.match(grant, /adjust_star_interview_balance\([\s\S]*'admin_grant'/);
  assert.match(billingHelper, /input\.entryType === "admin_grant"[\s\S]*adjust_star_interview_admin_grant/);
  assert.match(migration, /revoke all on function public\.adjust_star_interview_admin_grant\([\s\S]*from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.adjust_star_interview_admin_grant\([\s\S]*to service_role/);
});

test("最坏交错模型：恢复静默期阻止旧 finalize，恢复完成前也不能开始 G2", () => {
  const state = createRecoveryModel();
  assert.equal(state.reserve("G1"), "claimed");
  assert.equal(state.requestRecovery("G0"), "stale");
  assert.equal(state.requestRecovery("G1"), "quiescing");
  assert.equal(state.finalize("G1"), "stale");
  assert.equal(state.reserve("G2"), "busy");
  assert.equal(state.finishRecovery(299), "quiescing");
  assert.equal(state.finishRecovery(300), "recovered");
  assert.equal(state.reserve("G2"), "claimed");
  assert.equal(state.finalize("G1"), "stale");
  assert.equal(state.finalize("G2"), "applied");
});

function createRecoveryModel() {
  let guard: string | null = null;
  let recoveryRequested = false;
  return {
    reserve(token: string) {
      if (guard) return "busy" as const;
      guard = token;
      recoveryRequested = false;
      return "claimed" as const;
    },
    requestRecovery(token: string) {
      if (guard !== token) return "stale" as const;
      recoveryRequested = true;
      return "quiescing" as const;
    },
    finishRecovery(elapsedSeconds: number) {
      if (elapsedSeconds < 300) return "quiescing" as const;
      guard = null;
      recoveryRequested = false;
      return "recovered" as const;
    },
    finalize(token: string) {
      if (guard !== token || recoveryRequested) return "stale" as const;
      guard = null;
      return "applied" as const;
    },
  };
}
