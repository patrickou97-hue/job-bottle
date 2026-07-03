import { GalaxyJobsClient } from "@/components/galaxy/GalaxyJobsClient";
import { PageShell } from "@/components/layout/PageShell";

export default async function IndustryGalaxyDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  return (
    <PageShell>
      <GalaxyJobsClient kind="industry" slug={name} />
    </PageShell>
  );
}
