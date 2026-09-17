import type { Metadata } from "next";
import { AdminFeedbackClient } from "@/components/admin/AdminFeedbackClient";

export const metadata: Metadata = {
  title: "反馈管理",
  robots: { index: false, follow: false },
};

export default function AdminFeedbackPage() {
  return <AdminFeedbackClient />;
}
