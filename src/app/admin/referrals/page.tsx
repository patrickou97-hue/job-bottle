import type { Metadata } from "next";
import { AdminReferralsClient } from "@/components/admin/AdminReferralsClient";

export const metadata: Metadata = {
  title: "内推码管理",
  robots: { index: false, follow: false },
};

export default function AdminReferralsPage() {
  return <AdminReferralsClient />;
}
