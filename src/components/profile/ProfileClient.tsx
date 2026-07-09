"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Compass,
  LifeBuoy,
  LogOut,
  Mail,
  MapPin,
  Save,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { fetchMyApplications } from "@/lib/applications";
import { ensureProfile, getCurrentUserOrNull } from "@/lib/auth";
import { fetchActiveJobs } from "@/lib/jobs";
import {
  formatPreferenceInput,
  parsePreferenceInput,
  updateMyProfilePreferences,
} from "@/lib/profile";
import type { ResumeDocument } from "@/lib/resume";
import { fetchMyResumes, isMissingResumeTableError } from "@/lib/resume-sync";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { ApplicationWithJob, Job, Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

const FEEDBACK_EMAIL = "raywang6688@outlook.com";
const FEEDBACK_TYPES = ["数据错误", "简历导出", "投递流程", "视觉体验", "其他建议"];

export function ProfileClient() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [role, setRole] = useState<Profile["role"]>("user");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
  const [resumes, setResumes] = useState<ResumeDocument[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [school, setSchool] = useState("");
  const [major, setMajor] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [preferredRegions, setPreferredRegions] = useState("");
  const [targetRoles, setTargetRoles] = useState("");
  const [feedbackType, setFeedbackType] = useState(FEEDBACK_TYPES[0]);
  const [feedbackText, setFeedbackText] = useState("");
  const [message, setMessage] = useState(() =>
    isSupabaseConfigured() ? "正在读取个人中心" : "请先配置数据库环境变量。",
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    let mounted = true;

    async function loadProfile() {
      const user = await getCurrentUserOrNull(supabase);
      if (!mounted) return;
      if (!user) {
        setMessage("登录后可以进入个人中心。");
        return;
      }

      await ensureProfile(supabase, user);
      const [profileResult, jobsResult, resumesResult, applicationsResult] = await Promise.allSettled([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        fetchActiveJobs(supabase),
        fetchMyResumes(supabase),
        fetchMyApplications(supabase, user.id),
      ]);
      if (!mounted) return;

      const nextProfile =
        profileResult.status === "fulfilled" ? (profileResult.value.data as Profile | null) : null;
      setUserId(user.id);
      setUserEmail(user.email ?? "");
      setRole(nextProfile?.role ?? "user");
      setJobs(jobsResult.status === "fulfilled" ? jobsResult.value : []);
      setApplications(applicationsResult.status === "fulfilled" ? applicationsResult.value : []);
      setResumes(
        resumesResult.status === "fulfilled" || !isMissingResumeTableError(resumesResult.reason)
          ? resumesResult.status === "fulfilled"
            ? resumesResult.value
            : []
          : [],
      );
      setDisplayName(nextProfile?.display_name ?? user.email?.split("@")[0] ?? "秋招用户");
      setPhone(nextProfile?.phone ?? "");
      setCity(nextProfile?.city ?? "");
      setSchool(nextProfile?.school ?? "");
      setMajor(nextProfile?.major ?? "");
      setGraduationYear(nextProfile?.graduation_year ?? "");
      setPreferredRegions(formatPreferenceInput(nextProfile?.preferred_regions));
      setTargetRoles(formatPreferenceInput(nextProfile?.target_roles));
      setMessage("");
    }

    void loadProfile().catch(() => {
      if (mounted) setMessage("读取个人中心失败，请稍后再试。");
    });
    return () => {
      mounted = false;
    };
  }, []);

  const targetRoleTags = useMemo(() => parsePreferenceInput(targetRoles), [targetRoles]);
  const regionTags = useMemo(() => parsePreferenceInput(preferredRegions), [preferredRegions]);
  const appliedCount = applications.filter((item) => item.status !== "opened").length;
  const pendingCount = applications.filter((item) =>
    ["opened", "applied", "written_test", "first_round", "second_round", "final_round"].includes(item.status),
  ).length;

  const recommendedJobs = useMemo(() => {
    const hasPreference = regionTags.length > 0 || targetRoleTags.length > 0;
    const scored = jobs.map((job) => {
      const locationText = job.locations ?? "";
      const roleText = [job.job_titles, job.company_name, job.industry, ...(job.job_categories ?? [])].join(" ");
      const regionScore = regionTags.filter((region) => locationText.includes(region)).length * 3;
      const roleScore = targetRoleTags.filter((roleName) => roleText.includes(roleName)).length * 4;
      const freshness = new Date(job.updated_at).getTime() / 10_000_000_000_000;
      return { job, score: regionScore + roleScore + freshness };
    });

    return scored
      .filter((item) => !hasPreference || item.score > 0.05)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((item) => item.job);
  }, [jobs, regionTags, targetRoleTags]);

  const completionChecks = useMemo(
    () => [
      { done: Boolean(displayName.trim()), label: "昵称" },
      { done: Boolean(city.trim()), label: "所在城市" },
      { done: Boolean(school.trim()), label: "学校" },
      { done: Boolean(major.trim()), label: "专业" },
      { done: regionTags.length > 0, label: "意向地区" },
      { done: targetRoleTags.length > 0, label: "意向岗位" },
      { done: resumes.length > 0, label: "简历版本" },
    ],
    [city, displayName, major, regionTags.length, resumes.length, school, targetRoleTags.length],
  );
  const completionPercent = Math.round(
    (completionChecks.filter((item) => item.done).length / completionChecks.length) * 100,
  );
  const missingLabels = completionChecks.filter((item) => !item.done).map((item) => item.label);

  const statusLine = buildStatusLine({
    graduationYear,
    major,
    regionTags,
    targetRoleTags,
  });

  const feedbackMailto = useMemo(() => {
    const body = [
      `反馈类型：${feedbackType}`,
      `账号：${userEmail || "未读取"}`,
      "",
      feedbackText.trim() || "请在这里补充你遇到的问题。",
    ].join("\n");
    return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent("拾星问题反馈")}&body=${encodeURIComponent(body)}`;
  }, [feedbackText, feedbackType, userEmail]);

  async function handleSave() {
    if (!userId || !isSupabaseConfigured()) return;
    setBusy(true);
    setMessage("");
    try {
      const next = await updateMyProfilePreferences(createClient(), userId, {
        city,
        displayName,
        graduationYear,
        major,
        phone,
        preferredRegions: regionTags,
        school,
        targetRoles: targetRoleTags,
      });
      setDisplayName(next.display_name ?? "");
      setPhone(next.phone ?? "");
      setCity(next.city ?? "");
      setSchool(next.school ?? "");
      setMajor(next.major ?? "");
      setGraduationYear(next.graduation_year ?? "");
      setPreferredRegions(formatPreferenceInput(next.preferred_regions));
      setTargetRoles(formatPreferenceInput(next.target_roles));
      setMessage("已保存个人资料。");
    } catch {
      setMessage("保存失败，请确认数据库迁移已应用或稍后再试。");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    if (!isSupabaseConfigured()) return;
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (!userId) {
    return (
      <div className="observatory-page space-y-8">
        <section className="page-hero">
          <div>
            <p className="page-kicker">个人中心</p>
            <h1 className="page-title">拾星名片</h1>
            <p className="page-subtitle mt-4">登录后进入用户管理空间，维护资料、管理简历、查看推荐和提交反馈。</p>
          </div>
        </section>
        {message ? <div className="info-banner text-sm">{message}</div> : null}
        <section className="empty-state liquid-panel">
          <div>
            <h2>需要先登录</h2>
            <p>你的星图、简历版本和求职偏好会绑定到账号。</p>
            <Link href="/login?next=/profile" className="gold-button mt-4 inline-flex rounded-full px-4 py-2 text-sm font-medium">
              去登录
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="observatory-page space-y-7">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#080d1b] px-5 py-6 shadow-[inset_0_1px_0_rgba(244,232,198,0.08)] sm:px-7 lg:px-9">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-45">
          <div className="absolute right-20 top-16 h-[420px] w-[420px] rounded-full border border-[#f4e8c6]/10" />
          <div className="absolute right-8 top-40 h-[520px] w-[520px] rounded-full border border-[#f4e8c6]/8" />
        </div>
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#f4e8c6]/58">个人中心 · 用户管理</span>
              <span className="h-px w-12 bg-[#f4e8c6]/30" />
              <span className="text-xs text-ink-muted">{role === "admin" ? "管理员账号" : "求职用户"}</span>
            </div>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.04] tracking-[0] text-[#f8f1df] sm:text-6xl">
              {displayName || "秋招用户"} 的秋招星瓶
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-[#f8f1df]/62 sm:text-base">
              {statusLine}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button onClick={() => void handleSave()} disabled={busy}>
                <Save aria-hidden="true" className="size-4" />
                保存资料
              </Button>
              <Link href="/my" className="muted-button pressable inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm">
                <Compass aria-hidden="true" className="size-4" />
                进入我的星图
              </Link>
              <Link href="/bottle" className="muted-button pressable inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm">
                <Sparkles aria-hidden="true" className="size-4" />
                分享星瓶
              </Link>
            </div>
          </div>

          <div className="relative border-l border-[#f4e8c6]/16 pl-5">
            <p className="text-sm text-[#f4e8c6]/56">资料完整度</p>
            <p className="mt-2 text-5xl font-semibold tabular-nums text-[#f8f1df]">{completionPercent}%</p>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#e3c589]"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <p className="mt-4 text-xs leading-5 text-[#f8f1df]/50">
              {missingLabels.length > 0 ? `还差：${missingLabels.slice(0, 4).join("、")}` : "资料已经可以用于推荐匹配。"}
            </p>
          </div>
        </div>
      </section>

      {message ? <div className="info-banner text-sm">{message}</div> : null}

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
        <article className="relative overflow-hidden rounded-[1.75rem] bg-[rgba(8,13,27,0.7)] p-5 shadow-[inset_0_1px_0_rgba(244,232,198,0.07)] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <SectionLead eyebrow="My Bottle" title="我的星瓶" />
            <Link href="/my" className="text-action text-sm">
              查看星图
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
          <div className="mt-5 grid gap-5 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
            <div className="relative mx-auto h-72 w-48">
              <div className="absolute inset-x-8 bottom-8 h-44 rounded-[44%] bg-[#f4e8c6]/8 blur-2xl" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/star-bottle-image2.png" alt="星瓶" className="relative h-full w-full object-contain opacity-90" />
            </div>
            <div>
              <p className="text-sm leading-7 text-ink-secondary">
                {applications.length > 0
                  ? `你已经收进 ${applications.length} 个机会，其中 ${appliedCount} 个进入投递或后续阶段。`
                  : "还没有点亮岗位星。先去探索星海，收进第一颗机会。"}
              </p>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <BottleFact label="保存机会" value={formatLit(applications.length)} />
                <BottleFact label="已投递" value={formatLit(appliedCount)} />
                <BottleFact label="待跟进" value={formatLit(pendingCount)} />
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/explore" className="gold-button inline-flex h-10 items-center rounded-full px-4 text-sm font-medium">
                  探索岗位
                </Link>
                <Link href="/bottle" className="muted-button pressable inline-flex h-10 items-center rounded-full px-4 text-sm">
                  生成分享海报
                </Link>
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-[1.75rem] bg-[#f4e8c6] p-5 text-[#111827] shadow-[0_24px_80px_rgba(0,0,0,0.18)] sm:p-6">
          <SectionLead eyebrow="Preference" title="求职偏好" dark />
          <div className="mt-5 grid gap-4">
            <ProfileField label="意向地区" icon={<MapPin aria-hidden="true" className="size-4" />}>
              <Input
                className="border-[#111827]/25 text-[#111827] placeholder:text-[#111827]/38 focus:border-[#111827]/70"
                value={preferredRegions}
                onChange={(event) => setPreferredRegions(event.target.value)}
                placeholder="上海、北京、深圳"
              />
            </ProfileField>
            <ProfileField label="意向岗位" icon={<Target aria-hidden="true" className="size-4" />}>
              <Input
                className="border-[#111827]/25 text-[#111827] placeholder:text-[#111827]/38 focus:border-[#111827]/70"
                value={targetRoles}
                onChange={(event) => setTargetRoles(event.target.value)}
                placeholder="金融、咨询、商业分析"
              />
            </ProfileField>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <TagGroup values={regionTags} empty="意向地区尚未点亮" dark />
            <TagGroup values={targetRoleTags} empty="意向岗位尚未点亮" dark />
          </div>
          <Button className="mt-5" onClick={() => void handleSave()} disabled={busy}>
            <Save aria-hidden="true" className="size-4" />
            保存偏好
          </Button>
        </article>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <article className="rounded-[1.5rem] border border-white/[0.08] p-5">
          <SectionLead eyebrow="Basics" title="基本信息" />
          <div className="mt-5 grid gap-4">
            <ProfileField label="用户名" icon={<UserRound aria-hidden="true" className="size-4" />}>
              <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            </ProfileField>
            <ProfileField label="手机号" icon={<UserRound aria-hidden="true" className="size-4" />}>
              <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="可选" />
            </ProfileField>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <ProfileField label="所在城市" icon={<MapPin aria-hidden="true" className="size-4" />}>
                <Input value={city} onChange={(event) => setCity(event.target.value)} placeholder="成都" />
              </ProfileField>
              <ProfileField label="毕业年份" icon={<BookOpen aria-hidden="true" className="size-4" />}>
                <Input value={graduationYear} onChange={(event) => setGraduationYear(event.target.value)} placeholder="2027" />
              </ProfileField>
            </div>
            <ProfileField label="学校 / 专业" icon={<BookOpen aria-hidden="true" className="size-4" />}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <Input value={school} onChange={(event) => setSchool(event.target.value)} placeholder="学校" />
                <Input value={major} onChange={(event) => setMajor(event.target.value)} placeholder="专业" />
              </div>
            </ProfileField>
          </div>
        </article>

        <article className="rounded-[1.5rem] border border-white/[0.08] p-5">
          <SectionLead eyebrow="Resume" title="简历版本" />
          <div className="mt-5 space-y-3">
            {resumes.length > 0 ? (
              resumes.slice(0, 3).map((resume) => (
                <Link key={resume.id} href="/resume" className="group block border-b border-white/[0.08] pb-3 last:border-b-0">
                  <p className="truncate text-sm font-semibold text-ink-primary">{resume.title || "未命名简历"}</p>
                  <p className="mt-1 truncate text-xs text-ink-muted">
                    {resume.targetRole || resume.content.basics.targetRole || "用于通用匹配"}
                  </p>
                </Link>
              ))
            ) : (
              <p className="text-sm leading-6 text-ink-muted">还没有准备简历版本，建议先做一份通用版。</p>
            )}
          </div>
          <Link href="/resume" className="text-action mt-5 text-sm">
            上传 / 管理简历
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </article>

        <article className="rounded-[1.5rem] border border-white/[0.08] p-5">
          <SectionLead eyebrow="Next" title="为你推荐" />
          <div className="mt-5 space-y-3">
            {recommendedJobs.length > 0 ? (
              recommendedJobs.map((job) => (
                <Link key={job.id} href={`/jobs/${job.id}`} className="group block border-b border-white/[0.08] pb-3 last:border-b-0">
                  <p className="truncate text-sm font-semibold text-ink-primary">{job.company_name}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-muted">{job.job_titles || job.industry || "岗位详情待补充"}</p>
                </Link>
              ))
            ) : (
              <p className="text-sm leading-6 text-ink-muted">填写偏好后，这里会点亮更接近你的机会。</p>
            )}
          </div>
          <Link href="/explore" className="text-action mt-5 text-sm">
            去探索星海
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </article>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <article className="rounded-[1.5rem] border border-white/[0.08] p-5">
          <SectionLead eyebrow="Guide" title="使用教程" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <GuideLink href="/explore" step="01" title="探索岗位" />
            <GuideLink href="/my" step="02" title="更新星图" />
            <GuideLink href="/resume" step="03" title="制作简历" />
            <GuideLink href="/bottle" step="04" title="分享星瓶" />
          </div>
        </article>

        <article className="rounded-[1.5rem] border border-white/[0.08] p-5">
          <SectionLead eyebrow="Account" title="账号与反馈" />
          <div className="mt-5 space-y-4">
            <InfoLine icon={<Mail aria-hidden="true" className="size-4" />} label="登录邮箱" value={userEmail || "未读取"} />
            <InfoLine icon={<ShieldCheck aria-hidden="true" className="size-4" />} label="公开分享" value="分享海报不展示邮箱和内部 ID" />
            <ProfileField label="反馈内容" icon={<LifeBuoy aria-hidden="true" className="size-4" />}>
              <select
                className="field-shell mb-3 h-11 w-full px-0 text-sm"
                value={feedbackType}
                onChange={(event) => setFeedbackType(event.target.value)}
              >
                {FEEDBACK_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <Textarea
                value={feedbackText}
                onChange={(event) => setFeedbackText(event.target.value)}
                placeholder="写下你遇到的问题，点击发送邮件。"
              />
            </ProfileField>
            <div className="flex flex-wrap gap-3">
              <a href={feedbackMailto} className="gold-button inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium">
                <Mail aria-hidden="true" className="size-4" />
                发送反馈
              </a>
              <button
                type="button"
                className="muted-button pressable inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm text-red-100"
                onClick={() => void handleLogout()}
              >
                <LogOut aria-hidden="true" className="size-4" />
                退出登录
              </button>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}

function SectionLead({ dark = false, eyebrow, title }: { dark?: boolean; eyebrow: string; title: string }) {
  return (
    <div>
      <p className={cn("text-xs font-semibold uppercase tracking-[0.16em]", dark ? "text-[#111827]/48" : "text-ink-muted")}>{eyebrow}</p>
      <h2 className={cn("mt-2 text-2xl font-semibold tracking-[0]", dark ? "text-[#111827]" : "text-ink-primary")}>{title}</h2>
    </div>
  );
}

function ProfileField({
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
      <span className="mb-2 flex items-center gap-2 text-sm font-medium text-current/70">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}

function BottleFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-[#f4e8c6]/18 pl-3">
      <p className="text-xl font-semibold tabular-nums text-ink-primary">{value}</p>
      <p className="mt-1 text-xs text-ink-muted">{label}</p>
    </div>
  );
}

function TagGroup({ dark = false, empty, values }: { dark?: boolean; empty: string; values: string[] }) {
  if (values.length === 0) {
    return <span className={cn("rounded-full px-3 py-1 text-xs", dark ? "bg-[#111827]/8 text-[#111827]/58" : "status-pill text-ink-muted")}>{empty}</span>;
  }
  return values.map((value) => (
    <span key={value} className={cn("rounded-full px-3 py-1 text-xs", dark ? "bg-[#111827]/10 text-[#111827]/72" : "status-pill text-ink-secondary")}>
      {value}
    </span>
  ));
}

function InfoLine({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-ink-muted">{icon}</span>
      <span className="min-w-0">
        <span className="block text-xs text-ink-muted">{label}</span>
        <span className="mt-1 block truncate text-sm text-ink-primary">{value}</span>
      </span>
    </div>
  );
}

function GuideLink({ href, step, title }: { href: string; step: string; title: string }) {
  return (
    <Link href={href} className="group flex items-center justify-between border-b border-white/[0.08] py-3">
      <span>
        <span className="text-xs text-ink-muted">{step}</span>
        <span className="ml-3 text-sm font-medium text-ink-primary">{title}</span>
      </span>
      <ArrowRight aria-hidden="true" className="size-4 text-ink-muted transition group-hover:translate-x-0.5 group-hover:text-ink-primary" />
    </Link>
  );
}

function buildStatusLine({
  graduationYear,
  major,
  regionTags,
  targetRoleTags,
}: {
  graduationYear: string;
  major: string;
  regionTags: string[];
  targetRoleTags: string[];
}) {
  const year = graduationYear.trim() || "2027";
  const role = targetRoleTags.length > 0 ? targetRoleTags.slice(0, 3).join("、") : "秋招";
  const region = regionTags.length > 0 ? `，优先关注 ${regionTags.slice(0, 3).join("、")}` : "";
  const majorText = major.trim() ? `，${major.trim()}背景` : "";
  return `正在寻找 ${year} 届 ${role} 机会${region}${majorText}。`;
}

function formatLit(value: number) {
  return value > 0 ? String(value) : "未点亮";
}
