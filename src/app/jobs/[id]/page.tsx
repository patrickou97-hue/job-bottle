import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, MapPin } from "lucide-react";
import { JobDetailActions } from "@/components/jobs/JobDetailActions";
import { CompanyBadge } from "@/components/jobs/CompanyBadge";
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
  if (!job) return { title: "岗位详情 | 拾星" };
  return {
    title: `${job.company_name} ${job.job_titles || "岗位"} | 拾星`,
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
      <main className="observatory-page mx-auto max-w-5xl space-y-8">
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 text-sm text-ink-muted transition hover:text-[color:var(--aurora)]"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          返回岗位坐标
        </Link>

        <section className="border-y border-[color:var(--line-ghost)] py-6 sm:py-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 gap-4">
              <CompanyBadge companyName={job.company_name} logoUrl={job.logo_url} size="lg" />
              <div className="min-w-0">
                <p className="text-sm text-ink-muted">岗位详情</p>
                <h1 className="mt-1 text-2xl font-semibold leading-9 text-ink-primary sm:text-3xl">
                  {job.company_name}
                </h1>
                <p className="mt-2 max-w-2xl text-base leading-7 text-[color:var(--aurora)]">
                  {job.job_titles || "岗位待补充"}
                </p>
              </div>
            </div>
          </div>

          <dl className="mt-7 grid border-y border-[color:var(--line-ghost)] sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-[color:var(--line-ghost)]">
            <MetaItem label="城市 / base" value={job.locations || "地点待补充"} />
            <MetaItem label="行业" value={job.industry || "暂无行业"} />
            <MetaItem label="批次" value={job.batch_type || "暂无批次"} />
            <MetaItem label="开启时间" value={job.opens_at ? formatShanghaiDateTime(job.opens_at) : job.start_date || "暂无"} />
          </dl>
        </section>

        <JobDetailActions job={job} initialApplication={application} />

        <section className="grid gap-x-10 gap-y-8 border-y border-[color:var(--line-ghost)] py-7 lg:grid-cols-2">
          <DecisionSection title="工作职责" content={job.responsibilities} empty="原始岗位数据暂未拆分工作职责。" />
          <DecisionSection title="必须条件" content={job.must_have} empty="原始岗位数据暂未标注必须条件。" />
          <DecisionSection title="优先条件" content={job.preferred_qualifications} empty="原始岗位数据暂未标注优先条件。" />
          <div>
            <h2 className="text-base font-semibold text-ink-primary">高频关键词</h2>
            {job.keywords?.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {job.keywords.map((keyword) => <span key={keyword} className="border border-[color:var(--line)] px-2.5 py-1 text-xs text-ink-secondary">{keyword}</span>)}
              </div>
            ) : <p className="mt-3 text-sm leading-7 text-ink-muted">原始岗位数据暂未提取关键词。</p>}
          </div>
          {job.notes ? <DecisionSection title="补充信息" content={job.notes} className="lg:col-span-2" /> : null}
        </section>

        <section className="grid gap-8 lg:grid-cols-2">
          <RelatedJobs title="同公司其他岗位" jobs={related.sameCompany} />
          <RelatedJobs title="相近行业岗位" jobs={related.sameIndustry} />
        </section>
      </main>
    </PageShell>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4">
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
    <section className="border-t border-[color:var(--line-ghost)] pt-5">
      <h2 className="text-base font-medium text-ink-primary">{title}</h2>
      {jobs.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">暂无更多岗位</p>
      ) : (
        <div className="mt-4 grid gap-2">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="block border-t border-[color:var(--line-ghost)] py-3 text-sm first:border-t-0"
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

function DecisionSection({ title, content, empty, className = "" }: { title: string; content?: string | null; empty?: string; className?: string }) {
  return (
    <div className={className}>
      <h2 className="text-base font-semibold text-ink-primary">{title}</h2>
      {content ? <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-ink-secondary">{content}</p> : <p className="mt-3 text-sm leading-7 text-ink-muted">{empty}</p>}
    </div>
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
