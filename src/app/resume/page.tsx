import type { Metadata } from "next";
import { UserShell } from "@/components/layout/UserShell";
import { ResumeBuilderClient } from "@/components/resume/ResumeBuilderClient";
import { createClient } from "@/lib/supabase/server";
import { fetchJobById } from "@/lib/jobs";

export const metadata: Metadata = {
  title: "简历制作",
  robots: { index: false, follow: false },
};

type ResumePageProps = {
  searchParams: Promise<{
    company?: string;
    job?: string;
    role?: string;
    action?: string;
  }>;
};

export default async function ResumePage({ searchParams }: ResumePageProps) {
  const params = await searchParams;
  let targetJob = params.job
    ? {
        company: params.company?.trim() || "目标公司",
        id: params.job,
        role: params.role?.trim() || "目标岗位",
        responsibilities: "",
        mustHave: "",
        preferredQualifications: "",
        keywords: [] as string[],
      }
    : null;
  if (targetJob) {
    try {
      const job = await fetchJobById(await createClient(), targetJob.id);
      if (job) targetJob = {
        ...targetJob,
        company: job.company_name,
        role: params.role?.trim() || job.job_titles || targetJob.role,
        responsibilities: job.responsibilities ?? "",
        mustHave: job.must_have ?? "",
        preferredQualifications: job.preferred_qualifications ?? "",
        keywords: job.keywords ?? [],
      };
    } catch {
      // Keep the route usable when target-job details are temporarily unavailable.
    }
  }
  const initialAction = params.action === "import" || params.action === "create"
    ? params.action
    : null;

  return (
    <UserShell>
      <ResumeBuilderClient targetJob={targetJob} initialAction={initialAction} />
    </UserShell>
  );
}
