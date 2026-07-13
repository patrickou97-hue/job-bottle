"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, FileText, Plus, Trash2 } from "lucide-react";
import { ResumeEditor, type EditorSection } from "@/components/resume/ResumeEditor";
import { ResumePdfExportButton } from "@/components/resume/ResumePdfExportButton";
import { ResumePreview } from "@/components/resume/ResumePreview";
import { ResumeTemplatePicker } from "@/components/resume/ResumeTemplatePicker";
import { Button } from "@/components/ui/Button";
import { getCurrentUserOrNull } from "@/lib/auth";
import { fetchMyApplications } from "@/lib/applications";
import {
  createEmptyResume,
  createSampleResume,
  getResumeTemplateMeta,
  getResumeTargetLine,
  loadLocalResumes,
  mergeResumeCollections,
  saveLocalResumes,
  touchResume,
  type ResumeDocument,
  type ResumeTemplateId,
} from "@/lib/resume";
import {
  deleteMyResume,
  fetchMyResumes,
  isMissingResumeTableError,
  isResumeTemplateConstraintError,
  upsertMyResume,
} from "@/lib/resume-sync";
import { fetchActiveJobs } from "@/lib/jobs";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { ApplicationWithJob, Job } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { track } from "@/lib/track";

type StorageMode = "local" | "cloud";
type TargetJobContext = { company: string; id: string; role: string };

