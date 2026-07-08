import { UserShell } from "@/components/layout/UserShell";
import { ResumeBuilderClient } from "@/components/resume/ResumeBuilderClient";

export default function ResumePage() {
  return (
    <UserShell>
      <ResumeBuilderClient />
    </UserShell>
  );
}
