import { JobSearchGuide } from "@/components/guide/JobSearchGuide";
import { UserShell } from "@/components/layout/UserShell";

export default function GuidePage() {
  return (
    <UserShell>
      <JobSearchGuide />
    </UserShell>
  );
}
