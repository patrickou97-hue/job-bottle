"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, FileText, FileUp, LoaderCircle, LockKeyhole, Plus, Save, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { getCurrentUserOrNull } from "@/lib/auth";
import { extractResumeFileText } from "@/lib/resume-file-reader";
import { createResumeFromImport, type ImportedResumeDraft } from "@/lib/resume-import";
import { getResumeLanguage, forgetLocalResume, isSampleResume, resumeRecordState, loadLocalResumes, mergeResumeCollections, saveLocalResumes, type ResumeDocument } from "@/lib/resume";
import { DeletedResumeError, fetchMyResumes, upsertMyResume } from "@/lib/resume-sync";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { formatVipReset, VIP_ADVANCED_HOURLY_LIMIT, VIP_ADVANCED_WEEKLY_LIMIT, VIP_COMPOSE_DAILY_LIMIT, VIP_COMPOSE_WEEKLY_LIMIT, VIP_COMPOSE_SECTIONS, VIP_COMPOSE_SECTION_KEYS, VIP_FLASH_LABEL, VIP_MAX_MATERIAL_LENGTH, type VipComposeSection } from "@/lib/starjob-vip";
import { refreshVipStatus, useVipStatus } from "@/components/vip/useVipStatus";
import { ResumePreview } from "@/components/resume/ResumePreview";
import { ResumePdfExportButton } from "@/components/resume/ResumePdfExportButton";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { VipMark } from "@/components/vip/VipMark";

type Material = { id: string; name: string; text: string };
type Result = { draft: ImportedResumeDraft; review: string[] };
type Context = { userId: string | null; sources: ResumeDocument[] };

const maxFiles = 5;
const example = `实习交接笔记｜明澄零售，2025 年暑期。林晨负责收集门店补货问题，整理访谈记录。和督导一起改了补货指引，发给门店试用，还没统计效果。
第 3 周例会｜林晨核对了三家门店的缺货记录，补货指引的收货登记部分由她更新。
核对用的 SQL｜作者：林晨。SELECT store_id, COUNT(*) FROM stockout_log GROUP BY store_id；用于按门店核对缺货记录。
另一件事：校园旧衣回收活动，我和同学一起办的。我负责联系场地和安排志愿者轮班，结束后把交接清单留给下一届。`;

