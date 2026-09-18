import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [page, sourceRoute, hub] = await Promise.all([
  readFile(new URL("../src/app/referrals/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/app/api/referrals/source/route.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/components/referrals/ReferralCodeHub.tsx", import.meta.url), "utf8"),
]);

test("内推码首屏不下载完整岗位库，上传时才读取岗位选项", () => {
  assert.doesNotMatch(page, /fetchActiveJobs|createPublicServerClient/);
  assert.match(page, /jobs=\{\[\]\}/);
  assert.match(hub, /fetchReferralJobs/);
  assert.match(hub, /getCachedReferralCodes/);
  assert.match(hub, /includeRemoteSources: false/);
  assert.match(hub, /准备上传/);
});

test("公开来源读取使用缓存、并发合并和有限超时", () => {
  assert.match(sourceRoute, /unstable_cache/);
  assert.match(sourceRoute, /AbortSignal\.timeout\(4500\)/);
  assert.match(sourceRoute, /pending \?\?= readSources\(\)/);
  assert.match(sourceRoute, /stale-while-revalidate/);
});
