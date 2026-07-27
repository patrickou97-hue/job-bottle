import type { Metadata } from "next";
import { UserShell } from "@/components/layout/UserShell";
import { StarInterviewBillingClient } from "@/components/billing/StarInterviewBillingClient";

export const metadata: Metadata = {
  title: "诘星余额与账单",
  robots: { index: false, follow: false },
};

export default function BillingPage() {
  return (
    <UserShell>
      <StarInterviewBillingClient />
    </UserShell>
  );
}
