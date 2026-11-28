import { Activity, Coins, Database, KeyRound, MessageSquareText, Rows3, Settings, Users, type LucideIcon } from "lucide-react";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  description?: string;
};

const primaryNavItems: AdminNavItem[] = [
  { href: "/admin", label: "总览", icon: Settings },
  { href: "/admin/analytics", label: "数据分析", description: "查看用户增长、投递和功能使用趋势", icon: Activity },
  { href: "/admin/feedback", label: "反馈管理", description: "搜索反馈，处理待跟进问题", icon: MessageSquareText },
  { href: "/admin/jobs", label: "岗位管理", description: "新增、编辑和核查重复岗位", icon: Rows3 },
  { href: "/admin/users", label: "用户管理", description: "管理账号、会员资格及收藏卡面", icon: Users },
];

const utilityNavItems: AdminNavItem[] = [
  { href: "/admin/referrals", label: "内推码", description: "审核举报和社区内推码", icon: KeyRound },
  { href: "/admin/import", label: "批量导入", description: "从 CSV 或 Excel 更新岗位库", icon: Database },
  { href: "/admin/billing", label: "诘星计费", description: "查询余额、额度及账本", icon: Coins },
];

export const navGroups: Array<{ label: string; items: AdminNavItem[] }> = [
  { label: "核心运营", items: primaryNavItems.slice(0, 2) },
  { label: "内容与用户", items: primaryNavItems.slice(2) },
  { label: "运营工具", items: utilityNavItems },
];
