import assert from "node:assert/strict";
import test from "node:test";
const policyModulePath = "../src/lib/admin-user-policy." + "ts";
const {
  checkAdminUserMutationPolicy,
  isPrimaryAdminEmail,
} = await import(policyModulePath);

const base = {
  actorUserId: "actor",
  actorIsPrimaryAdmin: false,
  targetUserId: "target",
  targetEmail: "user@example.com",
  currentRole: "user" as const,
  nextRole: "user" as const,
  nextDisabled: false,
};

test("主管理员邮箱匹配忽略大小写与首尾空格", () => {
  assert.equal(isPrimaryAdminEmail(" RAYWANG6688@OUTLOOK.COM "), true);
  assert.equal(isPrimaryAdminEmail("other@example.com"), false);
});

test("主管理员不能被任何管理员停用或降级", () => {
  for (const change of [
    { nextDisabled: true, nextRole: "admin" as const },
    { nextDisabled: false, nextRole: "user" as const },
  ]) {
    const result = checkAdminUserMutationPolicy({
      ...base,
      actorIsPrimaryAdmin: true,
      targetEmail: "raywang6688@outlook.com",
      currentRole: "admin",
      ...change,
    });
    assert.equal(result.allowed, false);
    if (!result.allowed) assert.equal(result.code, "PRIMARY_ADMIN_PROTECTED");
  }
});

test("普通管理员不能提升、降级或停用管理员", () => {
  const attempts = [
    { currentRole: "user" as const, nextRole: "admin" as const, nextDisabled: false },
    { currentRole: "admin" as const, nextRole: "user" as const, nextDisabled: false },
    { currentRole: "admin" as const, nextRole: "admin" as const, nextDisabled: true },
  ];
  for (const attempt of attempts) {
    const result = checkAdminUserMutationPolicy({ ...base, ...attempt });
    assert.equal(result.allowed, false);
    if (!result.allowed) assert.equal(result.code, "PRIMARY_ADMIN_REQUIRED");
  }
});

test("主管理员可管理其他管理员，普通管理员仍可管理普通用户", () => {
  assert.deepEqual(checkAdminUserMutationPolicy({
    ...base,
    actorIsPrimaryAdmin: true,
    currentRole: "admin",
    nextRole: "user",
  }), { allowed: true });
  assert.deepEqual(checkAdminUserMutationPolicy({
    ...base,
    nextDisabled: true,
  }), { allowed: true });
});

test("管理员不能停用或降级自己", () => {
  const result = checkAdminUserMutationPolicy({
    ...base,
    actorUserId: "same",
    targetUserId: "same",
    currentRole: "admin",
    nextRole: "user",
  });
  assert.equal(result.allowed, false);
  if (!result.allowed) assert.equal(result.code, "ADMIN_SELF_PROTECTED");
});
