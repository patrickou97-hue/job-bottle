import type { Metadata } from "next";
import { AdminBillingClient } from "@/components/admin/AdminBillingClient";
import { AdminShell } from "@/components/layout/AdminShell";

export const metadata: Metadata = { title: "诘星计费管理", robots: { index: false, follow: false } };

export default function AdminBillingPage() {
  return (
    <AdminShell>
      <AdminBillingClient />
    </AdminShell>
  );
}
