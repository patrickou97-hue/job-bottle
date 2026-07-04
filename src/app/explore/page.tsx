import { Suspense } from "react";
import { HomeClient } from "@/components/jobs/HomeClient";
import { PageShell } from "@/components/layout/PageShell";

export default function ExplorePage() {
  return (
    <PageShell>
      <Suspense fallback={<div className="surface-subtle rounded-xl p-8 text-center text-sm text-ink-secondary">加载中...</div>}>
        <HomeClient />
      </Suspense>
    </PageShell>
  );
}
