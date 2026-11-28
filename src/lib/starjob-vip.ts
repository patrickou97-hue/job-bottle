export const VIP_PRICE_FEN = 6590;
export const VIP_PRICE = String(VIP_PRICE_FEN / 100);
export const VIP_COMPOSE_DAILY_LIMIT = 3;
export const VIP_COMPOSE_WEEKLY_LIMIT = 10;
export const BASIC_POLISH_HOURLY_LIMIT = 5;
export const BASIC_POLISH_WEEKLY_LIMIT = 30;
export const VIP_BASIC_POLISH_HOURLY_LIMIT = 20;
export const VIP_BASIC_POLISH_WEEKLY_LIMIT = 100;
export const VIP_ADVANCED_HOURLY_LIMIT = 8;
export const VIP_ADVANCED_WEEKLY_LIMIT = 40;
export const VIP_MAX_MATERIAL_LENGTH = 12_000;
export const VIP_STATUS_EVENT = "starjob:vip:status";
export const VIP_FLASH_LABEL = "基础模型";
export const VIP_ADVANCED_MODEL = { id: "gpt-6.2-astra", name: "GPT-6.2 Astra" } as const;
export const VIP_ASTRA_LABEL = "高级模型";

export type VipUsageKind = "compose" | "advanced" | "flash";
export type VipStatus = {
  unlimited?: boolean;
  active: boolean;
  plan: "free_launch" | "full" | null;
  advancedAvailable: boolean;
  composeRemaining: number;
  composeWeeklyRemaining: number;
  basicHourlyRemaining: number;
  basicWeeklyRemaining: number;
  advancedHourlyRemaining: number;
  advancedWeeklyRemaining: number;
  composeResetAt: string | null;
  advancedHourlyResetAt: string | null;
  weeklyResetAt: string | null;
  preview: boolean;
  composeLive: boolean;
  signedIn: boolean;
  checkoutAvailable: boolean;
};

export const VIP_COMPOSE_SECTIONS = [
  ["all", "整份简历"],
  ["education", "教育经历"],
  ["work", "实习与工作"],
  ["projects", "项目经历"],
  ["skills", "专业技能"],
  ["campus", "校园经历"],
  ["awards", "荣誉奖项"],
  ["certifications", "证书"],
  ["languages", "语言能力"],
  ["customSections", "其他经历"],
] as const;

export type VipComposeSection = typeof VIP_COMPOSE_SECTIONS[number][0];
export const VIP_COMPOSE_SECTION_KEYS = VIP_COMPOSE_SECTIONS.map(([key]) => key);

export function formatVipReset(value: string | null) {
  return value ? new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai", weekday: "short", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value)) : null;
}
