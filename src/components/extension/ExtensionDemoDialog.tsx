"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon } from "@phosphor-icons/react";
import { MotionDialog } from "@/components/ui/MotionDialog";
import { Button } from "@/components/ui/Button";

type ExtensionDemoDialogProps = {
  onClose: () => void;
};

type DemoStage = "page" | "panel" | "resume" | "result";
type FillMode = "merge" | "overwrite" | "ai";

const stages: Array<{ id: DemoStage; label: string }> = [
  { id: "page", label: "打开网申页" },
  { id: "panel", label: "点开插件" },
  { id: "resume", label: "选择简历" },
  { id: "result", label: "点击填写" },
];

type DemoFormField = {
  label: string;
  value: string;
  kind: "autofill" | "existing";
  wide?: boolean;
  multiline?: boolean;
};

const formFields: DemoFormField[] = [
  { label: "姓名", value: "林星河", kind: "autofill" },
  { label: "目标岗位", value: "产品实习生", kind: "autofill" },
  { label: "手机号", value: "138 0000 2027", kind: "autofill" },
  { label: "邮箱", value: "xinghe.lin@example.com", kind: "autofill" },
  { label: "最高学历", value: "硕士研究生", kind: "existing" },
  { label: "毕业时间", value: "2027 年 06 月", kind: "existing" },
  { label: "学校", value: "西南财经大学", kind: "existing" },
  { label: "专业", value: "市场营销", kind: "existing" },
  { label: "实习经历", value: "字节跳动 · 产品实习生（2025.06—2025.09）", kind: "autofill", wide: true },
  { label: "实习经历描述", value: "参与用户调研与需求梳理，跟进功能上线后的数据反馈。", kind: "autofill", wide: true, multiline: true },
];

