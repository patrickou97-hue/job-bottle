import { readdir, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const GENERATED_TYPE_DIRECTORIES = [
  path.resolve(".next/types"),
  path.resolve(".next/dev/types"),
];

export async function removeIdenticalGeneratedTypeCopies(directories = GENERATED_TYPE_DIRECTORIES) {
  const removed = [];
  for (const directory of directories) {
    for (const candidate of await listFiles(directory)) {
      const match = path.basename(candidate).match(/^(.*) \d+(\.ts)$/);
      if (!match) continue;
      const canonical = path.join(path.dirname(candidate), `${match[1]}${match[2]}`);
      let [candidateBytes, canonicalBytes] = await Promise.all([
        readFile(candidate),
        readFile(canonical).catch(() => null),
      ]);
      if (!canonicalBytes) {
        throw new Error(`发现没有正本的生成类型副本，拒绝自动删除：${candidate}`);
      }
      if (!candidateBytes.equals(canonicalBytes)) {
        throw new Error(`生成类型副本与正本内容不同，拒绝自动删除：${candidate}`);
      }
      await unlink(candidate);
      removed.push(candidate);
      candidateBytes = null;
      canonicalBytes = null;
    }
  }
  return removed;
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true }).catch((error) => {
    if (error?.code === "ENOENT") return [];
    throw error;
  });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const removed = await removeIdenticalGeneratedTypeCopies();
  if (removed.length) {
    console.log(`已清理 ${removed.length} 个与正本完全一致的 .next 数字后缀类型副本。`);
  }
}
