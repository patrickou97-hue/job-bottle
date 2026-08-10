import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const smokeSource = await readFile(
  new URL("../smoke_check.mjs", import.meta.url),
  "utf8",
);

function functionSource(name, nextName) {
  const start = smokeSource.indexOf(`function ${name}`);
  const asyncStart = smokeSource.indexOf(`async function ${name}`);
  const actualStart = start >= 0 ? start : asyncStart;
  assert.ok(actualStart >= 0, `缺少函数 ${name}`);
  const endCandidates = [
    smokeSource.indexOf(`\nfunction ${nextName}`, actualStart + 1),
    smokeSource.indexOf(`\nasync function ${nextName}`, actualStart + 1),
  ].filter((index) => index >= 0);
  assert.ok(endCandidates.length > 0, `缺少后续函数 ${nextName}`);
  return smokeSource.slice(actualStart, Math.min(...endCandidates));
}

test("默认 smoke 不再创建 Supabase 客户端或执行安全写探针", () => {
  assert.doesNotMatch(smokeSource, /from "@supabase\/supabase-js"/u);
  assert.doesNotMatch(smokeSource, /checkSecurityProbe/u);
  assert.doesNotMatch(smokeSource, /signInWithPassword/u);

  const coverage = functionSource("reportSecurityCoverage", "checkSourceInvariants");
  assert.match(coverage, /默认 smoke 严格只读/u);
  assert.match(coverage, /未验证/u);
  assert.doesNotMatch(coverage, /\.(?:insert|update|upsert|delete|upload)\s*\(/u);
});

test("Supabase 冒烟探针只发起公开岗位 GET 读取", () => {
  const probe = functionSource("checkSupabase", "reportSecurityCoverage");
  assert.match(probe, /\/rest\/v1\/jobs/u);
  assert.match(probe, /select=id/u);
  assert.doesNotMatch(probe, /method\s*:/u);
  assert.doesNotMatch(probe, /\.(?:insert|update|upsert|delete|upload)\s*\(/u);
});

test("页面冒烟始终启动随机端口的当前独立 dev server", () => {
  assert.doesNotMatch(smokeSource, /findReusableServer|SMOKE_BASE_URL/u);
  assert.match(smokeSource, /const runId = randomUUID\(\)/u);
  assert.match(smokeSource, /\["dev", "--hostname", "127\.0\.0\.1", "--port", String\(port\)\]/u);
  assert.match(smokeSource, /WATCHPACK_POLLING: "true"/u);
  assert.match(smokeSource, /未复用 3000\/3001 上的未知进程/u);
});
