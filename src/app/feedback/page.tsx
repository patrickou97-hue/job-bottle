import { FeedbackClient } from "@/components/feedback/FeedbackClient";
import { UserShell } from "@/components/layout/UserShell";

export default function FeedbackPage() {
  return (
    <UserShell>
      <FeedbackClient />
    </UserShell>
  );
}
