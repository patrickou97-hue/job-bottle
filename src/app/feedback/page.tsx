import type { Metadata } from "next";
import { FeedbackClient } from "@/components/feedback/FeedbackClient";
import { UserShell } from "@/components/layout/UserShell";

export const metadata: Metadata = {
  title: "帮助与反馈",
  robots: { index: false, follow: false },
};

export default function FeedbackPage() {
  return (
    <UserShell>
      <FeedbackClient />
    </UserShell>
  );
}
