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
      const matchesStatus = !status || application.status === status;
      return matchesKeyword && matchesStatus;
    });
  }, [applications, keyword, status]);

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
    <div className="observatory-page space-y-8">
      <section className="page-hero">
        <div>
          <p className="page-kicker">进度管理</p>
          <h1 className="page-title">我的投递</h1>
          <p className="page-subtitle">
            所有已浏览和已投递记录集中在这里，轨道负责展示阶段，列表负责快速查找和操作。
          </p>
        </div>
        <div className="liquid-panel p-4 md:p-5">
          <div className="grid grid-cols-3 gap-4">
            <StatBlock value={applications.length} label="全部记录" />
            <StatBlock value={applications.filter((item) => item.status !== "rejected" && item.status !== "withdrawn").length} label="投递中" />
            <StatBlock value={applications.filter((item) => item.status === "offer").length} label="Offer" />
          </div>
        </div>
      </section>

      <section className="liquid-panel p-4">
        <div className="grid gap-4 md:grid-cols-[1fr_220px_auto]">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="absolute left-0 top-1/2 size-4 -translate-y-1/2 text-nebula-blue/70"
            />
            <Input
              className="pl-7"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索公司或岗位"
            />
          </div>
          <Select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as ApplicationStatus | "");
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
            刷新
          </Button>
        </div>
      </section>

      {message ? (
        <div className="message-banner text-sm">
          {message}
        </div>
      ) : null}

      <ApplicationOrbitSystem
        applications={applications}
        selectedApplication={selected}
        onSelect={setSelected}
        onEdit={setDrawerApplication}
      />

      <section className="liquid-panel overflow-hidden">
        {loading || redirecting ? (
          <div className="empty-state">
            <span className="loading-line">{redirecting ? "正在前往登录" : "正在读取投递"}</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div>
              <h2>暂无投递记录</h2>
              <p>从岗位星图中打开官网投递后，记录会出现在这里。</p>
            </div>
          </div>
        ) : (
          <div>
            <div className="section-heading px-4 pt-4">
              <span>投递记录</span>
              <span className="section-meta">{filtered.length} 条</span>
            </div>
            {filtered.map((application, index) => (
              <div
                key={application.id}
                className="data-row grid w-full grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-2 px-2 text-left sm:grid-cols-[34px_minmax(0,1fr)_auto] sm:gap-3 sm:px-4"
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
                  <span className="mt-0.5 hidden min-w-0 items-center gap-1.5 text-xs text-[color:var(--text-muted)] md:flex">
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

function StatBlock({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="font-display text-2xl font-semibold leading-none text-ink-primary tabular-nums md:text-3xl">
        {value}
      </div>
      <div className="mt-2 whitespace-nowrap text-xs text-ink-muted">{label}</div>
    </div>
  );
}
