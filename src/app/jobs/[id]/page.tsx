import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, ExternalLink, MapPin } from "lucide-react";
import { JobDetailActions } from "@/components/jobs/JobDetailActions";
import { CompanyBadge } from "@/components/jobs/CompanyBadge";
import { DeadlineChip } from "@/components/jobs/DeadlineChip";
import { PageShell } from "@/components/layout/PageShell";
import { formatShanghaiDateTime } from "@/lib/dates";
import { fetchJobById, fetchRelatedJobs } from "@/lib/jobs";
import { createClient } from "@/lib/supabase/server";
import type { Job, UserApplication } from "@/lib/types";

type JobDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: JobDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const job = await fetchJobById(supabase, id);
  if (!job) return { title: "岗位详情 | 秋招星瓶" };
  return {
    title: `${job.company_name} ${job.job_titles || "岗位"} | 秋招星瓶`,
    description: [job.company_name, job.job_titles, job.locations, job.batch_type].filter(Boolean).join(" · "),
  };
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const job = await fetchJobById(supabase, id);
  if (!job) notFound();

  const [{ data: auth }, related] = await Promise.all([
    supabase.auth.getUser(),
    fetchRelatedJobs(supabase, job),
  ]);
  const userId = auth.user?.id;
  const application = userId ? await fetchApplicationForJob(supabase, userId, job.id) : null;

  return (
    <PageShell>
      <main className="mx-auto max-w-5xl space-y-6 pb-24">
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 text-sm text-ink-muted transition hover:text-nebula-silver"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          返回探索星海
        </Link>

        <section className="surface-readable overflow-hidden rounded-[28px] p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 gap-4">
              <CompanyBadge companyName={job.company_name} logoUrl={job.logo_url} size="lg" />
              <div className="min-w-0">
                <p className="text-sm text-ink-muted">星球详情</p>
                <h1 className="mt-1 text-2xl font-semibold leading-9 text-ink-primary sm:text-3xl">
                  {job.company_name}
                </h1>
                <p className="mt-2 max-w-2xl text-base leading-7 text-nebula-silver">
                  {job.job_titles || "岗位待补充"}
                </p>
              </div>
            </div>
            <a
              href={job.apply_url}
              target="_blank"
              rel="noreferrer"
              className="muted-button inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full px-4 text-sm"
            >
              <ExternalLink aria-hidden="true" className="size-4" />
              官网
            </a>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <MetaItem label="城市 / base" value={job.locations || "地点待补充"} />
            <MetaItem label="行业" value={job.industry || "暂无行业"} />
            <MetaItem label="批次" value={job.batch_type || "暂无批次"} />
            <MetaItem label="开启时间" value={job.opens_at ? formatShanghaiDateTime(job.opens_at) : job.start_date || "暂无"} />
            <div className="rounded-[18px] border border-white/[0.06] bg-white/[0.025] p-4">
              <dt className="text-xs text-ink-muted">截止时间</dt>
              <dd className="mt-2">
                <DeadlineChip job={job} />
              </dd>
            </div>
          </div>

          {job.notes ? (
            <div className="mt-7 rounded-[22px] border border-white/[0.06] bg-white/[0.025] p-4">
              <h2 className="text-sm font-medium text-ink-primary">岗位备注</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-ink-secondary">{job.notes}</p>
            </div>
          ) : null}
        </section>

        <JobDetailActions job={job} initialApplication={application} />

        <section className="grid gap-5 lg:grid-cols-2">
          <RelatedJobs title="同公司其他岗位" jobs={related.sameCompany} />
          <RelatedJobs title="相近行业岗位" jobs={related.sameIndustry} />
        </section>
      </main>
    </PageShell>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-white/[0.06] bg-white/[0.025] p-4">
      <dt className="flex items-center gap-2 text-xs text-ink-muted">
        {label.includes("城市") ? <MapPin aria-hidden="true" className="size-3.5" /> : <Building2 aria-hidden="true" className="size-3.5" />}
        {label}
      </dt>
      <dd className="mt-2 text-sm leading-6 text-ink-secondary">{value}</dd>
    </div>
  );
}

function RelatedJobs({ title, jobs }: { title: string; jobs: Job[] }) {
  return (
    <section className="surface-subtle rounded-[24px] p-5">
      <h2 className="text-base font-medium text-ink-primary">{title}</h2>
      {jobs.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">暂无更多岗位</p>
      ) : (
        <div className="mt-4 grid gap-2">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="rounded-2xl px-3 py-2 text-sm transition hover:bg-white/[0.04]"
            >
              <span className="block truncate text-ink-primary">{job.company_name}</span>
              <span className="mt-0.5 block truncate text-xs text-ink-muted">
                {job.job_titles || "岗位待补充"} · {job.locations || "地点待补充"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

async function fetchApplicationForJob(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  jobId: string,
) {
  const { data, error } = await supabase
    .from("user_applications")
    .select("*")
    .eq("user_id", userId)
    .eq("job_id", jobId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as UserApplication | null;
}
