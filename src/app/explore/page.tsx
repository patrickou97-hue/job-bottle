import { Suspense } from "react";
import { HomeClient } from "@/components/jobs/HomeClient";
import { PageShell } from "@/components/layout/PageShell";

export default function ExplorePage() {
  return (
    <PageShell>
      <Suspense fallback={<div className="empty-state"><span className="loading-line">正在加载岗位</span></div>}>
        <HomeClient />
      </Suspense>
    </PageShell>
  );
}
