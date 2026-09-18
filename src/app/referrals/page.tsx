import type { Metadata } from "next";
import { ReferralPlazaClient } from "@/components/referrals/ReferralCodeHub";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "内推码广场",
  description: "按公司查看社区分享的内推码，使用前请自行核验来源与风险。",
  robots: { index: false, follow: false },
};

export default async function ReferralPlazaPage({ searchParams }: { searchParams: Promise<{ company?: string }> }) {
  const { company = "" } = await searchParams;
  return <PageShell><ReferralPlazaClient initialUserId={null} initialCompany={company} jobs={[]} /></PageShell>;
}
