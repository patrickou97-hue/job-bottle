import type { Metadata } from "next";
import { MyApplicationsClient } from "@/components/applications/MyApplicationsClient";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "我的投递",
  robots: { index: false, follow: false },
};

export default function MyPage() {
  return (
    <PageShell>
      <MyApplicationsClient loginNextPath="/my" />
    </PageShell>
  );
}
