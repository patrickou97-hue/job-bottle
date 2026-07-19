import type { Metadata } from "next";
import { JobSearchGuide } from "@/components/guide/JobSearchGuide";
import { UserShell } from "@/components/layout/UserShell";

export const metadata: Metadata = {
  title: "秋招求职指南",
  description: "了解如何发现岗位、加入星瓶、管理投递进度并完成校招准备。",
  alternates: { canonical: "/guide" },
};

export default function GuidePage() {
  return (
    <UserShell>
      <JobSearchGuide />
    </UserShell>
  );
}
