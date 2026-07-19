import type { Metadata } from "next";
import { UserShell } from "@/components/layout/UserShell";
import { ResumeBuilderClient } from "@/components/resume/ResumeBuilderClient";

export const metadata: Metadata = {
  title: "简历制作",
  robots: { index: false, follow: false },
};

type ResumePageProps = {
  searchParams: Promise<{
    company?: string;
    job?: string;
    role?: string;
  }>;
};

export default async function ResumePage({ searchParams }: ResumePageProps) {
  const params = await searchParams;
  const targetJob = params.job
    ? {
        company: params.company?.trim() || "目标公司",
        id: params.job,
        role: params.role?.trim() || "目标岗位",
      }
    : null;

  return (
    <UserShell>
      <ResumeBuilderClient targetJob={targetJob} />
    </UserShell>
  );
}
