import { GalaxyJobsClient } from "@/components/galaxy/GalaxyJobsClient";
import { PageShell } from "@/components/layout/PageShell";

export default async function RegionGalaxyDetailPage({
  params,
}: {
  params: Promise<{ region: string }>;
}) {
  const { region } = await params;
  return (
    <PageShell>
      <GalaxyJobsClient kind="region" slug={region} />
    </PageShell>
  );
}
