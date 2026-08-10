import assert from "node:assert/strict";
import test from "node:test";

const modulePath = "../src/lib/admin-auth-mutation." + "ts";
const {
  buildGuardedAuthPatch,
  buildGuardedAuthRollbackPatch,
  classifyGuardedAuthState,
  guardedAuthMatchesOriginal,
  isEmptyGuardedAuthPatch,
} = await import(modulePath);

const previousBan = "2030-01-01T00:00:00.000Z";

test("目标 patch 只包含工作流拥有的 metadata 单键", () => {
  const patch = buildGuardedAuthPatch({
    currentDisabled: true,
    previousBannedUntil: previousBan,
    previousAccessKeyPresent: false,
    previousAccessValue: undefined,
    nextDisabled: false,
    mutateAccessKey: true,
    nextAccessValue: true,
  });
  assert.deepEqual(patch, {
    ban_duration: "none",
    app_metadata: { star_interview_unlimited_access: true },
  });
  assert.equal(Object.keys(patch.app_metadata).length, 1);
});

test("旧 metadata 单键不存在时回滚显式写 null，不复制整个对象", () => {
  const patch = buildGuardedAuthRollbackPatch({
    currentDisabled: false,
    previousBannedUntil: null,
    previousAccessKeyPresent: false,
    previousAccessValue: undefined,
    nextDisabled: false,
    mutateAccessKey: true,
    nextAccessValue: true,
  });
  assert.deepEqual(patch, {
    app_metadata: { star_interview_unlimited_access: null },
  });
});

test("Auth 回读严格区分目标、精确原快照和歧义状态", () => {
  const plan = {
    currentDisabled: true,
    previousBannedUntil: previousBan,
    previousAccessKeyPresent: true,
    previousAccessValue: false,
    nextDisabled: false,
    mutateAccessKey: true,
    nextAccessValue: true,
  };
  assert.equal(classifyGuardedAuthState(plan, {
    banned_until: null,
    app_metadata: { star_interview_unlimited_access: true, unrelated: "kept" },
  }), "target");
  assert.equal(classifyGuardedAuthState(plan, {
    banned_until: previousBan,
    app_metadata: { star_interview_unlimited_access: false },
  }), "original");
  assert.equal(classifyGuardedAuthState(plan, {
    banned_until: "2031-01-01T00:00:00.000Z",
    app_metadata: { star_interview_unlimited_access: false },
  }), "ambiguous");
});

test("cancel 的原态判定要求 ban 时间戳精确，缺失 metadata 可由 null 中和", () => {
  const plan = {
    currentDisabled: true,
    previousBannedUntil: previousBan,
    previousAccessKeyPresent: false,
    previousAccessValue: undefined,
    nextDisabled: false,
    mutateAccessKey: true,
    nextAccessValue: true,
  };
  assert.equal(guardedAuthMatchesOriginal(plan, {
    banned_until: previousBan,
    app_metadata: { star_interview_unlimited_access: null, unrelated: 1 },
  }), true);
  assert.equal(guardedAuthMatchesOriginal(plan, {
    banned_until: "2032-01-01T00:00:00.000Z",
    app_metadata: { star_interview_unlimited_access: null },
  }), false);
});

test("没有 Auth 字段变化时不发空更新", () => {
  assert.equal(isEmptyGuardedAuthPatch(buildGuardedAuthPatch({
    currentDisabled: false,
    previousBannedUntil: null,
    previousAccessKeyPresent: true,
    previousAccessValue: false,
    nextDisabled: false,
    mutateAccessKey: false,
    nextAccessValue: false,
  })), true);
});
