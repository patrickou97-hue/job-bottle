import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { scanClientSourceForSecrets } from "./validate-project-lib.mjs";

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

const secretScan = await scanClientSourceForSecrets(miniprogramRoot);
for (const finding of secretScan.findings) {
  failures.push(
    `客户端文件包含服务端密钥标识 ${finding.marker}：${path.relative(root, finding.file)}`,
  );
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
    `项目结构验证通过：${appConfig.pages.length} 个页面，递归扫描 ${secretScan.files.length} 个客户端源码文件，未发现服务端密钥标识。`,
  );
}
