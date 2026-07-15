"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Copy, FileText, FileUp, Languages, LoaderCircle, Plus, Puzzle, Trash2 } from "lucide-react";
import { ResumeCreateDialog } from "@/components/resume/ResumeCreateDialog";
import { ResumeEditor, type EditorSection } from "@/components/resume/ResumeEditor";
import { ResumeImportDialog, type ResumeImportMode } from "@/components/resume/ResumeImportDialog";
import { ResumePdfExportButton } from "@/components/resume/ResumePdfExportButton";
import { ResumePreview } from "@/components/resume/ResumePreview";
import { ResumeTemplatePicker } from "@/components/resume/ResumeTemplatePicker";
import { Button } from "@/components/ui/Button";
import { getCurrentUserOrNull } from "@/lib/auth";
import { fetchMyApplications } from "@/lib/applications";
import {
  adoptLocalResumesForUser,
  createEmptyResume,
  createResumeId,
  createSampleResume,
  getResumeTemplateMeta,
  getResumeTargetLine,
  getResumeLanguage,
  loadLocalResumes,
  saveLocalResumes,
  touchResume,
  type ResumeDocument,
  type ResumeLanguage,
  type ResumeTemplateId,
} from "@/lib/resume";
import {
  deleteMyResume,
  fetchMyResumes,
  getResumeSyncErrorMessage,
  isMissingResumeTableError,
  isResumeOwnershipConflictError,
  isResumeTemplateConstraintError,
  upsertMyResume,
} from "@/lib/resume-sync";
import { fetchActiveJobs } from "@/lib/jobs";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { ApplicationWithJob, Job } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { track } from "@/lib/track";
import { createResumeFromImport, type ImportedResumeDraft } from "@/lib/resume-import";
import {
  createResumeFromTranslation,
  requestResumeTranslation,
} from "@/lib/resume-translation";

type StorageMode = "local" | "cloud";
type TargetJobContext = { company: string; id: string; role: string };
type PendingCloudSave = {
  attempts: number;
  fingerprint: string;
  resume: ResumeDocument;
};

const MAX_BACKGROUND_SYNC_ATTEMPTS = 3;

