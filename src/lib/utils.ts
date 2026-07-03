export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function getCompanyInitials(companyName: string) {
  const cleanName = companyName.trim();
  if (!cleanName) return "星";
  const ascii = cleanName.match(/[A-Za-z0-9]+/g)?.join("");
  if (ascii && ascii.length >= 2) return ascii.slice(0, 2).toUpperCase();
  return cleanName.slice(0, Math.min(2, cleanName.length));
}

export function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function formatDateTime(value?: string | null) {
  if (!value) return "暂无";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function getBottlePosition(id: string): { x: number; y: number } {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }

  const x = 18 + (hash % 65);
  const y = 28 + ((hash >>> 8) % 58);
  return { x, y };
}

export function splitToTags(...values: Array<string | null | undefined>) {
  const tokens = values
    .flatMap((value) =>
      (value ?? "")
        .split(/[,，、/|｜\s]+/g)
        .map((item) => item.trim())
        .filter(Boolean),
    )
    .filter((item) => item.length <= 16);

  return Array.from(new Set(tokens)).slice(0, 18);
}

export function normalizeTagsInput(value: string) {
  return splitToTags(value);
}

export function safeOpenUrl(url: string) {
  if (!isValidHttpUrl(url)) return false;
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  return Boolean(opened);
}
