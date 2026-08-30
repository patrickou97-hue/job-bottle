"use client";

import { CheckCircle2, LifeBuoy, Send, MessageSquareText, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/Textarea";
import { getCurrentUserOrNull } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const FEEDBACK_EMAIL = "raywang6688@outlook.com";
const FEEDBACK_TYPES = ["岗位数据", "简历导出", "投递流程", "视觉体验", "其他建议"];

export function FeedbackClient() {
  const [feedbackType, setFeedbackType] = useState(FEEDBACK_TYPES[0]);
  const [feedbackText, setFeedbackText] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let mounted = true;
    void getCurrentUserOrNull(createClient()).then((user) => {
      if (mounted) setUserEmail(user?.email ?? "");
    });
    return () => {
      mounted = false;
    };
  }, []);

  async function submitFeedback() {
    if (submitting) return;
    if (feedbackText.trim().length < 5) {
      setMessage("请填写至少 5 个字的反馈内容。");
      return;
    }
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: feedbackType,
          content: feedbackText,
          contactEmail: userEmail,
        }),
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "反馈暂未提交，请稍后重试。");
      setFeedbackText("");
      setMessage("反馈已收到。谢谢你让拾星更完整一点。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `反馈暂未提交，请稍后重试。也可发送邮件至 ${FEEDBACK_EMAIL}。`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="observatory-page">
      <section className="page-hero border-b border-[color:var(--line-ghost)] pb-7">
        <div className="max-w-3xl">
          <p className="mb-3 flex items-center gap-2 text-sm font-medium text-ink-muted">
            <LifeBuoy aria-hidden="true" className="size-4" />
            产品支持
          </p>
          <h1 className="page-title">帮助与反馈</h1>
          <p className="page-subtitle mt-4 max-w-2xl">
            把遇到的问题或想到的建议告诉我们，每一条都会被认真阅读。
          </p>
        </div>
      </section>

      <section className="grid gap-8 border-b border-[color:var(--line-ghost)] py-9 lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-12 lg:py-11">
        <header>
          <h2 className="text-xl font-semibold text-ink-primary">问题类型</h2>
          <p className="mt-2 text-sm leading-6 text-ink-muted">选择最接近的问题类型，方便我们更快定位。</p>
        </header>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {FEEDBACK_TYPES.map((type) => {
            const selected = feedbackType === type;
            return (
              <button
                key={type}
                type="button"
                className={cn(
                  "pressable min-h-11 rounded-lg border px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--star-apricot)]",
                  selected
                    ? "border-[color:var(--aurora)] bg-[color:var(--surface-read-bg)] text-ink-primary"
                    : "border-[color:var(--line-ghost)] text-ink-secondary hover:border-[color:var(--line-strong)] hover:text-ink-primary",
                )}
                aria-pressed={selected}
                onClick={() => setFeedbackType(type)}
              >
                {type}
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-8 border-b border-[color:var(--line-ghost)] py-9 lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-12 lg:py-11">
        <header>
          <h2 className="text-xl font-semibold text-ink-primary">具体情况</h2>
          <p className="mt-2 text-sm leading-6 text-ink-muted">请尽量写明页面、操作步骤与实际结果。</p>
        </header>
        <div className="max-w-3xl">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-medium text-ink-secondary">
              <MessageSquareText aria-hidden="true" className="size-4" />
              反馈内容
            </span>
            <Textarea
              value={feedbackText}
              onChange={(event) => setFeedbackText(event.target.value)}
              placeholder="例如：在简历制作页导出 PDF 时，点击后没有开始下载……"
            />
          </label>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button type="button" onClick={() => void submitFeedback()} disabled={submitting} className="gold-button inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium disabled:opacity-60">
              <Send aria-hidden="true" className="size-4" />
              {submitting ? "正在提交" : "提交反馈"}
            </button>
            <span className="flex items-center gap-2 text-xs leading-5 text-ink-muted">
              <CheckCircle2 aria-hidden="true" className="size-4" />
              反馈将进入拾星的处理列表。
            </span>
          </div>
          {message ? <p className="mt-3 text-sm leading-6 text-ink-secondary" role="status">{message}</p> : null}
        </div>
      </section>

      <section className="grid gap-8 py-9 lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-12 lg:py-11">
        <header>
          <h2 className="text-xl font-semibold text-ink-primary">隐私说明</h2>
        </header>
        <p className="flex max-w-3xl items-start gap-2 text-sm leading-7 text-ink-secondary">
          <ShieldCheck aria-hidden="true" className="mt-1 size-4 shrink-0 text-ink-muted" />
          页面不会自动附带简历正文、投递记录或其他个人资料；登录邮箱仅用于定位账户问题。
        </p>
      </section>
    </div>
  );
}
