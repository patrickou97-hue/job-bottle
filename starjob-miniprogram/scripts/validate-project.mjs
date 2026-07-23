import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const miniprogramRoot = path.join(root, "miniprogram");
const appJsonPath = path.join(miniprogramRoot, "app.json");
const appConfig = JSON.parse(await readFile(appJsonPath, "utf8"));

const failures = [];

for (const page of appConfig.pages ?? []) {
  for (const extension of [".ts", ".json", ".wxml", ".wxss"]) {
    const file = path.join(miniprogramRoot, `${page}${extension}`);
    try {
      await stat(file);
    } catch {
      failures.push(`缺少页面文件：${path.relative(root, file)}`);
    }
  }
}

const sourceFiles = [
  "miniprogram/app.ts",
  "miniprogram/config/env.ts",
  "miniprogram/services/auth.ts",
  "miniprogram/services/request.ts",
  "miniprogram/services/session.ts",
  "miniprogram/pages/login/index.ts",
];

const secretPatterns = [
  /SUPABASE_SERVICE_ROLE_KEY/u,
  /WECHAT_APP_SECRET/u,
  /OPENAI_API_KEY/u,
  /MIMO_API_KEY/u,
  /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/u,
];

for (const relativePath of sourceFiles) {
  const content = await readFile(path.join(root, relativePath), "utf8");
  for (const pattern of secretPatterns) {
    if (pattern.test(content)) {
      failures.push(`客户端文件包含服务端密钥标识：${relativePath}`);
    }
  }
}

const requestSource = await readFile(
  path.join(root, "miniprogram/services/request.ts"),
  "utf8",
);
if (!requestSource.includes('"PUT"')) {
  failures.push("请求层没有声明微信兼容的 PUT 更新方法。");
}
if (requestSource.includes('"PATCH"')) {
  failures.push("请求层仍包含微信 wx.request 不支持的 PATCH 方法。");
}

const progressPath = path.join(root, "MINIPROGRAM_PROGRESS.md");
try {
  await stat(progressPath);
} catch {
  failures.push("缺少独立进度文档 MINIPROGRAM_PROGRESS.md。");
}

if (failures.length) {
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `项目结构验证通过：${appConfig.pages.length} 个页面，未发现客户端密钥标识。`,
  );
}
