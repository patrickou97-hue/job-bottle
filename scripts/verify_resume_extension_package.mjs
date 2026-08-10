import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE_DIRECTORY = path.join(ROOT, "browser-extension", "starjob-resume-assistant");
const manifest = JSON.parse(await readFile(path.join(SOURCE_DIRECTORY, "manifest.json"), "utf8"));
const publicArchivePath = path.join(ROOT, "public", "downloads", `starjob-resume-assistant-v${manifest.version}.zip`);
const shareArchivePath = path.join(ROOT, "dist", `拾星网申助手-v${manifest.version}.zip`);

const [publicArchive, shareArchive, sourceFiles] = await Promise.all([
  readFile(publicArchivePath),
  readFile(shareArchivePath),
  collectFiles(SOURCE_DIRECTORY),
]);
assert.ok(publicArchive.equals(shareArchive), "官网安装包与 dist 分享副本内容不一致");

const entries = parseStoredZip(publicArchive);
const expectedNames = sourceFiles
  .map(({ relative }) => `starjob-resume-assistant/${relative}`)
  .sort();
assert.deepEqual([...entries.keys()].sort(), expectedNames, "安装包文件清单与当前扩展源码不一致");
for (const file of sourceFiles) {
  const name = `starjob-resume-assistant/${file.relative}`;
  assert.ok(entries.get(name)?.equals(await readFile(file.absolute)), `安装包文件不是当前源码：${name}`);
}

const legacyArchive = parseStoredZip(
  await readFile(path.join(ROOT, "public", "downloads", "starjob-resume-assistant-v0.2.5.zip")),
);
const legacyManifest = JSON.parse(readArchiveText(legacyArchive, "starjob-resume-assistant/manifest.json"));
const legacyPopup = readArchiveText(legacyArchive, "starjob-resume-assistant/popup.js");
assert.equal(legacyManifest.version, "0.2.5", "0.2.5 兼容归档版本号异常");
assert.match(legacyPopup, /JSON\.stringify\(\{ resume, fields: batch \}\)/, "0.2.5 归档载荷不再符合旧请求契约");
assert.doesNotMatch(legacyPopup, /operationId/, "0.2.5 归档不应依赖新版 operationId");

console.log(`扩展安装包一致性通过：${manifest.version}，${expectedNames.length}/${expectedNames.length} 个文件与源码逐字节一致。`);
console.log("旧版兼容载荷通过：0.2.5 继续使用不含 operationId 的 { resume, fields } 请求。");

async function collectFiles(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (entry.name === ".DS_Store") continue;
    const absolute = path.join(directory, entry.name);
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(absolute, relative));
    else if (entry.isFile()) files.push({ absolute, relative });
  }
  return files;
}

function parseStoredZip(archive) {
  const entries = new Map();
  for (let offset = 0; offset + 4 <= archive.length;) {
    const signature = archive.readUInt32LE(offset);
    if (signature === 0x02014b50 || signature === 0x06054b50) break;
    assert.equal(signature, 0x04034b50, `ZIP 本地文件头无效：offset ${offset}`);
    const flags = archive.readUInt16LE(offset + 6);
    const method = archive.readUInt16LE(offset + 8);
    const compressedSize = archive.readUInt32LE(offset + 18);
    const uncompressedSize = archive.readUInt32LE(offset + 22);
    const nameLength = archive.readUInt16LE(offset + 26);
    const extraLength = archive.readUInt16LE(offset + 28);
    assert.equal(flags & 0x0008, 0, "ZIP 使用了未支持的数据描述符");
    assert.equal(method, 0, "扩展安装包必须使用可审计的 store 模式");
    assert.equal(compressedSize, uncompressedSize, "store 模式文件大小异常");
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const dataEnd = dataStart + compressedSize;
    assert.ok(dataEnd <= archive.length, "ZIP 文件内容被截断");
    const name = archive.toString("utf8", nameStart, nameStart + nameLength);
    assert.ok(!entries.has(name), `ZIP 内存在重复文件：${name}`);
    entries.set(name, archive.subarray(dataStart, dataEnd));
    offset = dataEnd;
  }
  assert.ok(entries.size > 0, "ZIP 内没有文件");
  return entries;
}

function readArchiveText(entries, name) {
  const value = entries.get(name);
  assert.ok(value, `ZIP 缺少文件：${name}`);
  return value.toString("utf8");
}
