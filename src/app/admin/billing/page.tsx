import type { Metadata } from "next";
import { AdminBillingClient } from "@/components/admin/AdminBillingClient";

export const metadata: Metadata = { title: "诘星计费管理", robots: { index: false, follow: false } };

export default function AdminBillingPage() {
  return <AdminBillingClient />;
}
