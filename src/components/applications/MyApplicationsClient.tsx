"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Search } from "lucide-react";
import { APPLICATION_STATUS, APPLICATION_STATUS_LABELS } from "@/lib/constants";
import { fetchMyApplications } from "@/lib/applications";
import { getCurrentUserOrNull } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { isValidHttpUrl } from "@/lib/utils";
import { ProgressDrawer } from "@/components/applications/ProgressDrawer";
import { StatusPill } from "@/components/applications/StatusPill";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { ApplicationOrbitSystem } from "@/components/applications/ApplicationOrbitSystem";
import type { ApplicationStatus, ApplicationWithJob } from "@/lib/types";

export function MyApplicationsClient({ loginNextPath = "/my-applications" }: { loginNextPath?: string }) {
  const router = useRouter();
  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
  const [selected, setSelected] = useState<ApplicationWithJob | null>(null);
  const [drawerApplication, setDrawerApplication] = useState<ApplicationWithJob | null>(null);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<ApplicationStatus | "">("");
  const [statusGroup, setStatusGroup] = useState<readonly ApplicationStatus[] | "">("");
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setMessage("");
    try {
      if (!isSupabaseConfigured()) {
        setMessage("请先配置数据库环境变量。");
        return;
      }
      const supabase = createClient();
      const user = await getCurrentUserOrNull(supabase);
      if (!user) {
        setRedirecting(true);
        router.replace(`/login?next=${encodeURIComponent(loginNextPath)}`);
        return;
      }
      setRedirecting(false);
      setApplications(await fetchMyApplications(supabase, user.id));
    } catch {
      setMessage("读取投递记录失败，请稍后再试。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loginNextPath]);

  const filtered = useMemo(() => {
    const key = keyword.trim().toLowerCase();
    return applications.filter((application) => {
      const matchesKeyword =
        !key ||
        application.job.company_name.toLowerCase().includes(key) ||
        (application.job.job_titles ?? "").toLowerCase().includes(key);
      const matchesStatus = statusGroup
        ? statusGroup.includes(application.status)
        : !status || application.status === status;
      return matchesKeyword && matchesStatus;
    });
  }, [applications, keyword, status, statusGroup]);

  function handleApplicationChanged(nextApplication: ApplicationWithJob) {
    setApplications((current) =>
      current.map((application) =>
        application.id === nextApplication.id ? nextApplication : application,
      ),
    );
    setSelected((current) =>
      current?.id === nextApplication.id ? nextApplication : current,
    );
    setDrawerApplication((current) =>
      current?.id === nextApplication.id ? nextApplication : current,
    );
  }

  function handleApplicationDeleted(applicationId: string) {
    setApplications((current) =>
      current.filter((application) => application.id !== applicationId),
    );
    setSelected((current) => (current?.id === applicationId ? null : current));
    setDrawerApplication((current) => (current?.id === applicationId ? null : current));
  }

  return (
    <div className="space-y-6">
      <section className="surface-subtle rounded-[28px] p-6">
        <h1 className="text-3xl font-semibold text-ink-primary">我的投递</h1>
      </section>

      <section className="surface-subtle rounded-[24px] p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-nebula-blue/70"
            />
            <Input
              className="pl-9"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索公司或岗位"
            />
          </div>
          <Select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as ApplicationStatus | "");
              setStatusGroup("");
            }}
          >
            <option value="">全部状态</option>
            {APPLICATION_STATUS.map((item) => (
              <option key={item} value={item}>
                {APPLICATION_STATUS_LABELS[item]}
              </option>
            ))}
          </Select>
          <Button variant="secondary" onClick={loadData}>
            重新读取
          </Button>
        </div>
      </section>

      {message ? (
        <div className="rounded-[22px] border border-red-300/25 bg-red-500/10 p-4 text-sm text-red-100">
          {message}
        </div>
      ) : null}

      <ApplicationOrbitSystem
        applications={applications}
        selectedApplication={selected}
        onSelect={setSelected}
        onEdit={setDrawerApplication}
        onStatusFilterChange={(nextStatuses) => {
          setStatusGroup(nextStatuses);
          if (nextStatuses) setStatus("");
        }}
      />

      <section className="overflow-hidden">
        {loading || redirecting ? (
          <div className="p-8 text-center text-ink-secondary">
            {redirecting ? "正在前往登录..." : "正在读取投递轨道..."}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <h2 className="text-lg font-semibold text-ink-primary">暂无投递记录</h2>
            <p className="mt-2 text-sm text-ink-muted">
              从岗位星图中打开官网投递后，记录会出现在这里。
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-2 flex items-center justify-between px-4 text-xs tracking-[0.18em] text-[color:var(--text-meta)]">
              <span>投递记录</span>
              <span>{filtered.length} 条</span>
            </div>
            {filtered.map((application, index) => (
              <div
                key={application.id}
                className="data-row grid w-full grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 px-4 text-left"
                role="button"
                tabIndex={0}
                onClick={() => setSelected(application)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelected(application);
                  }
                }}
              >
                <span className="text-right text-xs tabular-nums text-[color:var(--text-disabled)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="flex min-w-0 items-baseline gap-3">
                    <span className="truncate text-[15px] font-medium leading-6 text-[color:var(--text-primary)]">
                      {application.job.company_name}
                    </span>
                    <span className="hidden truncate text-xs text-[color:var(--text-muted)] md:inline">
                      {application.job.job_titles || "岗位待补充"}
                    </span>
                  </span>
                  <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-[color:var(--text-muted)]">
                    <span className="truncate">{application.job.locations || "暂无地点"}</span>
                    <span className="text-[color:var(--text-disabled)]">·</span>
                    <span className="truncate">{application.job.industry || "暂无行业"}</span>
                    <span className="text-[color:var(--text-disabled)]">·</span>
                    <span className="truncate">{application.job.batch_type || "暂无批次"}</span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <StatusPill status={application.status} />
                  <Button
                    variant="secondary"
                    className="hidden h-8 px-3 text-xs sm:inline-flex"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelected(application);
                      setDrawerApplication(application);
                    }}
                  >
                    查看进度
                  </Button>
                  <Button
                    variant="secondary"
                    className="hidden h-8 gap-1 px-3 text-xs lg:inline-flex"
                    disabled={!isValidHttpUrl(application.job.apply_url)}
                    onClick={(event) => {
                      event.stopPropagation();
                      window.open(
                        application.job.apply_url,
                        "_blank",
                        "noopener,noreferrer",
                      );
                    }}
                  >
                    <ExternalLink aria-hidden="true" className="size-4" />
                    官网
                  </Button>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <ProgressDrawer
        application={drawerApplication}
        open={Boolean(drawerApplication)}
        onClose={() => setDrawerApplication(null)}
        onChanged={handleApplicationChanged}
        onDeleted={handleApplicationDeleted}
      />
    </div>
  );
}
