import { OpportunityDetailPanel } from "@/components/opportunity/OpportunityDetailPanel";
import type { Job, UserApplication } from "@/lib/types";

export function NebulaDetailWindow({
  job,
  application,
  onApply,
}: {
  job: Job | null;
  application?: UserApplication | null;
  onApply: (job: Job) => void | Promise<void>;
}) {
  return <OpportunityDetailPanel job={job} application={application} onApply={onApply} />;
}
