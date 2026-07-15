"use client";

import { CheckCircle2, LifeBuoy, Mail, MessageSquareText, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Textarea } from "@/components/ui/Textarea";
import { getCurrentUserOrNull } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const FEEDBACK_EMAIL = "raywang6688@outlook.com";
const FEEDBACK_TYPES = ["数据错误", "简历导出", "投递流程", "视觉体验", "其他建议"];

export function FeedbackClient() {
  const [feedbackType, setFeedbackType] = useState(FEEDBACK_TYPES[0]);
  const [feedbackText, setFeedbackText] = useState("");
  const [userEmail, setUserEmail] = useState("");

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

  const feedbackMailto = useMemo(() => {
    const body = [
      `反馈类型：${feedbackType}`,
      `账号：${userEmail || "未登录"}`,
      "",
      feedbackText.trim() || "请在这里补充你遇到的问题。",
    ].join("\n");
    return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent("拾星问题反馈")}&body=${encodeURIComponent(body)}`;
  }, [feedbackText, feedbackType, userEmail]);

  return (
    <div className="observatory-page">
      <section className="page-hero border-b border-[color:var(--line-ghost)] pb-7">
        <div className="max-w-3xl">
          <p className="mb-3 flex items-center gap-2 text-sm font-medium text-ink-muted">
            <LifeBuoy aria-hidden="true" className="size-4" />
            产品支持
          </p>
          <h1 className="page-title">反馈</h1>
          <p className="page-subtitle mt-4 max-w-2xl">
            告诉我们您的建议与反馈，这对我们非常重要
          </p>
        </div>
      </section>

      <section className="grid gap-8 border-b border-[color:var(--line-ghost)] py-9 lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-12 lg:py-11">
        <header>
          <h2 className="text-xl font-semibold text-ink-primary">问题类型</h2>
          <p className="mt-2 text-sm leading-6 text-ink-muted">选择最接近的一项，方便我们快速定位。</p>
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
                    ? "border-[color:var(--aurora)] bg-[color:var(--surface-raised)] text-ink-primary"
                    : "border-[color:var(--line-ghost)] text-ink-secondary hover:border-[color:var(--line-soft)] hover:text-ink-primary",
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
          <p className="mt-2 text-sm leading-6 text-ink-muted">写清页面、操作步骤和实际结果会更有帮助。</p>
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
            <a href={feedbackMailto} className="gold-button inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium">
              <Mail aria-hidden="true" className="size-4" />
              发送反馈
            </a>
            <span className="flex items-center gap-2 text-xs leading-5 text-ink-muted">
              <CheckCircle2 aria-hidden="true" className="size-4" />
              将打开你的邮件应用，发送前仍可修改内容。
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-8 py-9 lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-12 lg:py-11">
        <header>
          <h2 className="text-xl font-semibold text-ink-primary">隐私说明</h2>
        </header>
        <p className="flex max-w-3xl items-start gap-2 text-sm leading-7 text-ink-secondary">
          <ShieldCheck aria-hidden="true" className="mt-1 size-4 shrink-0 text-ink-muted" />
          页面不会自动发送简历正文、投递记录或其他个人资料。登录邮箱只会写入待发送邮件，供我们识别账号问题。
        </p>
      </section>
    </div>
  );
}
