import type { Metadata } from "next";
import { AdminJobsClient } from "@/components/admin/AdminJobsClient";

export const metadata: Metadata = {
  title: "岗位管理",
  robots: { index: false, follow: false },
};

export default function AdminJobsPage() {
  return <AdminJobsClient />;
}
