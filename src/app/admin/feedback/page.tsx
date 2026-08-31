import type { Metadata } from "next";
import { AdminFeedbackClient } from "@/components/admin/AdminFeedbackClient";
import { AdminShell } from "@/components/layout/AdminShell";

export const metadata: Metadata = {
  title: "反馈管理",
  robots: { index: false, follow: false },
};

export default function AdminFeedbackPage() {
  return (
    <AdminShell>
      <AdminFeedbackClient />
    </AdminShell>
  );
}
