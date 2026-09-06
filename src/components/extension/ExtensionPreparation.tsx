"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";
import { ApplicationPrepPanel } from "@/components/resume/ApplicationPrepPanel";
import { getCurrentUserOrNull } from "@/lib/auth";
import {
  createSampleResume,
  isSampleResume,
  loadLocalResumes,
  saveLocalResumes,
  type ResumeDocument,
} from "@/lib/resume";
import {
  fetchMyResumes,
  getResumeSyncErrorMessage,
  upsertMyResume,
} from "@/lib/resume-sync";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

type StorageMode = "local" | "cloud" | "preview";

export function ExtensionPreparation({
  onClose,
  onContinue,
}: {
  onClose: () => void;
  onContinue: (resumeId: string) => void;
}) {
  const [resumes, setResumes] = useState<ResumeDocument[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [storageMode, setStorageMode] = useState<StorageMode>("preview");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState("正在读取当前简历");
  const saveTimerRef = useRef<number | null>(null);
  const pendingCloudResumeRef = useRef<ResumeDocument | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const localResumes = loadLocalResumes().filter((resume) => !isSampleResume(resume));
    const preview = localResumes.length > 0 ? localResumes : [createSampleResume()];
    const initialTimer = window.setTimeout(() => {
      if (!mountedRef.current) return;
      setResumes(preview);
      setSelectedId(preview[0]?.id ?? null);
    }, 0);

    async function loadCloudResumes() {
      if (!isSupabaseConfigured()) {
        if (mountedRef.current) {
          setStorageMode(localResumes.length > 0 ? "local" : "preview");
          setSaveState(localResumes.length > 0 ? "已读取本地简历" : "当前为示例资料，仅用于预览");
          setLoading(false);
        }
        return;
      }

      try {
        const supabase = createClient();
        const user = await getCurrentUserOrNull(supabase);
        if (!mountedRef.current) return;
        setUserId(user?.id ?? null);

        if (!user) {
          setStorageMode(localResumes.length > 0 ? "local" : "preview");
          setSaveState(localResumes.length > 0 ? "已读取本地简历" : "当前为示例资料，仅用于预览");
          setLoading(false);
          return;
        }

        const cloudResumes = (await fetchMyResumes(supabase)).filter((resume) => !isSampleResume(resume));
        if (cloudResumes.length > 0) {
          setResumes(cloudResumes);
          setSelectedId(cloudResumes[0].id);
          setStorageMode("cloud");
          setSaveState("已读取云端简历");
        } else if (localResumes.length > 0) {
          setStorageMode("local");
          setSaveState("当前使用本地简历，保存后可回简历页同步云端");
        } else {
          setStorageMode("preview");
          setSaveState("当前为示例资料，编辑后会保存为本地简历");
        }
      } catch {
        if (!mountedRef.current) return;
        setStorageMode(localResumes.length > 0 ? "local" : "preview");
        setSaveState(localResumes.length > 0 ? "云端暂时不可用，已使用本地简历" : "云端暂时不可用，当前为示例资料");
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    }

    void loadCloudResumes();
    return () => {
      mountedRef.current = false;
      window.clearTimeout(initialTimer);
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  const selectedResume = resumes.find((resume) => resume.id === selectedId) ?? resumes[0] ?? null;

  function persistCloud(resume: ResumeDocument) {
    if (storageMode !== "cloud" || !userId) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    pendingCloudResumeRef.current = resume;
    setSaveState("正在保存到云端");
    saveTimerRef.current = window.setTimeout(() => {
      void (async () => {
        try {
          await upsertMyResume(createClient(), userId, resume);
          if (pendingCloudResumeRef.current?.updatedAt === resume.updatedAt) pendingCloudResumeRef.current = null;
          if (mountedRef.current) setSaveState("已保存到云端");
        } catch (error) {
          if (mountedRef.current) setSaveState(getResumeSyncErrorMessage(error));
        }
      })();
    }, 650);
  }

  function handleResumeChange(nextResume: ResumeDocument) {
    setResumes((current) => current.map((resume) => (resume.id === nextResume.id ? nextResume : resume)));
    if (storageMode === "cloud") {
      persistCloud(nextResume);
      return;
    }

    if (storageMode === "preview") {
      setStorageMode("local");
      setSaveState("已保存到本地，之后可同步到扩展");
    } else {
      setSaveState("已保存到本地");
    }
    const nextResumes = resumes.map((resume) => (resume.id === nextResume.id ? nextResume : resume));
    saveLocalResumes(nextResumes.filter((resume) => !isSampleResume(resume)), userId);
  }

  function finishPreparation() {
    const pendingResume = pendingCloudResumeRef.current;
    if (pendingResume && storageMode === "cloud" && userId) {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      pendingCloudResumeRef.current = null;
      void upsertMyResume(createClient(), userId, pendingResume).catch(() => undefined);
    }
    onContinue(selectedResume?.id ?? "");
  }

  if (loading && !selectedResume) {
    return (
      <div className="mt-8 flex min-h-40 items-center justify-center rounded-2xl border border-[color:var(--line-ghost)] bg-[color:var(--surface-read-bg-strong)] text-sm text-ink-muted">
        <LoaderCircle aria-hidden="true" className="mr-2 size-4 animate-spin" />正在读取当前简历
      </div>
    );
  }

  if (!selectedResume) return null;

  return (
    <div className="mt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--surface-selected-bg)] text-[color:var(--aurora)]">
            <Sparkles aria-hidden="true" className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-primary">先准备，再打开插件填写</p>
            <p className="truncate text-xs text-ink-muted" aria-live="polite">{saveState}</p>
          </div>
        </div>
      </div>
      {storageMode === "preview" ? (
        <p className="mb-4 rounded-xl border border-dashed border-[color:var(--line-ghost)] bg-white/70 px-4 py-3 text-xs leading-6 text-ink-muted">
          这是示例资料，只用于让你体验流程；修改任意字段后会生成本地简历，不会把示例内容同步到扩展。
        </p>
      ) : null}
      <ApplicationPrepPanel
        resume={selectedResume}
        onChange={handleResumeChange}
        resumeOptions={resumes}
        onSelectResume={setSelectedId}
        onOpenSection={() => window.location.assign("/resume")}
        onSkip={onClose}
        onFinish={finishPreparation}
      />
    </div>
  );
}
