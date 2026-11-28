import { Suspense } from "react";
import type { Metadata } from "next";
import { UserShell } from "@/components/layout/UserShell";
import { VipWorkbench } from "@/components/vip/VipWorkbench";
import "./materials.css";

export const metadata: Metadata = {
  title: "材料生成简历",
  robots: { index: false, follow: false },
};

export default function ResumeMaterialsPage() {
  return <UserShell><Suspense fallback={<p role="status">正在加载简历工作台…</p>}><VipWorkbench /></Suspense></UserShell>;
}
