"use client";

import { useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Check, GraduationCap, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { getApplicationPrepSummary } from "@/lib/application-prep";
import { touchResume, type ResumeContent, type ResumeDocument } from "@/lib/resume";

type PrepStep = 0 | 1 | 2 | 3 | 4;

const STEPS = [
  { label: "选择简历", hint: "先确定网申资料来源" },
  { label: "基本资料", hint: "先确认常用联系方式" },
  { label: "可选补充", hint: "补充后匹配更准确" },
  { label: "经历检查", hint: "确认可带入的内容" },
  { label: "使用确认", hint: "你始终保留最终决定" },
] as const;

export function ApplicationPrepPanel({
  resume,
  onChange,
  onOpenSection,
  resumeOptions = [resume],
  onSelectResume,
  onSkip,
  onFinish,
}: {
  resume: ResumeDocument;
  onChange: (resume: ResumeDocument) => void;
  onOpenSection: (section: "education" | "work" | "projects" | "skills") => void;
  resumeOptions?: ResumeDocument[];
  onSelectResume?: (resumeId: string) => void;
  onSkip?: () => void;
  onFinish?: () => void;
}) {
  const [step, setStep] = useState<PrepStep>(0);
  const summary = getApplicationPrepSummary(resume);

  function patchBasics(key: keyof ResumeContent["basics"], value: string) {
    onChange(touchResume({
      ...resume,
      content: {
        ...resume.content,
        basics: { ...resume.content.basics, [key]: value },
      },
    }));
  }

  return (
    <section className="application-prep-panel overflow-hidden rounded-2xl border border-[color:var(--line-ghost)] bg-[color:var(--surface-read-bg-strong)] shadow-[0_18px_55px_rgba(29,47,79,0.08)]">
      <header className="border-b border-[color:var(--line-ghost)] bg-[linear-gradient(135deg,rgba(232,237,244,0.8),rgba(255,255,255,0.98))] px-5 py-6 sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--aurora)]">网申前准备</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink-primary sm:text-3xl">让网申助手更准确，但不增加负担</h2>
            <p className="mt-3 text-sm leading-7 text-ink-secondary">
              先选定一份简历，再补充这份简历的网申资料。教育、实习/工作、项目和技能都会跟着当前简历走；所有项目都可以留空，不会阻止正常填写。
            </p>
          </div>
          <div className="min-w-28 rounded-xl border border-[color:var(--line-ghost)] bg-white/80 px-4 py-3 text-right">
            <span className="block max-w-36 truncate text-xs text-ink-muted" title={resume.title || "未命名简历"}>{resume.title || "未命名简历"}</span>
            <strong className="block text-2xl font-semibold tracking-[-0.04em] text-ink-primary">{summary.percent}%</strong>
            <span className="mt-1 block text-xs text-ink-muted">{summary.filledCount}/{summary.totalCount} 项已准备</span>
          </div>
        </div>
        <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-[#e7ebf1]" aria-label={`网申资料准备度 ${summary.percent}%`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={summary.percent}>
          <span className="block h-full rounded-full bg-[color:var(--aurora)] transition-[width] duration-200" style={{ width: `${summary.percent}%` }} />
        </div>
      </header>

      <nav aria-label="网申准备步骤" className="grid gap-px border-b border-[color:var(--line-ghost)] bg-[color:var(--line-ghost)] sm:grid-cols-4">
        {STEPS.map((item, index) => {
          const active = index === step;
          const complete = index < step;
          return (
            <button
              key={item.label}
              type="button"
              aria-current={active ? "step" : undefined}
              className={`flex min-h-16 items-center gap-3 bg-[color:var(--surface-read-bg-strong)] px-4 py-3 text-left transition-colors hover:bg-[color:var(--surface-hover-bg)] ${active ? "text-ink-primary" : "text-ink-muted"}`}
              onClick={() => setStep(index as PrepStep)}
            >
              <span className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${active ? "bg-[color:var(--aurora)] text-white" : complete ? "bg-[color:var(--surface-selected-bg)] text-[color:var(--aurora)]" : "bg-[#eef1f5] text-ink-muted"}`}>
                {complete ? <Check aria-hidden="true" className="size-4" /> : index + 1}
              </span>
              <span className="min-w-0">
                <strong className="block truncate text-xs font-semibold">{item.label}</strong>
                <span className="mt-0.5 block truncate text-[11px] text-ink-muted">{item.hint}</span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="min-h-[390px] px-5 py-6 sm:px-7 sm:py-8">
        {step === 0 ? (
          <div className="space-y-6">
            <StepHeading title="选择用于网申的简历" description="实习/工作经历和网申基本信息都会从这份简历读取；之后切换简历，准备度和填写内容也会一起切换。" />
            <div className="rounded-2xl border border-[color:var(--aurora)] bg-[#fbfcfe] p-5 sm:p-6">
              <label className="grid gap-2 text-sm font-medium text-ink-secondary">
                当前使用的简历
                {resumeOptions.length > 1 ? (
                  <Select value={resume.id} onChange={(event) => onSelectResume?.(event.target.value)}>
                    {resumeOptions.map((option) => <option key={option.id} value={option.id}>{option.title || "未命名简历"}{option.targetRole ? ` · ${option.targetRole}` : ""}</option>)}
                  </Select>
                ) : (
                  <div className="field-shell flex min-h-11 items-center rounded-lg px-3 text-ink-primary">{resume.title || "未命名简历"}</div>
                )}
              </label>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <SummaryMetric label="资料准备度" value={`${summary.filledCount}/${summary.totalCount}`} detail="基本信息与可选补充" />
                <SummaryMetric label="经历记录" value={`${summary.sectionCounts.education + summary.sectionCounts.experience + summary.sectionCounts.projects}`} detail="教育、实习/工作与项目" />
                <SummaryMetric label="技能分类" value={`${summary.sectionCounts.skills}`} detail="来自当前简历" />
              </div>
              <p className="mt-4 border-l-2 border-[color:var(--aurora)] pl-3 text-xs leading-6 text-ink-muted">选定后，下面所有信息都会保存到「{resume.title || "未命名简历"}」，不会写进其他简历。</p>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-6">
            <StepHeading title="基本资料" description="这些字段最常出现在网申首页，建议优先确认。" />
            <div className="grid gap-5 sm:grid-cols-2">
              <PrepField label="姓名" required value={resume.content.basics.name} onChange={(value) => patchBasics("name", value)} placeholder="请输入姓名" />
              <PrepField label="手机号" required value={resume.content.basics.phone} onChange={(value) => patchBasics("phone", value)} placeholder="请输入手机号" />
              <PrepField label="邮箱" required type="email" value={resume.content.basics.email} onChange={(value) => patchBasics("email", value)} placeholder="请输入常用邮箱" />
              <PrepField label="所在城市" value={resume.content.basics.city} onChange={(value) => patchBasics("city", value)} placeholder="例如：上海" />
              <PrepField label="目标岗位" value={resume.content.basics.targetRole || resume.targetRole} onChange={(value) => patchBasics("targetRole", value)} placeholder="例如：产品经理实习生" />
            </div>
            <p className="border-l-2 border-[color:var(--aurora)] pl-3 text-xs leading-6 text-ink-muted">带 * 的项目只是建议优先完善，不是网申助手的使用门槛。</p>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-6">
            <StepHeading title="可选补充" description="这些信息能提高常见字段的匹配准确度，但完全可以稍后再填。" />
            <div className="grid gap-5 sm:grid-cols-2">
              <PrepField label="出生日期" type="date" value={resume.content.basics.birthDate} onChange={(value) => patchBasics("birthDate", value)} />
              <label className="grid gap-2 text-sm font-medium text-ink-secondary">
                性别
                <Select value={resume.content.basics.gender} onChange={(event) => patchBasics("gender", event.target.value)}>
                  <option value="">不填写</option>
                  <option value="男">男</option>
                  <option value="女">女</option>
                  <option value="其他">其他</option>
                </Select>
              </label>
              <PrepField label="国籍/地区" value={resume.content.basics.nationality} onChange={(value) => patchBasics("nationality", value)} placeholder="例如：中国" />
              <PrepField label="期望工作地点" value={resume.content.basics.preferredLocations} onChange={(value) => patchBasics("preferredLocations", value)} placeholder="多个地点用顿号分隔" />
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-[color:var(--line-ghost)] bg-[#f8fafc] p-4 text-sm leading-6 text-ink-secondary">
              <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[color:var(--ok)]" />
              <p>身份证号、户籍、政治面貌、家庭信息、验证码、密码和最终声明不会由这里收集，也不会由助手自动填写。</p>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-6">
            <StepHeading title="经历检查" description={`当前检查的是「${resume.title || "未命名简历"}」中的教育、实习/工作、项目和技能；这里不要求重新录入。`} />
            <div className="grid gap-3 sm:grid-cols-2">
              <PrepCollectionCard icon={<GraduationCap aria-hidden="true" className="size-5" />} label="教育经历" count={summary.sectionCounts.education} onOpen={() => onOpenSection("education")} />
              <PrepCollectionCard icon={<BriefcaseBusiness aria-hidden="true" className="size-5" />} label="实习/工作经历" count={summary.sectionCounts.experience} onOpen={() => onOpenSection("work")} />
              <PrepCollectionCard icon={<Sparkles aria-hidden="true" className="size-5" />} label="项目经历" count={summary.sectionCounts.projects} onOpen={() => onOpenSection("projects")} />
              <PrepCollectionCard icon={<Check aria-hidden="true" className="size-5" />} label="技能分类" count={summary.sectionCounts.skills} onOpen={() => onOpenSection("skills")} />
            </div>
            <p className="text-xs leading-6 text-ink-muted">没有经历也不影响使用；对应字段会保持空白，助手不会替你编造内容。</p>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-6">
            <StepHeading title="使用确认" description={`准备完成后，网申助手会使用「${resume.title || "未命名简历"}」填写当前页面，再由你检查和提交。`} />
            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryMetric label="建议优先" value={`${summary.requiredFilledCount}/${summary.requiredTotalCount}`} detail="姓名、手机、邮箱" />
              <SummaryMetric label="可选补充" value={`${summary.optionalFilledCount}/${summary.optionalTotalCount}`} detail="填写越全，匹配越准" />
              <SummaryMetric label="经历资料" value={`${summary.sectionCounts.education + summary.sectionCounts.experience + summary.sectionCounts.projects}`} detail="来自当前简历" />
            </div>
            <div className="rounded-xl border border-[color:var(--line-ghost)] bg-[#f8fafc] p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[color:var(--ok)]" />
                <div>
                  <p className="font-semibold text-ink-primary">你仍然拥有最后决定权</p>
                  <p className="mt-2 text-sm leading-6 text-ink-secondary">只在你点击“填写当前页面”时读取当前网申页；不自动提交，不覆盖已有内容，不处理验证码、密码和敏感声明。</p>
                </div>
              </div>
            </div>
            <p className="text-xs leading-6 text-ink-muted">以后修改简历或补充资料，重新同步到扩展即可。准备度只是提示，不会阻止任何正常填写。</p>
          </div>
        ) : null}
      </div>

      <footer className="flex flex-col-reverse gap-3 border-t border-[color:var(--line-ghost)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        {onSkip ? (
          <button type="button" className="text-action inline-flex min-h-11 items-center justify-center px-1 text-sm font-semibold" onClick={onSkip}>
            跳过准备，直接使用网申助手
          </button>
        ) : <span />}
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={() => setStep((current) => Math.max(0, current - 1) as PrepStep)} disabled={step === 0}>
            <ArrowLeft aria-hidden="true" className="size-4" />上一项
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((current) => Math.min(STEPS.length - 1, current + 1) as PrepStep)}>下一项<ArrowRight aria-hidden="true" className="size-4" /></Button>
          ) : (
            <Button onClick={onFinish}>
              进入网申助手<ArrowRight aria-hidden="true" className="size-4" />
            </Button>
          )}
        </div>
      </footer>
    </section>
  );
}

function StepHeading({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h3 className="text-xl font-semibold tracking-[-0.02em] text-ink-primary">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-ink-secondary">{description}</p>
    </div>
  );
}

function PrepField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-ink-secondary">
      <span>{label}{required ? <span className="ml-1 text-[color:var(--text-danger)]">*</span> : <span className="ml-1 text-xs font-normal text-ink-muted">（可选）</span>}</span>
      <Input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function PrepCollectionCard({
  icon,
  label,
  count,
  onOpen,
}: {
  icon: ReactNode;
  label: string;
  count: number;
  onOpen: () => void;
}) {
  return (
    <button type="button" className="flex min-h-24 items-center gap-3 rounded-xl border border-[color:var(--line-ghost)] bg-white px-4 py-3 text-left transition-colors hover:border-[color:var(--aurora)] hover:bg-[#f8fafc]" onClick={onOpen}>
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--surface-selected-bg)] text-[color:var(--aurora)]">{icon}</span>
      <span className="min-w-0 flex-1">
        <strong className="block text-sm font-semibold text-ink-primary">{label}</strong>
        <span className="mt-1 block text-xs text-ink-muted">{count > 0 ? `${count} 项已保存` : "还没有内容"}</span>
      </span>
      <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
    </button>
  );
}

function SummaryMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-[color:var(--line-ghost)] bg-white px-4 py-4">
      <span className="block text-xs text-ink-muted">{label}</span>
      <strong className="mt-2 block text-xl font-semibold tracking-[-0.03em] text-ink-primary">{value}</strong>
      <span className="mt-1 block text-xs text-ink-muted">{detail}</span>
    </div>
  );
}
