"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Compass,
  ExternalLink,
  FileText,
  GraduationCap,
  LogOut,
  Mail,
  MapPin,
  Save,
  Settings,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ensureProfile, getCurrentUserOrNull } from "@/lib/auth";
import { fetchActiveJobs } from "@/lib/jobs";
import {
  formatPreferenceInput,
  parsePreferenceInput,
  updateMyProfilePreferences,
} from "@/lib/profile";
import { fetchMyResumes, isMissingResumeTableError } from "@/lib/resume-sync";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Job, Profile } from "@/lib/types";
import type { ResumeDocument } from "@/lib/resume";

type ProfileModule = "settings" | "basic" | "preferences" | "resumes" | "recommendations" | "feedback" | "guide";

const FEEDBACK_MAILTO = `mailto:raywang6688@outlook.com?subject=${encodeURIComponent("拾星问题反馈")}`;

const PROFILE_MODULES: { id: ProfileModule; label: string; description: string; icon: ReactNode }[] = [
  { id: "settings", label: "设置", description: "账号与数据", icon: <Settings aria-hidden="true" className="size-4" /> },
  { id: "basic", label: "基本信息", description: "用户名与学校", icon: <UserRound aria-hidden="true" className="size-4" /> },
  { id: "preferences", label: "求职意向", description: "地区与岗位", icon: <Target aria-hidden="true" className="size-4" /> },
  { id: "resumes", label: "我的简历", description: "版本与入口", icon: <FileText aria-hidden="true" className="size-4" /> },
  { id: "recommendations", label: "为你推荐", description: "匹配机会", icon: <Sparkles aria-hidden="true" className="size-4" /> },
  { id: "feedback", label: "问题反馈", description: "邮件联系", icon: <Mail aria-hidden="true" className="size-4" /> },
  { id: "guide", label: "使用教程", description: "快速上手", icon: <BookOpen aria-hidden="true" className="size-4" /> },
];

