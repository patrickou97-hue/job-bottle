import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE_DIR = path.join(ROOT, "browser-extension", "starjob-resume-assistant");
const PUBLIC_OUTPUT = path.join(ROOT, "public", "downloads", "starjob-resume-assistant-v0.1.8.zip");
const SHARE_OUTPUT = path.join(ROOT, "dist", "拾星网申助手-v0.1.8.zip");
const REQUIRED_FILES = [
  "manifest.json",
  "popup.html",
  "popup.css",
  "popup.js",
  "sync-bridge.js",
  "fill.js",
  "assets/icon16.png",
  "assets/icon48.png",
  "assets/icon128.png",
  "assets/wordmark.png",
];

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

function dosTimestamp(date) {
  const year = Math.max(1980, date.getFullYear());
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

async function collectFiles(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name === ".DS_Store") continue;
    const absolute = path.join(directory, entry.name);
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(absolute, relative));
    else files.push({ absolute, relative });
  }
  return files;
}

async function createZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const data = await readFile(file.absolute);
    const info = await stat(file.absolute);
    const filename = Buffer.from(`starjob-resume-assistant/${file.relative}`, "utf8");
    const checksum = crc32(data);
    const { time, day } = dosTimestamp(info.mtime);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(time, 10);
    localHeader.writeUInt16LE(day, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(filename.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localParts.push(localHeader, filename, data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(time, 12);
    centralHeader.writeUInt16LE(day, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(filename.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, filename);

    offset += localHeader.length + filename.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

for (const required of REQUIRED_FILES) {
  await stat(path.join(SOURCE_DIR, required));
}

const manifest = JSON.parse(await readFile(path.join(SOURCE_DIR, "manifest.json"), "utf8"));
if (manifest.manifest_version !== 3) throw new Error("扩展必须使用 Manifest V3。");
if (manifest.permissions.includes("cookies") || manifest.permissions.includes("tabs")) {
  throw new Error("扩展权限超出当前安全边界。");
}

const files = await collectFiles(SOURCE_DIR);
const archive = await createZip(files);
await mkdir(path.dirname(PUBLIC_OUTPUT), { recursive: true });
await mkdir(path.dirname(SHARE_OUTPUT), { recursive: true });
await writeFile(PUBLIC_OUTPUT, archive);
await writeFile(SHARE_OUTPUT, archive);

console.log(`Extension package: ${path.relative(ROOT, PUBLIC_OUTPUT)} (${archive.length} bytes)`);
console.log(`Baidu Netdisk upload copy: ${path.relative(ROOT, SHARE_OUTPUT)}`);
