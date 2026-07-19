import type { Metadata } from "next";
import { Suspense } from "react";
import { HomeClient } from "@/components/jobs/HomeClient";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "校招岗位探索",
  description: "集中查看当前有效的校招岗位，按公司、方向、地点和批次寻找适合自己的机会。",
  alternates: { canonical: "/explore" },
};

export default function ExplorePage() {
  return (
    <PageShell>
      <Suspense fallback={<div className="empty-state"><span className="loading-line">正在加载岗位</span></div>}>
        <HomeClient />
      </Suspense>
    </PageShell>
  );
}
