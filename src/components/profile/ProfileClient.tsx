"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { MapPin, Save, Sparkles, Target, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ensureProfile, getCurrentUserOrNull } from "@/lib/auth";
import { fetchActiveJobs } from "@/lib/jobs";
import {
  formatPreferenceInput,
  parsePreferenceInput,
  updateMyProfilePreferences,
} from "@/lib/profile";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Job, Profile } from "@/lib/types";

export function ProfileClient() {
  const [userId, setUserId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [preferredRegions, setPreferredRegions] = useState("");
  const [targetRoles, setTargetRoles] = useState("");
  const [message, setMessage] = useState(() =>
    isSupabaseConfigured() ? "正在读取个人资料" : "请先配置数据库环境变量。",
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return;
    }
    const supabase = createClient();
    let mounted = true;

    async function loadProfile() {
      const user = await getCurrentUserOrNull(supabase);
      if (!mounted) return;
      if (!user) {
        setMessage("登录后可以维护个人求职偏好。");
        return;
      }

      await ensureProfile(supabase, user);
      const [{ data }, jobsResult] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        fetchActiveJobs(supabase).catch(() => []),
      ]);
      if (!mounted) return;

      const nextProfile = data as Profile | null;
      setUserId(user.id);
      setJobs(jobsResult);
      setDisplayName(nextProfile?.display_name ?? user.email?.split("@")[0] ?? "秋招用户");
      setPreferredRegions(formatPreferenceInput(nextProfile?.preferred_regions));
      setTargetRoles(formatPreferenceInput(nextProfile?.target_roles));
      setMessage("");
    }

    void loadProfile();
    return () => {
      mounted = false;
    };
  }, []);

  const recommendedJobs = useMemo(() => {
    const regions = parsePreferenceInput(preferredRegions);
    const roles = parsePreferenceInput(targetRoles);
    const hasPreference = regions.length > 0 || roles.length > 0;
    const scored = jobs.map((job) => {
      const locationText = job.locations ?? "";
      const roleText = [job.job_titles, job.company_name, job.industry, ...(job.job_categories ?? [])].join(" ");
      const regionScore = regions.filter((region) => locationText.includes(region)).length * 3;
      const roleScore = roles.filter((role) => roleText.includes(role)).length * 4;
      const freshness = new Date(job.updated_at).getTime() / 10_000_000_000_000;
      return { job, score: regionScore + roleScore + freshness };
    });

    return scored
      .filter((item) => !hasPreference || item.score > 0.05)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((item) => item.job);
  }, [jobs, preferredRegions, targetRoles]);

  async function handleSave() {
    if (!userId || !isSupabaseConfigured()) return;
    setBusy(true);
    setMessage("");
    try {
      const next = await updateMyProfilePreferences(createClient(), userId, {
        displayName,
        preferredRegions: parsePreferenceInput(preferredRegions),
        targetRoles: parsePreferenceInput(targetRoles),
      });
      setPreferredRegions(formatPreferenceInput(next.preferred_regions));
      setTargetRoles(formatPreferenceInput(next.target_roles));
      setMessage("已保存个人中心。");
    } catch {
      setMessage("保存失败，请稍后再试。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="observatory-page space-y-8">
      <section className="page-hero">
        <div>
          <p className="page-kicker">个人中心</p>
          <h1 className="page-title">我的求职偏好</h1>
        </div>
        <Button className="gap-2" onClick={() => void handleSave()} disabled={!userId || busy}>
          <Save aria-hidden="true" className="size-4" />
          保存资料
        </Button>
      </section>

      {message ? <div className="info-banner text-sm">{message}</div> : null}

      {!userId ? (
        <section className="empty-state">
          <p className="text-sm text-ink-secondary">登录后可以保存用户名、意向地区和岗位方向。</p>
          <Link href="/login?next=/profile" className="gold-button mt-4 inline-flex rounded-full px-4 py-2 text-sm font-medium">
            去登录
          </Link>
        </section>
      ) : (
        <section className="grid gap-6 lg:grid-cols-[minmax(0,0.86fr)_minmax(320px,0.72fr)]">
          <div className="liquid-panel p-5">
            <h2 className="section-title">基础资料</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Field label="用户名" icon={<UserRound aria-hidden="true" className="size-4" />}>
                <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
              </Field>
              <Field label="意向地区" icon={<MapPin aria-hidden="true" className="size-4" />}>
                <Input
                  value={preferredRegions}
                  onChange={(event) => setPreferredRegions(event.target.value)}
                  placeholder="上海、北京、深圳"
                />
              </Field>
              <Field label="意向岗位" icon={<Target aria-hidden="true" className="size-4" />}>
                <Input
                  value={targetRoles}
                  onChange={(event) => setTargetRoles(event.target.value)}
                  placeholder="产品、数据分析、投研"
                />
              </Field>
            </div>
            <p className="mt-5 text-sm leading-6 text-ink-muted">
              用顿号或逗号分隔多个方向。拾星会优先用这些偏好推荐岗位，也会为后续简历匹配和 JD 优化预留上下文。
            </p>
          </div>

          <aside className="liquid-panel p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="section-title">为你推荐</h2>
              <Sparkles aria-hidden="true" className="size-5 text-[color:var(--arcane)]" />
            </div>
            <div className="mt-5 space-y-3">
              {recommendedJobs.length > 0 ? (
                recommendedJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="block rounded-[18px] bg-white/[0.045] px-4 py-3 transition hover:bg-white/[0.07]"
                  >
                    <p className="truncate text-sm font-semibold text-ink-primary">{job.company_name}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-secondary">
                      {job.job_titles || job.industry || "岗位详情待补充"}
                    </p>
                    {job.locations ? <p className="mt-2 text-xs text-ink-muted">{job.locations}</p> : null}
                  </Link>
                ))
              ) : (
                <p className="text-sm leading-6 text-ink-muted">
                  填写意向地区和岗位后，这里会优先展示更接近的机会。
                </p>
              )}
            </div>
          </aside>
        </section>
      )}
    </div>
  );
}

function Field({
  children,
  icon,
  label,
}: {
  children: ReactNode;
  icon: ReactNode;
  label: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm text-ink-secondary">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}