export function ResumeBuilderClient({ targetJob = null }: { targetJob?: TargetJobContext | null }) {
  const [resumes, setResumes] = useState<ResumeDocument[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<EditorSection>("basic");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState("已保存到本地");
  const [storageMode, setStorageMode] = useState<StorageMode>("local");
  const [userId, setUserId] = useState<string | null>(null);
  const cloudFingerprintRef = useRef("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = loadLocalResumes();
      const initial = stored.length > 0 ? stored : [createSampleResume()];
      setResumes(initial);
      setSelectedId(initial[0]?.id ?? null);
      setLoaded(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const savedLocally = saveLocalResumes(resumes);

    if (storageMode !== "cloud" || !userId || !isSupabaseConfigured()) {
      const timer = window.setTimeout(
        () => setSaveState(savedLocally ? "已保存到本地" : "浏览器存储空间不足，请删除大图后重试"),
        120,
      );
      return () => window.clearTimeout(timer);
    }

    const fingerprint = JSON.stringify(resumes);
    if (fingerprint === cloudFingerprintRef.current) {
      const timer = window.setTimeout(() => setSaveState("已同步到账号"), 120);
      return () => window.clearTimeout(timer);
    }

    setSaveState("正在同步");
    const timer = window.setTimeout(async () => {
      try {
        const supabase = createClient();
        await Promise.all(resumes.map((resume) => upsertMyResume(supabase, userId, resume)));
        cloudFingerprintRef.current = fingerprint;
        setSaveState("已同步到账号");
      } catch (error) {
        if (isResumeTemplateConstraintError(error)) {
          setStorageMode("local");
          setSaveState("云端模板库待升级，已保存到本地");
          return;
        }
        if (isMissingResumeTableError(error)) {
          setStorageMode("local");
          setSaveState("云端简历库未升级，已保存到本地");
          return;
        }
        setSaveState("云端同步失败，已保存到本地");
      }
    }, 700);

    return () => window.clearTimeout(timer);
  }, [loaded, resumes, storageMode, userId]);

  useEffect(() => {
    if (!loaded || !isSupabaseConfigured()) return;
    const supabase = createClient();
    let mounted = true;
    async function loadCloudData() {
      const user = await getCurrentUserOrNull(supabase);
      if (!mounted || !user) return;
      setUserId(user.id);

      const [rows, cloudResumesResult, applicationResult] = await Promise.allSettled([
        fetchActiveJobs(supabase),
        fetchMyResumes(supabase),
        fetchMyApplications(supabase, user.id),
      ]);

      if (!mounted) return;

      if (rows.status === "fulfilled") setJobs(rows.value);
      if (applicationResult.status === "fulfilled") setApplications(applicationResult.value);

      if (cloudResumesResult.status === "rejected") {
        if (isMissingResumeTableError(cloudResumesResult.reason)) {
          setStorageMode("local");
          setSaveState("云端简历库未升级，已保存到本地");
          return;
        }
        setStorageMode("local");
        setSaveState("云端同步失败，已保存到本地");
        return;
      }

      const cloudResumes = cloudResumesResult.value;
      const localResumes = loadLocalResumes();
      const mergedResumes = mergeResumeCollections(localResumes, cloudResumes);
      setStorageMode("cloud");

      if (mergedResumes.length > 0) {
        cloudFingerprintRef.current = JSON.stringify(cloudResumes);
        setResumes(mergedResumes);
        setSelectedId((current) =>
          current && mergedResumes.some((resume) => resume.id === current)
            ? current
            : mergedResumes[0]?.id ?? null,
        );
        setSaveState(
          JSON.stringify(mergedResumes) === JSON.stringify(cloudResumes)
            ? "已同步到账号"
            : "正在合并本地与账号简历",
        );
        return;
      }

      const initial = [createSampleResume()];
      setResumes(initial);
      setSelectedId(initial[0]?.id ?? null);
      setSaveState("正在同步");
    }
    void loadCloudData();
    return () => {
      mounted = false;
    };
  }, [loaded]);

  const selectedResume = useMemo(
    () => resumes.find((resume) => resume.id === selectedId) ?? resumes[0] ?? null,
    [resumes, selectedId],
  );
  const targetResume = targetJob
    ? resumes.find((resume) => resume.linkedJobId === targetJob.id) ?? null
    : null;

  function updateResume(nextResume: ResumeDocument) {
    setSaveState("正在保存");
    setResumes((current) =>
      current.map((resume) => (resume.id === nextResume.id ? nextResume : resume)),
    );
    setSelectedId(nextResume.id);
  }

  function updateTemplate(templateId: ResumeTemplateId) {
    updateResume(touchResume({ ...selectedResume, templateId }));
  }

  function createResume() {
    const next = createEmptyResume();
    next.title = `简历版本 ${resumes.length + 1}`;
    setResumes((current) => [next, ...current]);
    setSelectedId(next.id);
    setActiveSection("basic");
  }

  function prepareTargetResume() {
    if (!targetJob || !selectedResume) return;
    if (targetResume) {
      setSelectedId(targetResume.id);
      setActiveSection("target");
      return;
    }

    const now = new Date().toISOString();
    const primaryRole = targetJob.role.split(/[,，、]/)[0]?.trim() || "目标岗位";
    const next: ResumeDocument = {
      ...selectedResume,
      id: createEmptyResume().id,
      title: `${targetJob.company} · ${primaryRole}`,
      targetRole: primaryRole,
      jobTarget: targetJob.role,
      linkedJobId: targetJob.id,
      content: {
        ...selectedResume.content,
        basics: {
          ...selectedResume.content.basics,
          targetRole: primaryRole,
        },
      },
      createdAt: now,
      updatedAt: now,
    };
    setResumes((current) => [next, ...current]);
    setSelectedId(next.id);
    setActiveSection("target");
    void track("job_resume_created", { job_id: targetJob.id, resume_id: next.id });
  }

  function duplicateResume(resume: ResumeDocument) {
    const now = new Date().toISOString();
    const copy: ResumeDocument = {
      ...resume,
      id: createEmptyResume().id,
      title: `${resume.title} 副本`,
      createdAt: now,
      updatedAt: now,
    };
    setResumes((current) => [copy, ...current]);
    setSelectedId(copy.id);
  }

  function deleteResume(id: string) {
    setResumes((current) => {
      const next = current.filter((resume) => resume.id !== id);
      if (next.length === 0) {
        const fallback = createSampleResume();
        setSelectedId(fallback.id);
        return [fallback];
      }
      if (selectedId === id) setSelectedId(next[0].id);
      return next;
    });
    if (storageMode === "cloud" && userId && isSupabaseConfigured()) {
      const supabase = createClient();
      void deleteMyResume(supabase, id).catch((error) => {
        if (isMissingResumeTableError(error)) {
          setStorageMode("local");
          setSaveState("云端简历库未升级，已保存到本地");
          return;
        }
        setSaveState("删除同步失败，本地已删除");
      });
    }
  }

  if (!loaded || !selectedResume) {
    return (
      <div className="observatory-page space-y-8">
        <section className="page-hero">
          <div>
            <ResumePageTitle />
          </div>
        </section>
        <div className="empty-state">
          <span className="loading-line">正在读取简历</span>
        </div>
      </div>
    );
  }

  return (
    <div className="observatory-page space-y-8">
      <section className="page-hero">
        <div>
          <ResumePageTitle />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="status-pill rounded-md px-3 py-2 text-sm text-ink-secondary">
            {saveState}
          </span>
          <Button onClick={createResume} className="gap-2">
            <Plus aria-hidden="true" className="size-4" />
            新建简历
          </Button>
        </div>
      </section>

      {targetJob ? (
        <section className="flex flex-col gap-4 border-y border-[color:var(--line-ghost)] py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-primary">{targetJob.company} · {targetJob.role}</p>
            <p className="mt-1 text-sm leading-6 text-ink-muted">
              {targetResume ? "这个岗位已有绑定版本，可以继续修改。" : "基于当前简历创建副本，并自动绑定到这个岗位。"}
            </p>
          </div>
          <Button className="shrink-0" onClick={prepareTargetResume}>
            <FileText aria-hidden="true" className="size-4" />
            {targetResume ? "打开岗位版本" : "创建岗位版本"}
          </Button>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[208px_minmax(0,1fr)]">
        <aside className="space-y-3 xl:sticky xl:top-24 xl:self-start xl:border-r xl:border-[color:var(--line-ghost)] xl:pr-5">
          <div className="flex items-center justify-between">
            <h2 className="section-title">我的简历</h2>
            <span className="section-meta">{resumes.length} 份</span>
          </div>
          <div className="space-y-2">
            {resumes.map((resume) => {
              const health = getResumeHealth(resume);
              const boundJob = jobs.find((job) => job.id === resume.linkedJobId);
              const usageCount = applications.filter((application) => application.resume_id === resume.id).length;
              return (
              <button
                key={resume.id}
                type="button"
                data-selected={selectedResume.id === resume.id}
                className={`resume-list-item w-full rounded-lg px-3 py-2.5 text-left transition ${selectedResume.id === resume.id ? "text-ink-primary" : "text-ink-secondary"}`}
                onClick={() => setSelectedId(resume.id)}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <FileText aria-hidden="true" className="size-4 text-nebula-blue" />
                  {resume.title || "未命名简历"}
                </span>
                {getResumeTargetLine(resume) ? (
                  <span className="mt-1 block text-xs text-ink-muted">{getResumeTargetLine(resume)}</span>
                ) : null}
                <span className="mt-2 block truncate text-xs text-[color:var(--aurora)]">
                  {boundJob ? `绑定 ${boundJob.company_name}` : resume.linkedJobId ? "已绑定岗位" : "基础 / 方向版本"}
                </span>
                <span className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-ink-muted">
                  <span>{health.percent}% 完整</span>
                  <span>{usageCount} 次使用</span>
                  <span>{formatDateTime(resume.updatedAt)}</span>
                </span>
                {health.missing.length > 0 ? <span className="mt-1 block truncate text-[11px] text-ink-muted">待补：{health.missing.join("、")}</span> : null}
              </button>
              );
            })}
          </div>
        </aside>

        <div className="grid gap-8 xl:grid-cols-[minmax(400px,0.9fr)_minmax(540px,1.1fr)] xl:items-start">
          <section className="min-w-0 border-t border-[color:var(--line-ghost)] pt-5">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="section-title">编辑内容</h2>
                <p className="mt-1 text-xs text-ink-muted">
                  {selectedResume.jobTarget || "可按岗位方向保留多个版本"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="muted-button pressable inline-flex size-9 items-center justify-center rounded-lg"
                  aria-label="复制简历"
                  title="复制简历"
                  onClick={() => duplicateResume(selectedResume)}
                >
                  <Copy aria-hidden="true" className="size-4" />
                </button>
                <button
                  type="button"
                  className="muted-button pressable inline-flex size-9 items-center justify-center rounded-lg text-[color:var(--text-danger)]"
                  aria-label="删除简历"
                  title="删除简历"
                  onClick={() => deleteResume(selectedResume.id)}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </div>
            </div>
            <div className="mb-6">
              <ResumeTemplatePicker selectedTemplateId={selectedResume.templateId} onChange={updateTemplate} />
            </div>
            <ResumeEditor
              resume={selectedResume}
              jobs={jobs}
              linkedJobContext={targetJob}
              activeSection={activeSection}
              onSectionChange={setActiveSection}
              onChange={updateResume}
            />
          </section>

          <section className="min-w-0 xl:sticky xl:top-20">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="section-title">实时预览</h2>
                <p className="mt-1 text-xs text-ink-muted">
                  {getResumeTemplateMeta(selectedResume.templateId).label}。预览与下载共用同一套 A4 排版坐标。
                </p>
              </div>
              <ResumePdfExportButton
                resume={selectedResume}
                preserveDraft={() => saveLocalResumes(resumes)}
              />
            </div>
            <div className="pb-4">
              <ResumePreview resume={selectedResume} />
            </div>
          </section>
        </div>
      </section>
      <p className="border-t border-[color:var(--line-ghost)] pt-4 text-center text-xs leading-5 text-ink-muted">
        请谨慎审核 AI 输出的简历信息
      </p>
    </div>
  );
}

function ResumePageTitle() {
  return (
    <div className="relative inline-flex pb-7 pr-16 sm:pr-20">
      <h1 className="page-title">简历制作</h1>
      <span
        className="pointer-events-none absolute bottom-0 right-0 inline-block whitespace-nowrap bg-[linear-gradient(90deg,#879fc8,#dce7f8)] bg-clip-text px-2 text-base font-semibold italic text-transparent drop-shadow-[0_0_10px_rgba(185,200,229,0.3)] sm:text-lg"
        style={{ fontFamily: '"Snell Roundhand", "Brush Script MT", "Segoe Script", cursive' }}
        aria-label="AI-Powered"
      >
        AI-Powered
      </span>
    </div>
  );
}

function getResumeHealth(resume: ResumeDocument) {
  const missing: string[] = [];
  if (!resume.content.basics.name.trim() || !resume.content.basics.email.trim() || !resume.content.basics.phone.trim()) missing.push("基本信息");
  if (resume.content.education.length === 0) missing.push("教育");
  if (resume.content.work.length === 0 && resume.content.projects.length === 0) missing.push("经历/项目");
  if (resume.content.skills.length === 0) missing.push("技能");
  if (!getResumeTargetLine(resume)) missing.push("目标岗位");
  const percent = Math.round(((5 - missing.length) / 5) * 100);
  return { missing, percent };
}
