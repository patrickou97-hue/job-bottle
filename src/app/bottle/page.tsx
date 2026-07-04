import { MyBottleClient } from "@/components/applications/MyBottleClient";
import { PageShell } from "@/components/layout/PageShell";

export default function BottlePage() {
  return (
    <PageShell>
      <MyBottleClient loginNextPath="/bottle" />
    </PageShell>
  );
}
