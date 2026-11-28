import { connection } from "next/server";
import { getDeepSeekModelId } from "@/lib/deepseek-config";
import type { Metadata } from "next";
import { UserShell } from "@/components/layout/UserShell";
import { VipPage } from "@/components/vip/VipPage";
import "./vip.css";

export const metadata: Metadata = {
  title: "StarJob VIP",
  description: "用零散笔记、实习材料和旧简历生成可编辑的求职简历。",
};

export default async function StarJobVipPage() {
  await connection();
  return <UserShell contentClassName="vip-route-shell"><VipPage basicModelId={getDeepSeekModelId()} /></UserShell>;
}