export function ResumeBuilderClient({ targetJob = null }: { targetJob?: TargetJobContext | null }) {
  const [resumes, setResumes] = useState<ResumeDocument[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<EditorSection>("basic");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [authResolved, setAuthResolved] = useState(false);
  const [saveState, setSaveState] = useState("已保存到本地");
  const [storageMode, setStorageMode] = useState<StorageMode>("local");
  const [userId, setUserId] = useState<string | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [translating, setTranslating] = useState(false);
  const cloudFingerprintsRef = useRef(new Map<string, string>());
  const pendingCloudSavesRef = useRef(new Map<string, PendingCloudSave>());
  const cloudSaveWorkerRef = useRef<Promise<void> | null>(null);
  const cloudRetryTimerRef = useRef<number | null>(null);
  const activeUserIdRef = useRef<string | null>(null);
  const hydratingUserIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (cloudRetryTimerRef.current) window.clearTimeout(cloudRetryTimerRef.current);
    };
  }, []);

  const runCloudSaveWorker = useCallback((activeUserId: string) => {
    function startWorker() {
      if (cloudSaveWorkerRef.current) return;
      if (cloudRetryTimerRef.current) {
        window.clearTimeout(cloudRetryTimerRef.current);
        cloudRetryTimerRef.current = null;
      }
      let failedCount = 0;
      let savedCount = 0;
      let shouldRetry = false;

      cloudSaveWorkerRef.current = (async () => {
        const supabase = createClient();
        const batch = Array.from(pendingCloudSavesRef.current.entries());
        for (const [resumeId, queued] of batch) {
          if (activeUserIdRef.current !== activeUserId) break;

          try {
            await upsertMyResume(supabase, activeUserId, queued.resume);
            savedCount += 1;
            cloudFingerprintsRef.current.set(resumeId, queued.fingerprint);
            if (pendingCloudSavesRef.current.get(resumeId)?.fingerprint === queued.fingerprint) {
              pendingCloudSavesRef.current.delete(resumeId);
            }
          } catch (error) {
            failedCount += 1;
            if (!mountedRef.current) break;
            if (isResumeTemplateConstraintError(error)) {
              setStorageMode("local");
              setSaveState("云端模板库待升级，已保存到本地");
              pendingCloudSavesRef.current.clear();
              break;
            }
            if (isMissingResumeTableError(error)) {
              setStorageMode("local");
              setSaveState("云端简历库未升级，已保存到本地");
              pendingCloudSavesRef.current.clear();
              break;
            }
            if (isResumeOwnershipConflictError(error)) {
              const now = new Date().toISOString();
              const adoptedResume = {
                ...queued.resume,
                id: createResumeId(),
                createdAt: now,
                updatedAt: now,
              };
              pendingCloudSavesRef.current.delete(resumeId);
              cloudFingerprintsRef.current.delete(resumeId);
              setResumes((current) =>
                current.map((resume) => (resume.id === resumeId ? adoptedResume : resume)),
              );
              setSelectedId((current) => (current === resumeId ? adoptedResume.id : current));
              setSaveState("已为当前账号创建独立简历副本，正在同步");
              continue;
            }

            const current = pendingCloudSavesRef.current.get(resumeId);
            if (current?.fingerprint === queued.fingerprint) {
              const attempts = queued.attempts + 1;
              pendingCloudSavesRef.current.set(resumeId, { ...queued, attempts });
              shouldRetry ||= attempts < MAX_BACKGROUND_SYNC_ATTEMPTS;
            }
            setSaveState(getResumeSyncErrorMessage(error));
          }
        }
      })().finally(() => {
        cloudSaveWorkerRef.current = null;
        if (!mountedRef.current) return;
        const hasFreshPendingSave = Array.from(pendingCloudSavesRef.current.values()).some(
          (item) => item.attempts === 0,
        );
        if (pendingCloudSavesRef.current.size > 0 && (shouldRetry || hasFreshPendingSave)) {
          const maxAttempts = Math.max(
            ...Array.from(pendingCloudSavesRef.current.values(), (item) => item.attempts),
          );
          const delay = hasFreshPendingSave
            ? 0
            : Math.min(30_000, 2_000 * 2 ** Math.max(0, maxAttempts - 1));
          cloudRetryTimerRef.current = window.setTimeout(startWorker, delay);
        } else if (failedCount === 0 && pendingCloudSavesRef.current.size === 0) {
          setSaveState("已同步到账号");
        } else if (savedCount > 0) {
          setSaveState("部分简历同步失败，本地副本已保留");
        }
      });
    }

    startWorker();
  }, []);

  useEffect(() => {
    function retryPendingCloudSaves() {
      const activeUserId = activeUserIdRef.current;
      if (!activeUserId || pendingCloudSavesRef.current.size === 0) return;
      runCloudSaveWorker(activeUserId);
    }
    function retryWhenVisible() {
      if (document.visibilityState === "visible") retryPendingCloudSaves();
    }
    window.addEventListener("online", retryPendingCloudSaves);
    document.addEventListener("visibilitychange", retryWhenVisible);
    return () => {
      window.removeEventListener("online", retryPendingCloudSaves);
      document.removeEventListener("visibilitychange", retryWhenVisible);
    };
  }, [runCloudSaveWorker]);

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
    if (!authResolved && isSupabaseConfigured()) return;
    const savedLocally = saveLocalResumes(resumes, userId);

    if (storageMode !== "cloud" || !userId || !isSupabaseConfigured()) {
      const timer = window.setTimeout(
        () => setSaveState(savedLocally ? "已保存到本地" : "浏览器存储空间不足，请删除大图后重试"),
        120,
      );
      return () => window.clearTimeout(timer);
    }

    const dirtyResumes = resumes.filter(
      (resume) => cloudFingerprintsRef.current.get(resume.id) !== JSON.stringify(resume),
    );
    if (dirtyResumes.length === 0) {
      const timer = window.setTimeout(() => setSaveState("已同步到账号"), 120);
      return () => window.clearTimeout(timer);
    }

    setSaveState("正在同步");
    const timer = window.setTimeout(() => {
      for (const resume of dirtyResumes) {
        const fingerprint = JSON.stringify(resume);
        if (pendingCloudSavesRef.current.get(resume.id)?.fingerprint === fingerprint) continue;
        pendingCloudSavesRef.current.set(resume.id, { attempts: 0, fingerprint, resume });
      }
      runCloudSaveWorker(userId);
    }, 700);

    return () => window.clearTimeout(timer);
  }, [authResolved, loaded, resumes, runCloudSaveWorker, storageMode, userId]);

  useEffect(() => {
    if (!loaded || !isSupabaseConfigured()) return;
    const supabase = createClient();
    let mounted = true;
    async function loadCloudData(userFromSession?: User) {
      const user = userFromSession ?? await getCurrentUserOrNull(supabase);
      if (!mounted) return;
      if (!user) {
        setAuthResolved(true);
        return;
      }
      if (activeUserIdRef.current === user.id || hydratingUserIdRef.current === user.id) return;
      hydratingUserIdRef.current = user.id;

      void Promise.allSettled([
        fetchActiveJobs(supabase).then((rows) => mounted && setJobs(rows)),
        fetchMyApplications(supabase, user.id).then((rows) => mounted && setApplications(rows)),
      ]);

      try {
        const cloudResumes = await fetchMyResumes(supabase);
        if (!mounted) return;
        const mergedResumes = adoptLocalResumesForUser(user.id, cloudResumes);
        cloudFingerprintsRef.current = new Map(
          cloudResumes.map((resume) => [resume.id, JSON.stringify(resume)]),
        );
        activeUserIdRef.current = user.id;
        setUserId(user.id);
        setStorageMode("cloud");

        if (mergedResumes.length > 0) {
          setResumes(mergedResumes);
          setSelectedId((current) =>
            current && mergedResumes.some((resume) => resume.id === current)
              ? current
              : mergedResumes[0]?.id ?? null,
          );
          setSaveState(
            mergedResumes.every(
              (resume) => cloudFingerprintsRef.current.get(resume.id) === JSON.stringify(resume),
            )
              ? "已同步到账号"
              : "正在合并本地与账号简历",
          );
          return;
        }

        const initial = [createSampleResume()];
        setResumes(initial);
        setSelectedId(initial[0]?.id ?? null);
        setSaveState("正在同步");
      } catch (error) {
        if (!mounted) return;
        if (isMissingResumeTableError(error)) {
          setStorageMode("local");
          setSaveState("云端简历库未升级，已保存到本地");
          return;
        }
        setSaveState("云端读取暂时失败，简历已保存在本地");
      } finally {
        if (hydratingUserIdRef.current === user.id) hydratingUserIdRef.current = null;
        if (mounted) setAuthResolved(true);
      }
    }
    void loadCloudData();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" && !session) {
        const guestResumes = loadLocalResumes();
        const initial = guestResumes.length > 0 ? guestResumes : [createSampleResume()];
        activeUserIdRef.current = null;
        hydratingUserIdRef.current = null;
        pendingCloudSavesRef.current.clear();
        cloudFingerprintsRef.current.clear();
        setUserId(null);
        setStorageMode("local");
        setResumes(initial);
        setSelectedId(initial[0]?.id ?? null);
        setAuthResolved(true);
        setSaveState("登录状态已退出，后续修改将保存在本地");
        return;
      }
      if (session?.user) {
        if (activeUserIdRef.current && activeUserIdRef.current !== session.user.id) {
          const guestResumes = loadLocalResumes();
          activeUserIdRef.current = null;
          hydratingUserIdRef.current = null;
          pendingCloudSavesRef.current.clear();
          cloudFingerprintsRef.current.clear();
          setAuthResolved(false);
          setUserId(null);
          setStorageMode("local");
          setResumes(guestResumes);
          setSelectedId(guestResumes[0]?.id ?? null);
        }
        void loadCloudData(session.user);
      }
    });
    function retryCloudLoad() {
      if (!activeUserIdRef.current) void loadCloudData();
    }
    window.addEventListener("online", retryCloudLoad);
    return () => {
      mounted = false;
      window.removeEventListener("online", retryCloudLoad);
      subscription.unsubscribe();
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

  function createResume(language: ResumeLanguage, templateId: ResumeTemplateId) {
    const next = createEmptyResume(language);
    next.title = language === "en-US"
      ? `English Resume ${resumes.length + 1}`
      : `简历版本 ${resumes.length + 1}`;
    next.templateId = templateId;
    setResumes((current) => [next, ...current]);
    setSelectedId(next.id);
    setActiveSection("basic");
    setShowCreateDialog(false);
  }

  function importResume(draft: ImportedResumeDraft, mode: ResumeImportMode) {
    const next = createResumeFromImport(draft);
    setResumes((current) => [next, ...current]);
    setSelectedId(next.id);
    setActiveSection("basic");
    setShowImportDialog(false);
    setSaveState(
      storageMode === "cloud"
        ? `${mode === "ai" ? "AI 复核结果" : "程序解析结果"}已导入，正在同步到账号`
        : `${mode === "ai" ? "AI 复核结果" : "程序解析结果"}已导入并保存到本地`,
    );
    void track("resume_import_created", {
      resume_id: next.id,
      source: "file",
      education_count: next.content.education.length,
      work_count: next.content.work.length,
      project_count: next.content.projects.length,
      language: draft.language,
      review_mode: mode,
    });
  }

  async function translateResume() {
    if (translating) return;
    const hasTranslatableContent =
      Object.values(selectedResume.content.basics).some((value) => typeof value === "string" && value.trim()) ||
      selectedResume.content.education.length > 0 ||
      selectedResume.content.work.length > 0 ||
      selectedResume.content.projects.length > 0 ||
      selectedResume.content.skills.length > 0 ||
      selectedResume.content.campus.length > 0 ||
      selectedResume.content.awards.length > 0;
    if (!hasTranslatableContent) {
      setSaveState("当前简历还没有可翻译内容");
      return;
    }
    const sourceLanguage = getResumeLanguage(selectedResume.templateId);
    const targetLanguage: ResumeLanguage = sourceLanguage === "en-US" ? "zh-CN" : "en-US";
    setTranslating(true);
    setSaveState(targetLanguage === "en-US" ? "AI 正在生成英文译本" : "AI 正在生成中文译本");
    try {
      const result = await requestResumeTranslation(selectedResume, targetLanguage);
      const next = createResumeFromTranslation(selectedResume, result.translated, targetLanguage);
      setResumes((current) => [next, ...current]);
      setSelectedId(next.id);
      setActiveSection("basic");
      setSaveState(result.warnings.length > 0 ? "译本已生成，请重点检查专有名词" : "译本已生成，原简历保持不变");
      void track("resume_translation_created", {
        source_resume_id: selectedResume.id,
        resume_id: next.id,
        target_language: targetLanguage,
      });
    } catch (error) {
      setSaveState(error instanceof Error ? error.message : "AI 翻译失败，原简历未改变");
    } finally {
      setTranslating(false);
    }
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
    cloudFingerprintsRef.current.delete(id);
    pendingCloudSavesRef.current.delete(id);
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
          <Link href="/extension" className="muted-button pressable inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold">
            <Puzzle aria-hidden="true" className="size-4" />
            网申助手
          </Link>
          <Button variant="secondary" onClick={() => setShowImportDialog(true)} className="gap-2">
            <FileUp aria-hidden="true" className="size-4" />
            导入简历
          </Button>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus aria-hidden="true" className="size-4" />
            新建简历
          </Button>
        </div>
      </section>

      {showImportDialog ? (
        <ResumeImportDialog
          onClose={() => setShowImportDialog(false)}
          onImport={importResume}
        />
      ) : null}

      {showCreateDialog ? (
        <ResumeCreateDialog
          onClose={() => setShowCreateDialog(false)}
          onCreate={createResume}
        />
      ) : null}

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
                  className="muted-button pressable inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold disabled:pointer-events-none disabled:opacity-55"
                  disabled={translating}
                  title="AI 翻译会创建独立副本，不覆盖当前简历"
                  onClick={() => void translateResume()}
                >
                  {translating ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Languages aria-hidden="true" className="size-4" />}
                  {translating
                    ? "正在翻译"
                    : getResumeLanguage(selectedResume.templateId) === "en-US"
                      ? "AI 转中文"
                      : "AI 转英文"}
                </button>
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
              <ResumeTemplatePicker
                language={getResumeLanguage(selectedResume.templateId)}
                selectedTemplateId={selectedResume.templateId}
                onChange={updateTemplate}
              />
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
                preserveDraft={() => saveLocalResumes(resumes, userId)}
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
