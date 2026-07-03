import { MyApplicationsClient } from "@/components/applications/MyApplicationsClient";
import { PageShell } from "@/components/layout/PageShell";

export default function MyApplicationsPage() {
  return (
    <PageShell>
      <MyApplicationsClient />
    </PageShell>
  );
}
