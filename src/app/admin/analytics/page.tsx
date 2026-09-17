import type { Metadata } from "next";
import { AdminAnalyticsClient } from "@/components/admin/AdminAnalyticsClient";

export const metadata: Metadata = {
  title: "数据分析",
  robots: { index: false, follow: false },
};

export default function AdminAnalyticsPage() {
  return <AdminAnalyticsClient />;
}