export function ExtensionDemoDialog({ onClose }: ExtensionDemoDialogProps) {
  const reducedMotion = useReducedMotion();
  const [stage, setStage] = useState<DemoStage>("page");
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const stageIndex = stages.findIndex((item) => item.id === stage);
  const isLastStage = stage === "result";

  useEffect(() => {
    if (!aiAnalyzing) return;

    const timers = [
      window.setTimeout(() => setAnalysisStep(1), 560),
      window.setTimeout(() => setAnalysisStep(2), 1_180),
      window.setTimeout(() => setAnalysisStep(3), 1_820),
      window.setTimeout(() => {
        setAiAnalyzing(false);
        setStage("result");
      }, 2_600),
    ];

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [aiAnalyzing]);

  function previous() {
    if (aiAnalyzing) return;
    const previousStage = stages[Math.max(0, stageIndex - 1)]?.id;
    setStage(previousStage ?? "page");
  }

  function next() {
    if (isLastStage) {
      onClose();
      return;
    }
    const nextStage = stages[Math.min(stages.length - 1, stageIndex + 1)]?.id;
    setStage(nextStage ?? "result");
  }

  function handleFill(mode: FillMode) {
    if (mode !== "ai") {
      setStage("result");
      return;
    }

    if (reducedMotion) {
      setStage("result");
      return;
    }

    setAnalysisStep(0);
    setAiAnalyzing(true);
  }

  return (
    <MotionDialog
      labelledBy="extension-demo-title"
      describedBy="extension-demo-description"
      overlayClassName="z-[100]"
      className="relative max-w-6xl px-3 pb-[var(--app-safe-content-bottom)] pt-3 sm:px-6 sm:pb-6 sm:pt-5"
      onBackdropClick={onClose}
      onEscapeKeyDown={onClose}
    >
      <div className="mb-3 flex items-start justify-between gap-4 border-b border-[color:var(--line-ghost)] px-1 pb-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.12em] text-[color:var(--aurora)]">Chrome 使用流程 · 模拟演示</p>
          <h2 id="extension-demo-title" className="mt-1 text-lg font-semibold tracking-[-0.025em] text-ink-primary sm:text-xl">
            从插件图标到一键填写
          </h2>
          <p id="extension-demo-description" className="mt-1 max-w-3xl text-[11px] leading-4.5 text-ink-secondary sm:text-xs">
            按真实操作走一遍：打开 Chrome 网申页，点右上角拾星图标，展开插件面板，选择简历后点击填写。这里只改变演示画面，不登录、安装、同步或提交任何真实数据。
          </p>
        </div>
        <span className="hidden shrink-0 rounded-full border border-[color:var(--line-ghost)] px-3 py-1 text-xs text-ink-muted sm:inline-flex">
          {stageIndex + 1} / {stages.length}
        </span>
      </div>

      <div className="mb-3 grid grid-cols-4 gap-1" aria-label="演示步骤">
        {stages.map((item, index) => (
          <div key={item.id}>
            <div className={`h-1.5 rounded-full transition-colors duration-200 ${index <= stageIndex ? "bg-[color:var(--aurora)]" : "bg-[color:var(--surface-subtle-bg)]"}`} />
            <span className="mt-1 block truncate text-[9px] text-ink-muted">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-[#c9ccd1] bg-[#f1f3f4] shadow-[0_18px_52px_rgba(20,32,50,0.16)]">
        <ChromeTabBar />
        <div className="relative">
          <ChromeToolbar stage={stage} onOpenExtension={() => setStage("panel")} />
          <div className="min-h-[390px] bg-white sm:min-h-[430px]">
            <DemoApplicationPage stage={stage} reducedMotion={Boolean(reducedMotion)} aiAnalyzing={aiAnalyzing} />
          </div>
          {stage !== "page" ? <ChromeExtensionPanel stage={stage} aiAnalyzing={aiAnalyzing} analysisStep={analysisStep} onChooseResume={() => setStage("resume")} onFill={handleFill} /> : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <button type="button" className="text-action pressable h-9 px-2 text-xs" onClick={onClose}>
            跳过演示
          </button>
          {stage === "page" ? <p className="mt-1 text-[10px] text-ink-muted">先点浏览器右上角的拾星插件图标</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="text-action pressable h-9 px-2.5 text-xs disabled:opacity-40" onClick={previous} disabled={stage === "page" || aiAnalyzing}>
            <ArrowLeftIcon aria-hidden="true" className="size-3.5" />
            上一步
          </button>
          {isLastStage ? (
            <Button onClick={next}>
              完成演示
              <ArrowRightIcon aria-hidden="true" className="size-3.5" />
            </Button>
          ) : (
            <span className="hidden h-9 items-center rounded-lg border border-[color:var(--line-ghost)] px-2.5 text-[10px] text-ink-muted sm:inline-flex">
              {aiAnalyzing ? "AI 正在分析字段…" : stage === "page" ? "请点击右上角插件图标" : stage === "panel" ? "请在面板中选择简历" : "请在面板中点击填写"}
            </span>
          )}
        </div>
      </div>
    </MotionDialog>
  );
}

function ChromeTabBar() {
  return (
    <div className="flex h-9 items-end gap-1 bg-[#dee1e6] px-2 pt-1 text-[#5f6368]">
      <div className="flex h-7 min-w-0 max-w-[270px] flex-1 items-center gap-1.5 rounded-t-lg bg-white px-2.5 text-[9px] text-[#3c4043] shadow-[0_-1px_0_rgba(0,0,0,0.04)] sm:max-w-[340px]">
        <ChromeLogo />
        <span className="truncate">校园招聘 · 产品实习生申请</span>
        <span className="ml-auto text-sm leading-none">×</span>
      </div>
      <span className="hidden px-2 pb-1.5 text-base leading-none sm:inline">+</span>
      <span className="pb-1.5 pr-1 text-sm leading-none">⋮</span>
    </div>
  );
}

function ChromeToolbar({ stage, onOpenExtension }: { stage: DemoStage; onOpenExtension: () => void }) {
  return (
    <div className="flex h-10 items-center gap-1.5 border-b border-[#d9dce1] bg-[#f1f3f4] px-2 text-[#5f6368] sm:gap-2 sm:px-3">
      <span className="hidden text-lg leading-none sm:inline">‹</span>
      <span className="hidden text-lg leading-none sm:inline">›</span>
      <span className="text-sm leading-none">↻</span>
      <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full bg-white px-2.5 py-1.5 text-[9px] text-[#5f6368] shadow-[inset_0_0_0_1px_rgba(60,64,67,0.08)]">
        <span className="text-[#188038] text-[10px]">⌕</span>
        <span className="truncate">careers.example.com/application/product-intern</span>
      </div>
      <button
        type="button"
        className={`group relative flex size-7 shrink-0 items-center justify-center rounded-full transition-colors ${stage === "page" ? "bg-[#e8f0fe] ring-2 ring-[#1a73e8]/35" : "hover:bg-[#e8eaed]"}`}
        onClick={onOpenExtension}
        aria-label="打开拾星网申助手插件"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/extension/starjob-resume-assistant-icon48.png" alt="" width="18" height="18" className="size-[18px] rounded-[4px]" />
        {stage === "page" ? <span className="absolute -bottom-5 left-1/2 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded bg-[#202124] px-2 py-1 text-[9px] text-white group-hover:block sm:block">点开拾星插件</span> : null}
      </button>
      <span className="text-base leading-none">⋮</span>
    </div>
  );
}

function ChromeExtensionPanel({ stage, aiAnalyzing, analysisStep, onChooseResume, onFill }: { stage: DemoStage; aiAnalyzing: boolean; analysisStep: number; onChooseResume: () => void; onFill: (mode: FillMode) => void }) {
  const [fillMode, setFillMode] = useState<FillMode>("merge");
  const hasResume = stage === "resume" || stage === "result" || aiAnalyzing;
  const isResult = stage === "result";
  const fillButtonLabel = aiAnalyzing ? "正在分析字段…" : fillMode === "ai" ? "AI 智能填写" : fillMode === "overwrite" ? "覆盖已有内容" : "只填空白项";
  const analysisSteps = ["读取页面字段", "匹配当前简历", "整理填写策略"];
  return (
    <motion.aside
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      className="absolute right-2 top-2 z-10 w-[min(278px,calc(100%-16px))] overflow-hidden rounded-xl border border-[#dadce0] bg-white text-[#202124] shadow-[0_8px_28px_rgba(60,64,67,0.26)] sm:right-3 sm:top-2"
      aria-label="拾星网申助手插件面板"
    >
      <div className="flex items-center gap-1.5 border-b border-[#eceff1] px-3 py-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/extension/starjob-resume-assistant-icon48.png" alt="" width="20" height="20" className="size-5 rounded-md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-semibold">拾星网申助手</p>
          <p className="text-[8px] text-[#5f6368]">只在你点击时填写当前页面</p>
        </div>
        <span className="rounded-full bg-[#e6f4ea] px-1.5 py-0.5 text-[7px] font-medium text-[#137333]">安全模式</span>
      </div>

      <div className="space-y-2 px-3 py-2.5">
        <div className="rounded-lg border border-[#dadce0] bg-[#f8fafd] p-2">
          <p className="text-[8px] font-medium text-[#5f6368]">当前网申页</p>
          <p className="mt-0.5 truncate text-[10px] font-medium">校园招聘 · 产品实习生申请</p>
          <p className="mt-0.5 text-[8px] text-[#5f6368]">检测到 10 个可填写字段 · 6 个空白项</p>
        </div>

        {!hasResume ? (
          <div>
            <p className="text-[9px] font-medium text-[#3c4043]">还没有选择简历</p>
            <p className="mt-0.5 text-[8px] leading-4 text-[#5f6368]">选择后才会出现填写动作，不会自动读取或提交。</p>
            <button type="button" className="mt-2 flex w-full items-center justify-between rounded-lg border border-[#dadce0] px-2.5 py-1.5 text-left text-[8px] font-medium transition-colors hover:bg-[#f8f9fa]" onClick={onChooseResume}>
              <span>选择拾星简历</span><span className="text-[#1a73e8]">›</span>
            </button>
          </div>
        ) : (
          <div>
            <p className="text-[8px] font-medium text-[#5f6368]">使用简历</p>
            <div className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-[#1a73e8] bg-[#e8f0fe] px-2 py-1.5">
              <span className="flex size-[18px] shrink-0 items-center justify-center rounded bg-white text-[8px] font-bold text-[#1a73e8]">CV</span>
              <div className="min-w-0 flex-1"><p className="truncate text-[10px] font-medium">2026 秋招 · 产品方向</p><p className="mt-0.5 text-[8px] text-[#5f6368]">63 个字段已就绪</p><p className="mt-0.5 truncate text-[8px] text-[#1a73e8]">资料准备度 7/9 · 可选补充</p></div>
              <CheckCircleIcon aria-hidden="true" className="size-4 text-[#1a73e8]" weight="fill" />
            </div>
            {aiAnalyzing ? (
              <div className="mt-2 rounded-lg border border-[#d2e3fc] bg-[#f8fbff] px-2 py-1.5" aria-live="polite">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[9px] font-medium text-[#174ea6]">AI 正在分析当前表单</p>
                  <span className="size-2 animate-pulse rounded-full bg-[#1a73e8]" />
                </div>
                <div className="mt-1 space-y-0.5">
                  {analysisSteps.map((step, index) => (
                    <motion.div key={step} initial={{ opacity: 0.45 }} animate={{ opacity: index <= analysisStep ? 1 : 0.45 }} className="flex items-center gap-1 text-[8px] text-[#5f6368]">
                      <span className={`flex size-3 items-center justify-center rounded-full text-[7px] ${index < analysisStep ? "bg-[#1a73e8] text-white" : index === analysisStep ? "border border-[#1a73e8] text-[#1a73e8]" : "bg-[#e8eaed] text-[#80868b]"}`}>{index < analysisStep ? "✓" : index + 1}</span>
                      <span>{step}</span>
                      {index === analysisStep ? <span className="ml-auto text-[#1a73e8]">进行中</span> : null}
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="mt-2 grid grid-cols-3 gap-1" aria-label="填写方式">
              {([
                ["merge", "只填空白项"],
                ["overwrite", "覆盖已有内容"],
                ["ai", "AI 智能填写"],
              ] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  className={`rounded-lg border px-0.5 py-1 text-[7px] font-medium transition-colors ${fillMode === mode ? "border-[#1a73e8] bg-[#e8f0fe] text-[#174ea6]" : "border-[#dadce0] text-[#3c4043] hover:bg-[#f8f9fa]"}`}
                  onClick={() => setFillMode(mode)}
                  disabled={isResult || aiAnalyzing}
                >
                  {label}
                </button>
              ))}
            </div>
            <button type="button" className="mt-1.5 w-full rounded-lg bg-[#1a73e8] px-2.5 py-1.5 text-[9px] font-medium text-white shadow-[0_1px_2px_rgba(26,115,232,0.3)] hover:bg-[#1769d1] disabled:cursor-wait disabled:opacity-85" onClick={() => onFill(fillMode)} disabled={isResult || aiAnalyzing}>
              {isResult ? "填写完成" : fillButtonLabel}
            </button>
            <p className="mt-1 text-center text-[8px] leading-3.5 text-[#5f6368]">不会填写验证码、密码或敏感声明 · 由你检查并提交</p>
          </div>
        )}

        {isResult ? <div className="rounded-lg bg-[#e6f4ea] px-2 py-1 text-[8px] leading-3.5 text-[#137333]">已填写 6 项 · 1 项需手动确认 · 页面已有内容保持不变</div> : null}
      </div>
      <div className="border-t border-[#eceff1] px-3 py-1.5 text-[8px] text-[#5f6368]">不会填写验证码、密码或敏感声明 · 由你检查并提交</div>
    </motion.aside>
  );
}

function DemoApplicationPage({ stage, reducedMotion, aiAnalyzing }: { stage: DemoStage; reducedMotion: boolean; aiAnalyzing: boolean }) {
  const filled = stage === "result";
  return (
    <div className="mx-auto max-h-[min(68vh,560px)] max-w-3xl overflow-y-auto px-5 py-5 sm:px-10 sm:py-7">
      <div className="flex items-start justify-between gap-4 border-b border-[#dadce0] pb-4">
        <div>
          <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-[#5f6368]">Example Careers · Campus Hiring</p>
          <h3 className="mt-1 text-base font-semibold tracking-[-0.02em] text-[#202124]">产品实习生申请表</h3>
          <p className="mt-1 text-[10px] text-[#5f6368]">请填写基本信息，带 * 的字段为必填项</p>
        </div>
        <span className="rounded-md bg-[#fef7e0] px-1.5 py-0.5 text-[9px] font-medium text-[#b06000]">示例页面</span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {formFields.map((field, index) => (
          <motion.div key={field.label} className={field.wide ? "sm:col-span-2" : undefined} initial={false} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.22, delay: reducedMotion ? 0 : index * 0.045, ease: [0.16, 1, 0.3, 1] }}>
            <label className="text-[10px] font-medium text-[#3c4043]">{field.label} <span className="text-[#d93025]">*</span></label>
            <div className={`mt-1 ${field.multiline ? "min-h-[52px]" : "min-h-8"} rounded-md border px-2 py-1.5 text-[10px] leading-3.5 transition-colors duration-200 ${filled || field.kind === "existing" ? "border-[#dadce0] bg-white text-[#202124]" : "border-dashed border-[#e37400] bg-[#fef7e0] text-[#9a6700]"}`}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={filled || field.kind === "existing" ? field.value : `${field.label}-empty`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: reducedMotion ? 0 : 0.18, ease: [0.2, 0, 0, 1] }}>
                  {filled || field.kind === "existing" ? field.value : "空白项 · 等待填写"}
                </motion.span>
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-[#dadce0] bg-[#f8f9fa] p-2.5 text-[10px] leading-4 text-[#5f6368]">
        {aiAnalyzing ? "AI 正在按字段顺序分析当前页面，完成后会把可确认内容填入表单。" : stage === "page" ? "先打开浏览器右上角的拾星插件，面板会告诉你下一步。" : stage === "panel" ? "插件已展开；选择一份简历后，填写按钮才会出现。" : stage === "resume" ? "已经选好简历。点击插件面板里的“只填空白项”或“AI 智能填写”即可开始。" : "填写完成后，请检查页面中标记的字段；真实网申仍由你手动提交。"}
      </div>

      {stage === "result" ? <div className="mt-3 flex items-center gap-1.5 text-[10px] font-medium text-[#137333]"><CheckCircleIcon aria-hidden="true" className="size-3.5" weight="fill" />6 个空白字段已填入，页面原有内容未覆盖</div> : null}
    </div>
  );
}

function ChromeLogo() {
  return (
    <svg aria-hidden="true" className="size-[15px] shrink-0" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#fbbc04" />
      <path d="M12 12H22A10 10 0 0 0 7 3.34L12 12Z" fill="#ea4335" />
      <path d="M12 12 7 20.66A10 10 0 0 0 22 12H12Z" fill="#fbbc04" />
      <path d="M12 12 7 3.34A10 10 0 0 0 2 12H12Z" fill="#34a853" />
      <circle cx="12" cy="12" r="4" fill="#4285f4" stroke="#fff" strokeWidth="1.2" />
    </svg>
  );
}
