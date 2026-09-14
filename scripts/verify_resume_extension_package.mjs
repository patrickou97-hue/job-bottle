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

console.log(`扩展安装包一致性通过：${manifest.version}，${expectedNames.length}/${expectedNames.length} 个文件与源码逐字节一致。`);
console.log("已移除旧版安装包归档；生产下载入口仅保留当前版本。");

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
