"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, FileText, Plus, Trash2 } from "lucide-react";
import { ResumeEditor, type EditorSection } from "@/components/resume/ResumeEditor";
import { ResumePdfExportButton } from "@/components/resume/ResumePdfExportButton";
import { ResumePreview } from "@/components/resume/ResumePreview";
import { Button } from "@/components/ui/Button";
import { getCurrentUserOrNull } from "@/lib/auth";
import {
  createEmptyResume,
  createSampleResume,
  getResumeTemplateMeta,
  loadLocalResumes,
  saveLocalResumes,
  type ResumeDocument,
} from "@/lib/resume";
import {
  deleteMyResume,
  fetchMyResumes,
  isMissingResumeTableError,
  upsertMyResume,
} from "@/lib/resume-sync";
import { fetchActiveJobs } from "@/lib/jobs";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Job } from "@/lib/types";

type StorageMode = "local" | "cloud";

export function ResumeBuilderClient() {
  const [resumes, setResumes] = useState<ResumeDocument[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<EditorSection>("basic");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState("已保存到本地");
  const [storageMode, setStorageMode] = useState<StorageMode>("local");
  const [userId, setUserId] = useState<string | null>(null);
  const cloudFingerprintRef = useRef("");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const stored = loadLocalResumes();
      const initial = stored.length > 0 ? stored : [createSampleResume()];
      setResumes(initial);
      setSelectedId(initial[0]?.id ?? null);
      setLoaded(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveLocalResumes(resumes);

    if (storageMode !== "cloud" || !userId || !isSupabaseConfigured()) {
      const timer = window.setTimeout(() => setSaveState("已保存到本地"), 120);
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
        if (isMissingResumeTableError(error)) {
          setStorageMode("local");
          setSaveState("云端未启用，已保存到本地");
          return;
        }
        setSaveState("同步失败，已保存到本地");
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

      const [rows, cloudResumesResult] = await Promise.allSettled([
        fetchActiveJobs(supabase),
        fetchMyResumes(supabase),
      ]);

      if (!mounted) return;

      if (rows.status === "fulfilled") setJobs(rows.value);

      if (cloudResumesResult.status === "rejected") {
        if (isMissingResumeTableError(cloudResumesResult.reason)) {
          setStorageMode("local");
          setSaveState("云端未启用，已保存到本地");
          return;
        }
        setStorageMode("local");
        setSaveState("同步失败，已保存到本地");
        return;
      }

      const cloudResumes = cloudResumesResult.value;
      setStorageMode("cloud");

      if (cloudResumes.length > 0) {
        const fingerprint = JSON.stringify(cloudResumes);
        cloudFingerprintRef.current = fingerprint;
        setResumes(cloudResumes);
        setSelectedId((current) =>
          current && cloudResumes.some((resume) => resume.id === current)
            ? current
            : cloudResumes[0]?.id ?? null,
        );
        setSaveState("已同步到账号");
        return;
      }

      const localResumes = loadLocalResumes();
      const initial = localResumes.length > 0 ? localResumes : [createSampleResume()];
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

  function updateResume(nextResume: ResumeDocument) {
    setSaveState("正在保存");
    setResumes((current) =>
      current.map((resume) => (resume.id === nextResume.id ? nextResume : resume)),
    );
    setSelectedId(nextResume.id);
  }

  function createResume() {
    const next = createEmptyResume();
    next.title = `简历版本 ${resumes.length + 1}`;
    setResumes((current) => [next, ...current]);
    setSelectedId(next.id);
    setActiveSection("basic");
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
          setSaveState("云端未启用，已保存到本地");
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
            <p className="page-kicker">求职材料</p>
            <h1 className="page-title">简历制作</h1>
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
          <p className="page-kicker">求职材料</p>
          <h1 className="page-title">简历制作</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="status-pill rounded-full px-3 py-2 text-sm text-ink-secondary">
            {saveState}
          </span>
          <Button onClick={createResume} className="gap-2">
            <Plus aria-hidden="true" className="size-4" />
            新建简历
          </Button>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-3 xl:sticky xl:top-24 xl:self-start">
          <div className="flex items-center justify-between">
            <h2 className="section-title">我的简历</h2>
            <span className="section-meta">{resumes.length} 份</span>
          </div>
          <div className="space-y-2">
            {resumes.map((resume) => (
              <button
                key={resume.id}
                type="button"
                className={`w-full rounded-[22px] px-4 py-3 text-left transition ${
                  selectedResume.id === resume.id
                    ? "bg-white/[0.075] text-ink-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]"
                    : "text-ink-secondary hover:bg-white/[0.045]"
                }`}
                onClick={() => setSelectedId(resume.id)}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <FileText aria-hidden="true" className="size-4 text-nebula-blue" />
                  {resume.title || "未命名简历"}
                </span>
                <span className="mt-1 block text-xs text-ink-muted">
                  {resume.targetRole || resume.content.basics.targetRole || "未设置方向"}
                </span>
                <span className="mt-2 inline-flex rounded-full bg-white/[0.055] px-2 py-1 text-[11px] text-ink-muted">
                  {getResumeTemplateMeta(resume.templateId).label}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <div className="grid gap-6 2xl:grid-cols-[minmax(420px,0.88fr)_minmax(560px,1fr)]">
          <section className="liquid-panel min-w-0 p-5">
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
                  className="muted-button pressable inline-flex size-9 items-center justify-center rounded-full"
                  aria-label="复制简历"
                  title="复制简历"
                  onClick={() => duplicateResume(selectedResume)}
                >
                  <Copy aria-hidden="true" className="size-4" />
                </button>
                <button
                  type="button"
                  className="muted-button pressable inline-flex size-9 items-center justify-center rounded-full text-red-200"
                  aria-label="删除简历"
                  title="删除简历"
                  onClick={() => deleteResume(selectedResume.id)}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </div>
            </div>
            <ResumeEditor
              resume={selectedResume}
              jobs={jobs}
              activeSection={activeSection}
              onSectionChange={setActiveSection}
              onChange={updateResume}
            />
          </section>

          <section className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="section-title">实时预览</h2>
                <p className="mt-1 text-xs text-ink-muted">
                  {getResumeTemplateMeta(selectedResume.templateId).label}，下载时生成可复制文字的正式 PDF
                </p>
              </div>
              <ResumePdfExportButton resume={selectedResume} />
            </div>
            <div className="overflow-x-auto pb-4">
              <ResumePreview resume={selectedResume} />
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
