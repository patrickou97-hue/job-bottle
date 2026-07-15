import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE_DIR = path.join(ROOT, "browser-extension", "starjob-resume-assistant");
const OUTPUT_DIR = path.join(ROOT, "dist", "starjob-resume-assistant-local");
const LOCAL_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"];

await rm(OUTPUT_DIR, { recursive: true, force: true });
await mkdir(path.dirname(OUTPUT_DIR), { recursive: true });
await cp(SOURCE_DIR, OUTPUT_DIR, { recursive: true });

const manifestPath = path.join(OUTPUT_DIR, "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
manifest.name = `${manifest.name}（本地测试）`;
manifest.action.default_title = manifest.name;
manifest.content_scripts[0].matches.push(
  "http://localhost/extension*",
  "http://127.0.0.1/extension*",
);
manifest.host_permissions.push("http://localhost/*", "http://127.0.0.1/*");
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

const bridgePath = path.join(OUTPUT_DIR, "sync-bridge.js");
const bridgeSource = await readFile(bridgePath, "utf8");
const productionOriginSet = "new Set([\"https://www.starjob.space\", \"https://starjob.space\"])";
const developmentOriginSet = `new Set(${JSON.stringify([
  "https://www.starjob.space",
  "https://starjob.space",
  ...LOCAL_ORIGINS,
])})`;
if (!bridgeSource.includes(productionOriginSet)) throw new Error("无法定位同步桥的生产来源白名单。");
await writeFile(bridgePath, bridgeSource.replace(productionOriginSet, developmentOriginSet));

const popupPath = path.join(OUTPUT_DIR, "popup.js");
const popupSource = await readFile(popupPath, "utf8");
if (!popupSource.includes('const STARJOB_HOME = "https://www.starjob.space";')) {
  throw new Error("无法定位扩展的生产站点地址。");
}
await writeFile(
  popupPath,
  popupSource.replace(
    'const STARJOB_HOME = "https://www.starjob.space";',
    'const STARJOB_HOME = "http://localhost:3000";',
  ),
);

await writeFile(
  path.join(OUTPUT_DIR, "LOCAL-TEST.txt"),
  [
    "拾星网申助手本地测试版",
    "",
    "1. 保持 http://localhost:3000 正在运行。",
    "2. 打开 chrome://extensions 并启用开发者模式。",
    "3. 点击加载已解压的扩展程序，选择本目录。",
    "4. 打开 http://localhost:3000/extension 并同步简历。",
    "",
    "本目录仅用于本地测试，不要上传百度网盘或作为正式发布包。",
  ].join("\n"),
);

console.log(`Local extension directory: ${path.relative(ROOT, OUTPUT_DIR)}`);
console.log(`Allowed local origins: ${LOCAL_ORIGINS.join(", ")}`);
