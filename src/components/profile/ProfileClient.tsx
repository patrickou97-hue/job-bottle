"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Compass,
  LogOut,
  Mail,
  MapPin,
  Save,
  ShieldCheck,
  Target,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { fetchMyApplications } from "@/lib/applications";
import { ensureProfile, getCurrentUserOrNull } from "@/lib/auth";
import { fetchActiveJobs } from "@/lib/jobs";
import {
  formatPreferenceInput,
  isProfileSchemaError,
  parsePreferenceInput,
  updateMyProfilePreferences,
} from "@/lib/profile";
import {
  PROFILE_REGION_OPTIONS,
  PROFILE_ROLE_OPTIONS,
  toggleProfileOption,
} from "@/lib/profile-options";
import { getResumeTargetLine, type ResumeDocument } from "@/lib/resume";
import { fetchMyResumes, isMissingResumeTableError } from "@/lib/resume-sync";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { ApplicationWithJob, Job, Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProfileClient() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
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
  const [message, setMessage] = useState(() =>
    isSupabaseConfigured() ? "正在读取资料" : "请先配置数据库环境变量。",
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
        setMessage("登录后可以查看资料。");
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

    void loadProfile().catch((error) => {
      if (!mounted) return;
      setMessage(
        isProfileSchemaError(error)
          ? "云端个人资料尚未升级。请在 Supabase SQL Editor 运行 20260710120000_profile_resume_cloud_repair.sql。"
          : "读取资料失败，请稍后再试。",
      );
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
    } catch (error) {
      setMessage(
        isProfileSchemaError(error)
          ? "云端个人资料尚未升级。请在 Supabase SQL Editor 运行 20260710120000_profile_resume_cloud_repair.sql。"
          : "保存失败，请确认当前账号有 profiles 更新权限或稍后再试。",
      );
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
            <h1 className="page-title">个人中心</h1>
          </div>
        </section>
        {message ? <div className="info-banner text-sm">{message}</div> : null}
        <section className="empty-state border-y border-[color:var(--line-ghost)]">
          <div>
            <h2>需要先登录</h2>
            <p>登录后保存资料、简历和投递记录。</p>
            <Link href="/login?next=/profile" className="gold-button mt-4 inline-flex rounded-lg px-4 py-2 text-sm font-medium">
              去登录
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="observatory-page">
      <section className="page-hero grid gap-6 border-b border-[color:var(--line-ghost)] pb-7 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div className="min-w-0">
          <h1 className="page-title">个人中心</h1>
          <p className="page-subtitle mt-4">{statusLine}</p>
        </div>
        <div className="flex flex-wrap gap-3 md:justify-end">
          <Link href="/my" className="muted-button pressable inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm">
            <Compass aria-hidden="true" className="size-4" />
            打开投递
          </Link>
          <Button onClick={() => void handleSave()} disabled={busy}>
            <Save aria-hidden="true" className="size-4" />
            {busy ? "正在保存" : "保存资料"}
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-2 border-b border-[color:var(--line-ghost)] py-6 md:grid-cols-4">
        <div className="border-r border-[color:var(--line-ghost)] pr-5">
          <ProfileStat value={`${completionPercent}%`} label="资料完整度" />
        </div>
        <div className="pl-5 md:border-r md:border-[color:var(--line-ghost)] md:pr-5">
          <ProfileStat value={String(resumes.length)} label="简历版本" />
        </div>
        <div className="mt-5 border-r border-[color:var(--line-ghost)] pr-5 md:mt-0 md:pl-5">
          <ProfileStat value={String(appliedCount)} label="已投递" />
        </div>
        <div className="mt-5 pl-5 md:mt-0">
          <ProfileStat value={String(recommendedJobs.length)} label="匹配岗位" />
        </div>
      </section>
      {missingLabels.length > 0 ? (
        <p className="border-b border-[color:var(--line-ghost)] py-3 text-xs leading-5 text-ink-muted">
          建议补充：{missingLabels.slice(0, 4).join("、")}
        </p>
      ) : null}

      {message ? <div className="info-banner my-6 text-sm">{message}</div> : null}

      <div className="divide-y divide-[color:var(--line-ghost)] border-b border-[color:var(--line-ghost)]">
        <ProfileSection
          id="profile-details"
          title="基本资料"
          description="用于同步简历和完善求职信息。"
        >
          <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
            <ProfileField label="用户名" icon={<UserRound aria-hidden="true" className="size-4" />}>
              <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            </ProfileField>
            <ProfileField label="手机号" icon={<UserRound aria-hidden="true" className="size-4" />}>
              <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="可选" />
            </ProfileField>
            <ProfileField label="所在城市" icon={<MapPin aria-hidden="true" className="size-4" />}>
              <Input value={city} onChange={(event) => setCity(event.target.value)} />
            </ProfileField>
            <ProfileField label="毕业年份" icon={<BookOpen aria-hidden="true" className="size-4" />}>
              <Input value={graduationYear} onChange={(event) => setGraduationYear(event.target.value)} placeholder="2027" />
            </ProfileField>
            <ProfileField label="学校" icon={<BookOpen aria-hidden="true" className="size-4" />}>
              <Input value={school} onChange={(event) => setSchool(event.target.value)} placeholder="学校" />
            </ProfileField>
            <ProfileField label="专业" icon={<BookOpen aria-hidden="true" className="size-4" />}>
              <Input value={major} onChange={(event) => setMajor(event.target.value)} placeholder="专业" />
            </ProfileField>
          </div>
        </ProfileSection>

        <ProfileSection
          id="profile-preferences"
          title="求职偏好"
          description="偏好会用于筛选和推荐岗位。"
        >
          <div className="grid gap-7 xl:grid-cols-2">
            <ProfileField label="意向地区" icon={<MapPin aria-hidden="true" className="size-4" />}>
              <OptionGrid
                options={PROFILE_REGION_OPTIONS}
                selected={regionTags}
                onToggle={(option) =>
                  setPreferredRegions(formatPreferenceInput(toggleProfileOption(regionTags, option)))
                }
              />
            </ProfileField>
            <ProfileField label="意向岗位" icon={<Target aria-hidden="true" className="size-4" />}>
              <OptionGrid
                options={PROFILE_ROLE_OPTIONS}
                selected={targetRoleTags}
                onToggle={(option) =>
                  setTargetRoles(formatPreferenceInput(toggleProfileOption(targetRoleTags, option)))
                }
              />
            </ProfileField>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-[color:var(--line-ghost)] pt-4">
            <span className="mr-1 text-xs text-ink-muted">当前选择</span>
            <TagGroup values={regionTags} empty="未选择地区" />
            <TagGroup values={targetRoleTags} empty="未选择岗位" />
          </div>
        </ProfileSection>

        <ProfileSection
          id="profile-opportunities"
          title="简历与匹配"
          description="先管理简历，再查看与你方向一致的岗位。"
        >
          <div className="grid gap-9 lg:grid-cols-2 lg:divide-x lg:divide-[color:var(--line-ghost)]">
            <article className="min-w-0">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-base font-semibold text-ink-primary">简历版本</h3>
                <span className="text-xs tabular-nums text-ink-muted">{resumes.length} 份</span>
              </div>
              <div className="mt-4 divide-y divide-[color:var(--line-ghost)] border-y border-[color:var(--line-ghost)]">
            {resumes.length > 0 ? (
              resumes.slice(0, 3).map((resume) => (
                    <Link key={resume.id} href="/resume" className="group block py-3.5">
                  <p className="truncate text-sm font-semibold text-ink-primary">{resume.title || "未命名简历"}</p>
                  {getResumeTargetLine(resume) ? (
                    <p className="mt-1 truncate text-xs text-ink-muted">{getResumeTargetLine(resume)}</p>
                  ) : null}
                </Link>
              ))
            ) : (
                  <p className="py-4 text-sm leading-6 text-ink-muted">还没有简历。先建立一份通用版。</p>
            )}
          </div>
              <Link href="/resume" className="text-action mt-4 text-sm">
            管理简历
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
            </article>

            <article className="min-w-0 lg:pl-9">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-base font-semibold text-ink-primary">匹配岗位</h3>
                <span className="text-xs tabular-nums text-ink-muted">展示前 {recommendedJobs.length} 条</span>
              </div>
              <div className="mt-4 divide-y divide-[color:var(--line-ghost)] border-y border-[color:var(--line-ghost)]">
            {recommendedJobs.length > 0 ? (
              recommendedJobs.map((job) => (
                    <Link key={job.id} href={`/jobs/${job.id}`} className="group block py-3.5">
                  <p className="truncate text-sm font-semibold text-ink-primary">{job.company_name}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-muted">{job.job_titles || job.industry || "岗位详情待补充"}</p>
                </Link>
              ))
            ) : (
                  <p className="py-4 text-sm leading-6 text-ink-muted">保存地区或岗位后，这里会显示匹配结果。</p>
            )}
          </div>
              <Link href="/explore" className="text-action mt-4 text-sm">
            打开岗位坐标
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
            </article>
          </div>
        </ProfileSection>

        <ProfileSection
          id="profile-progress"
          title="投递进展"
          description="集中查看已保存机会和下一步行动。"
        >
          <p className="max-w-2xl text-sm leading-7 text-ink-secondary">
            {applications.length > 0
              ? `你已保存 ${applications.length} 个机会，其中 ${appliedCount} 个进入投递或后续阶段。`
              : "还没有保存岗位。可以先从岗位坐标添加一条记录。"}
          </p>
          <div className="mt-6 grid grid-cols-3 border-y border-[color:var(--line-ghost)] py-5">
            <ProgressFact label="保存机会" value={applications.length} />
            <ProgressFact label="已投递" value={appliedCount} divided />
            <ProgressFact label="待跟进" value={pendingCount} divided />
          </div>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
            <Link href="/my" className="text-action text-sm">打开投递工作台 <ArrowRight aria-hidden="true" className="size-4" /></Link>
            <Link href="/explore" className="text-action text-sm">继续找岗位 <ArrowRight aria-hidden="true" className="size-4" /></Link>
            <Link href="/bottle" className="text-action text-sm">查看星瓶 <ArrowRight aria-hidden="true" className="size-4" /></Link>
          </div>
        </ProfileSection>

        <ProfileSection
          id="profile-account"
          title="账号"
          description="查看登录信息与隐私说明。"
        >
          <div className="max-w-2xl space-y-5">
            <InfoLine icon={<Mail aria-hidden="true" className="size-4" />} label="登录邮箱" value={userEmail || "未读取"} />
            <InfoLine icon={<ShieldCheck aria-hidden="true" className="size-4" />} label="公开分享" value="分享海报不展示邮箱和内部 ID" />
            <button
              type="button"
              className="text-action pressable inline-flex min-h-10 items-center gap-2 text-sm text-[color:var(--text-danger)]"
              onClick={() => void handleLogout()}
            >
              <LogOut aria-hidden="true" className="size-4" />
              退出登录
            </button>
          </div>
        </ProfileSection>
      </div>
    </div>
  );
}

function ProfileSection({
  children,
  description,
  id,
  title,
}: {
  children: ReactNode;
  description: string;
  id: string;
  title: string;
}) {
  return (
    <section id={id} className="grid scroll-mt-24 gap-6 py-9 lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-12 lg:py-11">
      <header>
        <SectionLead title={title} />
        <p className="mt-2 max-w-[22rem] text-sm leading-6 text-ink-muted">{description}</p>
      </header>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function SectionLead({ dark = false, title }: { dark?: boolean; title: string }) {
  return (
    <div>
      <h2 className={cn("text-xl font-semibold tracking-[0]", dark ? "text-[#111827]" : "text-ink-primary")}>{title}</h2>
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

function ProgressFact({ divided = false, label, value }: { divided?: boolean; label: string; value: number }) {
  return (
    <div className={cn("px-4 first:pl-0", divided && "border-l border-[color:var(--line-ghost)]")}>
      <p className="text-2xl font-semibold tabular-nums text-ink-primary">{value}</p>
      <p className="mt-1 text-xs text-ink-muted">{label}</p>
    </div>
  );
}

function TagGroup({ dark = false, empty, values }: { dark?: boolean; empty: string; values: string[] }) {
  if (values.length === 0) {
    return <span className={cn("rounded-md px-3 py-1 text-xs", dark ? "bg-[#111827]/8 text-[#111827]/58" : "status-pill text-ink-muted")}>{empty}</span>;
  }
  return values.map((value) => (
    <span key={value} className={cn("rounded-md px-3 py-1 text-xs", dark ? "bg-[#111827]/10 text-[#111827]/72" : "status-pill text-ink-secondary")}>
      {value}
    </span>
  ));
}

function OptionGrid({
  dark = false,
  onToggle,
  options,
  selected,
}: {
  dark?: boolean;
  onToggle: (option: string) => void;
  options: readonly string[];
  selected: string[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            className={cn(
              "pressable min-h-9 rounded-lg px-3 py-1.5 text-xs font-medium transition",
              dark
                ? active
                  ? "bg-[#111827] text-[#7E7CB5]"
                  : "bg-[#111827]/8 text-[#111827]/62 hover:bg-[#111827]/14"
                : active
                  ? "bg-[#7E7CB5] text-[#F1EFFF]"
                  : "status-pill text-ink-secondary hover:text-ink-primary",
            )}
            aria-pressed={active}
            onClick={() => onToggle(option)}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
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

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-2xl font-semibold tabular-nums text-ink-primary md:text-3xl">{value}</p>
      <p className="mt-2 text-xs text-ink-muted">{label}</p>
    </div>
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
  return `${year} 届 · ${role}${region}${majorText}`;
}