export function ProfileClient() {
  const router = useRouter();
  const [activeModule, setActiveModule] = useState<ProfileModule>("settings");
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [role, setRole] = useState<Profile["role"]>("user");
  const [jobs, setJobs] = useState<Job[]>([]);
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
      const [profileResult, jobsResult, resumesResult] = await Promise.allSettled([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        fetchActiveJobs(supabase),
        fetchMyResumes(supabase),
      ]);
      if (!mounted) return;

      const nextProfile =
        profileResult.status === "fulfilled" ? (profileResult.value.data as Profile | null) : null;
      setUserId(user.id);
      setUserEmail(user.email ?? "");
      setRole(nextProfile?.role ?? "user");
      setJobs(jobsResult.status === "fulfilled" ? jobsResult.value : []);
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
      .slice(0, 6)
      .map((item) => item.job);
  }, [jobs, regionTags, targetRoleTags]);

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
      setMessage("已保存个人中心。");
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
            <h1 className="page-title">用户管理</h1>
          </div>
        </section>
        {message ? <div className="info-banner text-sm">{message}</div> : null}
        <section className="empty-state">
          <p className="text-sm text-ink-secondary">登录后可以维护资料、管理简历、查看推荐和提交反馈。</p>
          <Link href="/login?next=/profile" className="gold-button mt-4 inline-flex rounded-full px-4 py-2 text-sm font-medium">
            去登录
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="observatory-page space-y-8">
      <section className="page-hero">
        <div>
          <p className="page-kicker">个人中心</p>
          <h1 className="page-title">用户管理</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/my" className="muted-button pressable inline-flex h-10 items-center rounded-full px-4 text-sm">
            我的星图
          </Link>
          <Button className="gap-2" onClick={() => void handleSave()} disabled={busy}>
            <Save aria-hidden="true" className="size-4" />
            保存资料
          </Button>
        </div>
      </section>

      {message ? <div className="info-banner text-sm">{message}</div> : null}

      <section className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="liquid-panel p-4 xl:sticky xl:top-24 xl:self-start">
          <div className="rounded-[22px] bg-white/[0.045] p-4">
            <p className="text-xs tracking-[0.16em] text-ink-muted">ACCOUNT</p>
            <h2 className="mt-2 truncate text-xl font-semibold text-ink-primary">{displayName || "秋招用户"}</h2>
            <p className="mt-1 truncate text-xs text-ink-muted">{userEmail || "未绑定邮箱"}</p>
          </div>
          <nav className="mt-4 grid gap-1">
            {PROFILE_MODULES.map((item) => (
              <ModuleButton
                key={item.id}
                active={activeModule === item.id}
                description={item.description}
                icon={item.icon}
                label={item.label}
                onClick={() => setActiveModule(item.id)}
              />
            ))}
          </nav>
        </aside>

        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-4">
            <SummaryCard label="简历版本" value={resumes.length} />
            <SummaryCard label="意向地区" value={regionTags.length} />
            <SummaryCard label="意向岗位" value={targetRoleTags.length} />
            <SummaryCard label="推荐机会" value={recommendedJobs.length} />
          </section>

          {activeModule === "settings" ? (
            <ProfilePanel title="设置" subtitle="账号状态、数据入口和安全操作。">
              <div className="grid gap-4 md:grid-cols-2">
                <InfoLine label="账号邮箱" value={userEmail || "未读取"} />
                <InfoLine label="账号角色" value={role === "admin" ? "管理员" : "普通用户"} />
                <InfoLine label="我的星图" value="投递轨道仍在独立页面 /my" />
                <InfoLine label="资料保存" value="保存后用于推荐和后续简历匹配" />
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/my" className="muted-button pressable inline-flex h-10 items-center rounded-full px-4 text-sm">
                  查看我的星图
                </Link>
                <button
                  type="button"
                  className="muted-button pressable inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm text-red-200"
                  onClick={() => void handleLogout()}
                >
                  <LogOut aria-hidden="true" className="size-4" />
                  退出登录
                </button>
              </div>
            </ProfilePanel>
          ) : null}

          {activeModule === "basic" ? (
            <ProfilePanel title="基本信息" subtitle="这里管理个人资料，后续会用于简历、投递和推荐。">
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="用户名" icon={<UserRound aria-hidden="true" className="size-4" />}>
                  <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
                </Field>
                <Field label="手机号" icon={<UserRound aria-hidden="true" className="size-4" />}>
                  <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="可选" />
                </Field>
                <Field label="所在城市" icon={<MapPin aria-hidden="true" className="size-4" />}>
                  <Input value={city} onChange={(event) => setCity(event.target.value)} placeholder="成都" />
                </Field>
                <Field label="毕业年份" icon={<GraduationCap aria-hidden="true" className="size-4" />}>
                  <Input value={graduationYear} onChange={(event) => setGraduationYear(event.target.value)} placeholder="2027" />
                </Field>
                <Field label="学校" icon={<GraduationCap aria-hidden="true" className="size-4" />}>
                  <Input value={school} onChange={(event) => setSchool(event.target.value)} placeholder="西南财经大学" />
                </Field>
                <Field label="专业" icon={<BookOpen aria-hidden="true" className="size-4" />}>
                  <Input value={major} onChange={(event) => setMajor(event.target.value)} placeholder="金融学" />
                </Field>
              </div>
            </ProfilePanel>
          ) : null}

          {activeModule === "preferences" ? (
            <ProfilePanel title="求职意向" subtitle="用顿号或逗号分隔多个方向，拾星会据此推荐岗位。">
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="意向地区" icon={<MapPin aria-hidden="true" className="size-4" />}>
                  <Input value={preferredRegions} onChange={(event) => setPreferredRegions(event.target.value)} placeholder="上海、北京、深圳" />
                </Field>
                <Field label="意向岗位" icon={<Target aria-hidden="true" className="size-4" />}>
                  <Input value={targetRoles} onChange={(event) => setTargetRoles(event.target.value)} placeholder="产品、数据分析、投研" />
                </Field>
              </div>
              <ChipPreview title="地区标签" values={regionTags} />
              <ChipPreview title="岗位标签" values={targetRoleTags} />
            </ProfilePanel>
          ) : null}

          {activeModule === "resumes" ? (
            <ProfilePanel title="我的简历" subtitle="查看已有简历版本，并进入简历制作器继续编辑。">
              <div className="grid gap-3">
                {resumes.length > 0 ? (
                  resumes.slice(0, 6).map((resume) => (
                    <Link
                      key={resume.id}
                      href="/resume"
                      className="flex items-center justify-between gap-3 rounded-[18px] bg-white/[0.045] px-4 py-3 transition hover:bg-white/[0.07]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-ink-primary">{resume.title || "未命名简历"}</span>
                        <span className="mt-1 block truncate text-xs text-ink-muted">
                          {resume.targetRole || resume.content.basics.targetRole || "未设置方向"}
                        </span>
                      </span>
                      <ExternalLink aria-hidden="true" className="size-4 shrink-0 text-nebula-blue" />
                    </Link>
                  ))
                ) : (
                  <p className="text-sm leading-6 text-ink-muted">还没有简历版本，可以先创建一份通用版。</p>
                )}
              </div>
              <Link href="/resume" className="gold-button mt-5 inline-flex h-10 items-center rounded-full px-4 text-sm font-medium">
                进入简历制作
              </Link>
            </ProfilePanel>
          ) : null}

          {activeModule === "recommendations" ? (
            <ProfilePanel title="为你推荐" subtitle="根据意向地区和意向岗位，从岗位库里挑出更接近的机会。">
              <RecommendedJobs jobs={recommendedJobs} />
            </ProfilePanel>
          ) : null}

          {activeModule === "feedback" ? (
            <ProfilePanel title="问题反馈" subtitle="遇到数据、简历、投递流程或视觉问题，可以直接发邮件。">
              <div className="rounded-[22px] bg-white/[0.045] p-5">
                <p className="text-sm leading-6 text-ink-secondary">
                  点击下面按钮会打开你的邮件客户端，收件人是 raywang6688@outlook.com，主题会自动填为“拾星问题反馈”。
                </p>
                <a
                  href={FEEDBACK_MAILTO}
                  className="gold-button mt-5 inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium"
                >
                  <Mail aria-hidden="true" className="size-4" />
                  发送问题反馈
                </a>
              </div>
            </ProfilePanel>
          ) : null}

          {activeModule === "guide" ? (
            <ProfilePanel title="使用教程" subtitle="第一次使用拾星，可以按这个顺序走。">
              <div className="grid gap-4 md:grid-cols-2">
                <GuideCard title="1. 探索岗位" description="去探索星海筛选公司、地区和岗位类别，打开官网投递。" href="/explore" />
                <GuideCard title="2. 更新星图" description="投递后回到我的星图，确认状态并记录笔试、面试和 Offer 进展。" href="/my" />
                <GuideCard title="3. 制作简历" description="在简历制作器里维护不同岗位版本，下载正式 PDF。" href="/resume" />
                <GuideCard title="4. 查看星瓶" description="在我的星瓶里复盘投递收获，并生成分享海报。" href="/bottle" />
              </div>
            </ProfilePanel>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function ModuleButton({
  active,
  description,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  description: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left transition ${
        active
          ? "bg-white/[0.08] text-ink-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          : "text-ink-secondary hover:bg-white/[0.045] hover:text-ink-primary"
      }`}
      onClick={onClick}
    >
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-nebula-blue">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="mt-0.5 block text-xs text-ink-muted">{description}</span>
      </span>
    </button>
  );
}

function ProfilePanel({ children, subtitle, title }: { children: ReactNode; subtitle: string; title: string }) {
  return (
    <section className="liquid-panel p-5">
      <div className="mb-5">
        <h2 className="section-title">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-ink-muted">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function Field({ children, icon, label }: { children: ReactNode; icon: ReactNode; label: string }) {
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

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="liquid-panel px-4 py-3">
      <p className="font-display text-2xl font-semibold tabular-nums text-ink-primary">{value}</p>
      <p className="mt-1 text-xs text-ink-muted">{label}</p>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-white/[0.045] px-4 py-3">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="mt-1 text-sm font-medium text-ink-primary">{value}</p>
    </div>
  );
}

function ChipPreview({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="mt-5">
      <p className="mb-2 text-sm text-ink-muted">{title}</p>
      <div className="flex flex-wrap gap-2">
        {values.length > 0 ? (
          values.map((value) => (
            <span key={value} className="status-pill rounded-full px-3 py-1 text-xs text-ink-secondary">
              {value}
            </span>
          ))
        ) : (
          <span className="text-sm text-ink-muted">暂未填写</span>
        )}
      </div>
    </div>
  );
}

function RecommendedJobs({ jobs }: { jobs: Job[] }) {
  if (jobs.length === 0) {
    return <p className="text-sm leading-6 text-ink-muted">填写意向地区和岗位后，这里会优先展示更接近的机会。</p>;
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {jobs.map((job) => (
        <Link
          key={job.id}
          href={`/jobs/${job.id}`}
          className="block rounded-[18px] bg-white/[0.045] px-4 py-3 transition hover:bg-white/[0.07]"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-ink-primary">{job.company_name}</span>
              <span className="mt-1 line-clamp-2 text-xs leading-5 text-ink-secondary">
                {job.job_titles || job.industry || "岗位详情待补充"}
              </span>
            </span>
            <Compass aria-hidden="true" className="size-4 shrink-0 text-nebula-blue" />
          </div>
          {job.locations ? <p className="mt-2 text-xs text-ink-muted">{job.locations}</p> : null}
        </Link>
      ))}
    </div>
  );
}

function GuideCard({ description, href, title }: { description: string; href: string; title: string }) {
  return (
    <Link href={href} className="rounded-[20px] bg-white/[0.045] p-4 transition hover:bg-white/[0.07]">
      <p className="text-sm font-semibold text-ink-primary">{title}</p>
      <p className="mt-2 text-sm leading-6 text-ink-secondary">{description}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-xs text-nebula-blue">
        前往
        <ExternalLink aria-hidden="true" className="size-3" />
      </span>
    </Link>
  );
}
