import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [route, client, adminPage, publicRoute, feedbackServer] = await Promise.all([
  readFile(new URL("../src/app/api/admin/feedback/route.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/lib/admin-feedback.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/components/admin/AdminFeedbackClient.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/app/api/feedback/route.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/lib/feedback-server.ts", import.meta.url), "utf8"),
]);

test("反馈解决操作只存在于管理员鉴权链路", () => {
  assert.match(route, /export async function PATCH/);
  assert.match(route, /const access = await requireAdminAccess\(\)/);
  assert.match(route, /access\.supabase[\s\S]*\.update\(\{ resolved_at:/);
  assert.match(route, /\.is\("resolved_at", null\)/);
  assert.match(client, /method: "PATCH"/);
  assert.match(adminPage, /解决反馈/);
});

test("普通用户反馈接口不暴露解决状态", () => {
  assert.doesNotMatch(publicRoute, /resolved_at|resolvedAt/);
  assert.doesNotMatch(feedbackServer, /resolved_at|resolvedAt/);
});
