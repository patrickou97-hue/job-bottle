import type { Metadata } from "next";
import { MyBottleClient } from "@/components/applications/MyBottleClient";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "我的星瓶",
  robots: { index: false, follow: false },
};

export default function BottlePage() {
  return (
    <PageShell variant="scene">
      <MyBottleClient loginNextPath="/bottle" />
    </PageShell>
  );
}
