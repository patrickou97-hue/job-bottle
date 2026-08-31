import type { Metadata } from "next";
import { AdminAnalyticsClient } from "@/components/admin/AdminAnalyticsClient";
import { AdminShell } from "@/components/layout/AdminShell";

export const metadata: Metadata = {
  title: "数据分析",
  robots: { index: false, follow: false },
};

export default function AdminAnalyticsPage() {
  return (
    <AdminShell>
      <AdminAnalyticsClient />
    </AdminShell>
  );
}
