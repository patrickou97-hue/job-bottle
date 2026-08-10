import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export const CLIENT_SOURCE_EXTENSIONS = new Set([
  ".js",
  ".json",
  ".ts",
  ".wxml",
  ".wxss",
]);

export const SERVER_SECRET_PATTERNS = [
  { label: "SUPABASE_SERVICE_ROLE_KEY", pattern: /SUPABASE_SERVICE_ROLE_KEY/u },
  { label: "WECHAT_APP_SECRET", pattern: /WECHAT_APP_SECRET/u },
  { label: "OPENAI_API_KEY", pattern: /OPENAI_API_KEY/u },
  { label: "MIMO_API_KEY", pattern: /MIMO_API_KEY/u },
  { label: "DEEPSEEK_API_KEY", pattern: /DEEPSEEK_API_KEY/u },
  { label: "private key", pattern: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/u },
];

export async function collectClientSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectClientSourceFiles(absolute));
      continue;
    }
    if (entry.isFile() && CLIENT_SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(absolute);
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

export function findServerSecretMarkers(content) {
  return SERVER_SECRET_PATTERNS
    .filter(({ pattern }) => pattern.test(content))
    .map(({ label }) => label);
}

export async function scanClientSourceForSecrets(miniprogramRoot) {
  const files = await collectClientSourceFiles(miniprogramRoot);
  const findings = [];

  for (const file of files) {
    const content = await readFile(file, "utf8");
    for (const marker of findServerSecretMarkers(content)) {
      findings.push({ file, marker });
    }
  }

  return { files, findings };
}
