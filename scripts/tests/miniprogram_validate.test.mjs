import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import {
  collectClientSourceFiles,
  findServerSecretMarkers,
  scanClientSourceForSecrets,
} from "../../starjob-miniprogram/scripts/validate-project-lib.mjs";

const miniprogramRoot = path.resolve(
  import.meta.dirname,
  "../../starjob-miniprogram/miniprogram",
);

test("小程序密钥扫描递归覆盖页面、服务和配置源码", async () => {
  const files = await collectClientSourceFiles(miniprogramRoot);
  const relativeFiles = files.map((file) => path.relative(miniprogramRoot, file));

  assert.ok(relativeFiles.length >= 50, `只扫描到 ${relativeFiles.length} 个客户端源码文件`);
  assert.ok(relativeFiles.includes("app.ts"));
  assert.ok(relativeFiles.includes("services/request.ts"));
  assert.ok(relativeFiles.includes("pages/jobs/detail.ts"));
  assert.ok(relativeFiles.includes("pages/resumes/editor.ts"));
  assert.ok(relativeFiles.includes("custom-tab-bar/index.wxml"));
});

test("小程序密钥扫描识别所有受保护的服务端标识", () => {
  const source = [
    "SUPABASE_SERVICE_ROLE_KEY",
    "WECHAT_APP_SECRET",
    "OPENAI_API_KEY",
    "MIMO_API_KEY",
    "DEEPSEEK_API_KEY",
    "-----BEGIN PRIVATE KEY-----",
  ].join("\n");

  assert.deepEqual(findServerSecretMarkers(source), [
    "SUPABASE_SERVICE_ROLE_KEY",
    "WECHAT_APP_SECRET",
    "OPENAI_API_KEY",
    "MIMO_API_KEY",
    "DEEPSEEK_API_KEY",
    "private key",
  ]);
});

test("当前小程序完整客户端源码不包含服务端密钥标识", async () => {
  const result = await scanClientSourceForSecrets(miniprogramRoot);
  assert.deepEqual(result.findings, []);
});
