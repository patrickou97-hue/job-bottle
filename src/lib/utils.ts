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

export function getCompanyShortLabel(companyName: string, maxLength = 3) {
  const cleanName = companyName
    .trim()
    .replace(/[（(].*?[）)]/g, "")
    .replace(/股份有限公司|有限责任公司|有限公司|集团|公司/g, "")
    .replace(/\s+/g, " ");

  if (!cleanName) return "星";

  const upperName = cleanName.toUpperCase();
  const knownLabels: Array<[RegExp, string]> = [
    [/\bBCG\b|BOSTON CONSULTING|波士顿咨询/i, "BCG"],
    [/京东|JD\b/i, "京东"],
    [/中国电信|电信/i, "电信"],
    [/中国移动|移动/i, "移动"],
    [/中国联通|联通/i, "联通"],
    [/阿里|淘天|淘宝|天猫/i, "阿里"],
    [/腾讯|TENCENT/i, "腾讯"],
    [/字节|BYTEDANCE|TIKTOK/i, "字节"],
    [/美团|MEITUAN/i, "美团"],
    [/小米|XIAOMI/i, "小米"],
    [/华为|HUAWEI/i, "华为"],
    [/百度|BAIDU/i, "百度"],
    [/网易|NETEASE/i, "网易"],
    [/拼多多|PDD/i, "拼多多"],
    [/快手|KUAISHOU/i, "快手"],
    [/米哈游|MIHOYO/i, "米哈游"],
    [/商汤|SENSETIME/i, "商汤"],
    [/蔚来|NIO/i, "蔚来"],
    [/理想|LI AUTO/i, "理想"],
    [/小鹏|XPENG/i, "小鹏"],
    [/宁德时代|CATL/i, "宁德"],
  ];

  const matched = knownLabels.find(([pattern]) => pattern.test(cleanName));
  if (matched) return matched[1].slice(0, maxLength);

  const chinese = cleanName.match(/[\u4e00-\u9fa5]+/g)?.join("");
  if (chinese) {
    const genericPrefixes = ["中国", "中华"];
    const withoutPrefix =
      genericPrefixes.find((prefix) => chinese.startsWith(prefix) && chinese.length > prefix.length)
        ? chinese.slice(2)
        : chinese;
    return withoutPrefix.slice(0, maxLength);
  }

  const asciiTokens = upperName.match(/[A-Z0-9]+/g) ?? [];
  const primaryToken = asciiTokens.find((token) => token.length >= 2) ?? asciiTokens[0];
  if (primaryToken) return primaryToken.slice(0, maxLength);

  return cleanName.slice(0, maxLength);
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