export function VipWorkbench() {
  const { status, error: statusError } = useVipStatus(true);
  const [context, setContext] = useState<Context | null>(null);
  const [sourceId, setSourceId] = useState("");
  const [document, setDocument] = useState<ResumeDocument | null>(null);
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<Material[]>([]);
  const [role, setRole] = useState("");
  const [language, setLanguage] = useState<"zh-CN" | "en-US">("zh-CN");
  const [section, setSection] = useState<VipComposeSection>("all");
  const [writingBrief, setWritingBrief] = useState("");
  const [instruction, setInstruction] = useState("");
  const [review, setReview] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [canOpenDraft, setCanOpenDraft] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [busy, setBusy] = useState<"compose" | "revise" | "save" | null>(null);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileReadingRef = useRef(false);
  const accountVersion = useRef(0);

  useEffect(() => {
    let sequence = 0;
    let mounted = true;
    let loadedUserId: string | null | undefined;
    const client = isSupabaseConfigured() ? createClient() : null;

    async function load() {
      const revision = ++sequence;
      const user = client ? await getCurrentUserOrNull(client) : null;
      const userId = user?.id ?? null;
      loadedUserId = userId;
      const cloud = client && userId ? await fetchMyResumes(client, userId).catch(() => []) : [];
      if (!mounted || revision !== sequence) return;
      const entries = mergeResumeCollections(loadLocalResumes(userId), cloud).filter((resume) => !isSampleResume(resume));
      const draft = entries.find((resume) => resume.generationSource === "materials") ?? null;
      const sources = entries.filter((resume) => resume.id !== draft?.id);
      setContext({ userId, sources });
      setSourceId(sources.find((resume) => Object.entries(resume.content.basics).some(([key, value]) => key !== "targetRole" && value?.trim()))?.id ?? "");
      setDocument(draft);
      setCanOpenDraft(Boolean(draft));
      setRole(draft?.targetRole ?? "");
      setLanguage(draft ? getResumeLanguage(draft.templateId) : "zh-CN");
      setReview([]);
    }

    void load();
    const auth = client?.auth.onAuthStateChange((event, session) => {
      if ((event !== "SIGNED_OUT" && event !== "SIGNED_IN") || (session?.user.id ?? null) === loadedUserId) return;
      accountVersion.current += 1;
      abortRef.current?.abort();
      setContext(null);
      setDocument(null);
      setCanOpenDraft(false);
      setNotes("");
      setFiles([]);
      setInstruction("");
      setWritingBrief("");
      setRole("");
      setReview([]);
      setError("");
      setSaveMessage("");
      window.setTimeout(() => { if (mounted) void load(); }, 0);
    });
    return () => {
      mounted = false;
      abortRef.current?.abort();
      auth?.data.subscription.unsubscribe();
    };
  }, []);

  const source = context?.sources.find((resume) => resume.id === sourceId);
  const materials = [notes.trim(), ...files.map((file) => `【${file.name}】\n${file.text}`)].filter(Boolean).join("\n\n");
  const active = Boolean(status?.active);
  const canCompose = Boolean(status?.unlimited || (status?.composeRemaining && status.composeWeeklyRemaining));
  const canRevise = Boolean(status?.advancedAvailable && (status.unlimited || (status.advancedHourlyRemaining && status.advancedWeeklyRemaining)));
  const materialReady = materials.length >= 30 && materials.length <= VIP_MAX_MATERIAL_LENGTH;

  async function addFiles(list: FileList | File[]) {
    if (!active || busy || fileReadingRef.current) return;
    const version = accountVersion.current;
    fileReadingRef.current = true;
    setReading(true);
    setError("");
    const available = maxFiles - files.length;
    const incoming = Array.from(list);
    const errors: string[] = incoming.length > available ? [`最多可上传 ${maxFiles} 个文件。`] : [];
    const added: Material[] = [];
    let length = materials.length;
    for (const file of incoming.slice(0, available)) {
      try {
        const text = await extractResumeFileText(file, "materials");
        if (!text) throw new Error("未读取到文字。");
        const addedLength = text.length + file.name.length + 5;
        if (length + addedLength > VIP_MAX_MATERIAL_LENGTH) throw new Error("总材料超出字数限制，可改为粘贴关键段落。");
        length += addedLength;
        added.push({ id: crypto.randomUUID(), name: file.name, text });
      } catch (cause) {
        errors.push(`${file.name}：${cause instanceof Error ? cause.message : "读取失败。"}`);
      }
    }
    if (version === accountVersion.current) {
      setFiles((previous) => [...previous, ...added]);
      setError(errors.join(" "));
    }
    fileReadingRef.current = false;
    setReading(false);
  }

  async function save(resume: ResumeDocument, userId: string | null) {
    const version = accountVersion.current;
    if (resumeRecordState(userId, resume.id) === "deleted") {
      setDocument(null);
      setCanOpenDraft(false);
      setSaveMessage("这份简历已删除。可以重新用材料生成一份。");
      return;
    }
    const localSaved = saveDraftLocally(resume, userId);
    setCanOpenDraft(localSaved);
    if (userId) {
      try {
        await upsertMyResume(createClient(), userId, resume);
        if (version !== accountVersion.current) return;
        setCanOpenDraft(true);
        setSaveMessage("已同步到简历制作");
        return;
      } catch (error) {
        if (version !== accountVersion.current) return;
        if (error instanceof DeletedResumeError) {
          forgetLocalResume(userId, resume.id);
          setDocument(null);
          setCanOpenDraft(false);
          setSaveMessage("这份简历已删除。可以重新用材料生成一份。");
          return;
        }
        setSaveMessage(localSaved ? "已保存到本机，云端同步暂未完成。" : "保存未完成，请重试。");
        return;
      }
    }
    setSaveMessage(localSaved ? "已保存到简历制作" : "保存未完成，请检查浏览器存储后重试。");
  }

  async function generate(event: FormEvent, revise = false) {
    event.preventDefault();
    if (!context || !active || busy || reading || abortRef.current) return;
    const previous = document;
    const version = accountVersion.current;
    if (revise ? !previous || !instruction.trim() || !canRevise : !materialReady || !canCompose) return;
    setBusy(revise ? "revise" : "compose");
    setError("");
    setSaveMessage("");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const current = revise && previous ? Object.fromEntries(
        (section === "all" ? VIP_COMPOSE_SECTION_KEYS.filter((key) => key !== "all") : [section])
          .map((key) => [key, previous.content[key]]),
      ) : undefined;
      const response = await fetch("/api/vip/compose", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
        body: JSON.stringify({
          materials, role, language: revise && previous ? getResumeLanguage(previous.templateId) : language,
          instruction: revise ? instruction : writingBrief, section: revise ? section : "all", current,
        }),
      });
      const payload = await response.json() as Partial<Result> & { error?: string };
      if (!response.ok || !payload.draft) throw new Error(payload.error || "暂时无法生成草稿，请重试。");
      if (controller.signal.aborted) return;
      const generated = createResumeFromImport(payload.draft, (previous ?? source)?.templateId);
      const person = revise ? previous : source ?? previous;
      const basics = person ? {
        ...person.content.basics,
        name: person.content.basics.name || generated.content.basics.name,
        targetRole: generated.targetRole,
      } : generated.content.basics;
      if (previous) {
        const latest = loadLocalResumes(context.userId).find((resume) => resume.id === previous.id);
        if (latest && latest.updatedAt > previous.updatedAt) {
          setDocument(latest);
          throw new Error("这份简历已在另一页面更新，已载入最新版。请重新提交修改。");
        }
      }
      if (revise && previous) {
        const content = { ...previous.content, basics };
        for (const key of VIP_COMPOSE_SECTION_KEYS) {
          if (key !== "all" && (section === "all" || section === key) && generated.content[key].length) {
            Object.assign(content, { [key]: generated.content[key] });
          }
        }
        generated.content = content;
      } else {
        generated.content.basics = basics;
        if (!generated.content.education.length && previous?.content.education.length) {
          generated.content.education = previous.content.education;
        }
      }
      if (!previous && context.userId) {
        const firstId = await accountMaterialsId(context.userId);
        if (resumeRecordState(context.userId, firstId) !== "deleted") generated.id = firstId;
      }
      if (controller.signal.aborted || accountVersion.current !== version) return;
      const next: ResumeDocument = {
        ...generated, generationSource: "materials",
        id: previous?.id ?? generated.id,
        title: previous?.title ?? (language === "en-US" ? "Resume from materials" : "材料生成简历"),
        createdAt: previous?.createdAt ?? generated.createdAt,
        jobTarget: previous?.jobTarget ?? generated.jobTarget,
        linkedJobId: previous?.linkedJobId ?? generated.linkedJobId,
      };
      setDocument(next);
      setReview(payload.review ?? []);
      if (revise) setInstruction("");
      if (window.matchMedia("(max-width: 780px)").matches) resultRef.current?.scrollIntoView({ block: "start" });
      await save(next, context.userId);
    } catch (cause) {
      if (accountVersion.current !== version) return;
      setError(controller.signal.aborted ? "已取消生成。" : cause instanceof Error ? cause.message : "连接中断，请重试。");
    } finally {
      abortRef.current = null;
      setBusy(null);
      refreshVipStatus();
    }
  }

  const ready = active && context !== null;
  return (
    <div className="materials-page observatory-page">
      <Link href="/resume" className="materials-back"><ArrowLeft size={16} /> 简历制作</Link>
      <section className="page-hero materials-hero">
        <div>
          <h1 className="page-title">用材料生成简历</h1>
          <p className="page-subtitle mt-3">粘贴笔记或上传文档，按简历模块整理后直接预览。</p>
        </div>
        <span className="materials-model"><VipMark /> {VIP_FLASH_LABEL}</span>
      </section>

      {active && status ? (
        <div className="materials-usage" aria-label="用量和恢复时间">
          {status.unlimited ? <p>管理员 · 已开放的 AI 功能不限次数</p> : <>
          <Usage label="今日整份生成" remaining={status.composeRemaining} total={VIP_COMPOSE_DAILY_LIMIT} reset={status.composeResetAt} />
          <Usage label="本周整份生成" remaining={status.composeWeeklyRemaining} total={VIP_COMPOSE_WEEKLY_LIMIT} reset={status.weeklyResetAt} />
          {status.advancedAvailable && <Usage label="高级服务 · 60 分钟" remaining={status.advancedHourlyRemaining} total={VIP_ADVANCED_HOURLY_LIMIT} reset={status.advancedHourlyResetAt} />}
          {status.advancedAvailable && <Usage label="高级服务 · 本周" remaining={status.advancedWeeklyRemaining} total={VIP_ADVANCED_WEEKLY_LIMIT} reset={status.weeklyResetAt} />}
          </>}
        </div>
      ) : null}

      {statusError ? <p className="materials-alert" role="alert">暂时无法获取 VIP 状态，请刷新页面重试。</p> : null}
      {!active && status ? (
        <div className="materials-locked">
          <LockKeyhole size={18} /> <span>开通 StarJob VIP 即可使用材料生成与继续修改。</span>
          <Link href="/vip" className="materials-link">查看 VIP 权益 <ArrowRight size={16} /></Link>
        </div>
      ) : null}

      <div className="materials-grid">
        <div className="materials-input">
          <form onSubmit={(event) => void generate(event)}>
            <fieldset disabled={!ready || Boolean(busy)}>
              <div className="materials-heading">
                <div><h2>上传材料</h2><p>周报、会议纪要、课程报告和 SQL 可以一起上传。</p></div>
                <button type="button" className="materials-link" onClick={() => setNotes(example)}>填入示例</button>
              </div>
              <label className="materials-field" htmlFor="compose-source">
                已有简历的个人信息
                <Select id="compose-source" value={sourceId} onChange={(event) => setSourceId(event.target.value)}>
                  <option value="">{context?.sources.length ? "不带入，生成后可补充" : "暂无可带入的简历"}</option>
                  {context?.sources.map((resume) => <option key={resume.id} value={resume.id}>{resume.title}</option>)}
                </Select>
                <small>{source ? `已选 ${source.content.basics.name || source.content.basics.englishName || source.title} 的个人信息，直接带入预览。` : "若有已有简历，可自动带入姓名、联系方式和照片。"} 联系方式和照片只在浏览器中合并。</small>
              </label>
              <label className="materials-field" htmlFor="compose-materials">
                材料文字
                <Textarea id="compose-materials" rows={6} maxLength={VIP_MAX_MATERIAL_LENGTH} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="例如：去年暑期在运营部实习，每周整理活动数据……" />
              </label>
              <div className="materials-count"><span>建议先删掉身份证号等敏感内容</span><span aria-live="off">{materials.length.toLocaleString("zh-CN")} / 12,000</span></div>
              <input type="file" ref={inputRef} multiple accept=".pdf,.docx,.txt,.sql" className="sr-only" tabIndex={-1} onChange={(event) => {
                if (event.currentTarget.files) void addFiles(event.currentTarget.files);
                event.currentTarget.value = "";
              }} />
              <button type="button" className="materials-upload" data-dragging={dragging} disabled={reading || files.length >= maxFiles}
                onClick={() => inputRef.current?.click()}
                onDragOver={(event) => { event.preventDefault(); if (ready) setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => { event.preventDefault(); setDragging(false); void addFiles(event.dataTransfer.files); }}>
                {reading ? <LoaderCircle className="motion-safe:animate-spin" size={19} /> : <FileUp size={19} />}
                <span><strong>{reading ? "正在读取文件" : "添加文件或拖到这里"}</strong><small>PDF、DOCX、TXT、SQL · 最多 5 个，每个 8 MB；PDF 读取前 12 页</small></span>
                <Plus size={17} />
              </button>
              {files.length ? <ul className="materials-files">{files.map((file) => (
                <li key={file.id}><FileText size={15} /><span>{file.name}</span><button type="button" aria-label={`移除 ${file.name}`} onClick={() => setFiles((previous) => previous.filter((item) => item.id !== file.id))}><X size={16} /></button></li>
              ))}</ul> : null}
              <div className="materials-settings">
                <label className="materials-field">目标岗位（选填）<input className="field-shell" placeholder="可填写任意岗位，或留空" value={role} maxLength={150} onChange={(event) => setRole(event.target.value)} /></label>
                <label className="materials-field">简历语言<Select value={language} onChange={(event) => setLanguage(event.target.value === "en-US" ? "en-US" : "zh-CN")}><option value="zh-CN">中文</option><option value="en-US">English</option></Select></label>
              </div>
              <label className="materials-field">这份简历想突出什么？（选填）
                <Textarea rows={2} maxLength={800} value={writingBrief} onChange={(event) => setWritingBrief(event.target.value)} placeholder="例如：重点写实习中由我完成的工作，把课程项目单独列出。" />
              </label>
              <Button type="submit" className="mt-4 gap-2" disabled={reading || !materialReady || !canCompose}>
                <Sparkles size={17} /> {document ? "用材料重新生成整份" : "生成简历"}
              </Button>
            </fieldset>
          </form>
          {document && status?.advancedAvailable ? (
            <form className="materials-revise" onSubmit={(event) => void generate(event, true)}>
              <fieldset disabled={!ready || Boolean(busy)}>
                <h2>让 AI 继续修改</h2>
                <p>使用高级模型修改整份简历或指定模块。结果保存为同一份简历，与高级润色共享额度。</p>
                <label className="materials-field">修改范围
                  <Select value={section} onChange={(event) => setSection(event.target.value as VipComposeSection)}>
                    {VIP_COMPOSE_SECTIONS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </Select>
                </label>
                <label className="materials-field">修改要求
                  <Textarea rows={3} value={instruction} maxLength={800} onChange={(event) => setInstruction(event.target.value)} placeholder="例如：把实习描述精简为两条，保留我负责的任务和交付物。" />
                </label>
                <Button type="submit" variant="secondary" className="mt-4 gap-2" disabled={reading || !canRevise || !instruction.trim()}>应用 AI 修改 <ArrowRight size={16} /></Button>
              </fieldset>
            </form>
          ) : null}
          {document && status && !status.advancedAvailable && <p className="materials-back">高级模型继续修改将与正式付费版一起发布。你可以在简历制作中使用基础润色。</p>}
          {busy === "compose" || busy === "revise" ? <Button className="mt-3" variant="secondary" onClick={() => abortRef.current?.abort()}>取消当前请求</Button> : null}
          {error ? <p className="materials-alert" role="alert">{error}</p> : null}
        </div>

        <section className="materials-preview" aria-labelledby="material-preview-title" ref={resultRef} aria-busy={Boolean(busy)}>
          <div className="materials-heading">
            <div><h2 id="material-preview-title">简历预览</h2><p>{document ? "与简历制作使用同一 A4 模板。" : "生成后可在这里核对整份简历。"}</p></div>
            {document && canOpenDraft ? <Link className="materials-link" href={`/resume?resume=${document.id}#resume-editor`}>打开编辑器 <ArrowRight size={16} /></Link> : null}
          </div>
          {document && status && !status.advancedAvailable && <p className="materials-back">高级模型继续修改将与正式付费版一起发布。你可以在简历制作中使用基础润色。</p>}
          {busy === "compose" || busy === "revise" ? (
            <p className="materials-progress" role="status"><LoaderCircle className="motion-safe:animate-spin" size={17} /> {busy === "compose" ? "正在按模块整理材料…" : "正在更新所选模块…"}</p>
          ) : null}
          {document ? (
            <>
              <div className="materials-preview-actions">
                <Button variant="secondary" disabled={Boolean(busy)} className="gap-2" onClick={() => {
                  if (!context) return;
                  setBusy("save"); setSaveMessage("正在保存…");
                  void save(document, context.userId).finally(() => setBusy(null));
                }}><Save size={16} /> 保存简历</Button>
                <ResumePdfExportButton resume={document} localPreview={status?.preview} preserveDraft={() => saveDraftLocally(document, context?.userId ?? null)} />
              </div>
              {saveMessage ? <p className="materials-save" role="status">{saveMessage}</p> : null}
              {!busy && canOpenDraft && <CompletionLinks resume={document} />}
              <ResumePreview resume={document} showTextVersion />
              {review.length ? <div className="materials-review"><strong>生成后请核对</strong><ul>{review.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
            </>
          ) : <div className="materials-empty"><FileText size={30} strokeWidth={1.4} /><strong>等待生成简历</strong><p>教育、实习、项目和技能会按模块排版。</p></div>}
        </section>
      </div>
    </div>
  );
}

function CompletionLinks({ resume }: { resume: ResumeDocument }) {
  const { basics, education } = resume.content;
  const missingEducation = [];
  if (!education.length || education.some((item) => !item.school?.trim())) missingEducation.push("学校");
  if (!education.length || education.some((item) => !item.major?.trim())) missingEducation.push("专业");
  const missingBasics = [];
  if (!basics.name?.trim() && !basics.englishName?.trim()) missingBasics.push("姓名");
  if (!basics.email?.trim() && !basics.phone?.trim()) missingBasics.push("联系方式");
  const editor = `/resume?resume=${encodeURIComponent(resume.id)}`;
  if (!missingEducation.length && !missingBasics.length && basics.photoDataUrl) return null;
  return (
    <aside className="materials-complete" aria-label="补充简历资料">
      <h3>在简历制作中补充资料</h3>
      <div>
        {missingEducation.length > 0 && <Link className="materials-link" href={`${editor}&section=education#resume-editor`}>补充{missingEducation.join("、")} <ArrowRight size={14} /></Link>}
        {missingBasics.length > 0 && <Link className="materials-link" href={`${editor}&section=basic#resume-editor`}>填写{missingBasics.join("、")} <ArrowRight size={14} /></Link>}
        {!basics.photoDataUrl && <Link className="materials-link" href={`${editor}&section=basic#resume-editor`}>上传照片（选填） <ArrowRight size={14} /></Link>}
      </div>
    </aside>
  );
}

function Usage({ label, remaining, total, reset }: { label: string; remaining: number; total: number; reset: string | null }) {
  return <div><span>{label}</span><strong>{remaining} <small>/ {total}</small></strong><small>{reset ? `${formatVipReset(reset)} 恢复` : "当前额度充足"}</small></div>;
}

function saveDraftLocally(resume: ResumeDocument, userId: string | null) {
  const entries = loadLocalResumes(userId).filter((item) => !isSampleResume(item) && item.id !== resume.id);
  return saveLocalResumes([resume, ...entries], userId);
}

async function accountMaterialsId(userId: string) {
  const bytes = new TextEncoder().encode(`starjob-materials-resume:${userId}`);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)).slice(0, 16);
  hash[6] = (hash[6] & 0x0f) | 0x80;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = Array.from(hash, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
}
