import { MyApplicationsClient } from "@/components/applications/MyApplicationsClient";
import { PageShell } from "@/components/layout/PageShell";

export default function MyPage() {
  return (
    <PageShell>
      <MyApplicationsClient loginNextPath="/my" />
    </PageShell>
  );
}
