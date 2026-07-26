import type { Metadata } from "next";
import { Suspense } from "react";
import { HomeClient } from "@/components/jobs/HomeClient";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "岗位坐标",
  description: "汇集当前开放的校招岗位，可按公司、方向、地点与批次筛选，找到值得进一步了解的机会。",
  alternates: { canonical: "/explore" },
};

export default function ExplorePage() {
  return (
    <PageShell>
      <Suspense fallback={<div className="empty-state"><span className="loading-line">正在整理岗位</span></div>}>
        <HomeClient />
      </Suspense>
    </PageShell>
  );
}
