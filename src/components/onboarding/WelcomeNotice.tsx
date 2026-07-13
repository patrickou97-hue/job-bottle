"use client";

import Link from "next/link";
import { Check, LockKeyhole, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { getCurrentUserOrNull } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const GUEST_NOTICE_KEY = "shi-xing:guest-welcome-seen:2026-07-13";
const USER_NOTICE_KEY_PREFIX = "shi-xing:user-welcome-seen:2026-07-13:";
const USER_NOTICE_METADATA_KEY = "welcome_notice_seen_at";

type NoticeKind = "guest" | "user";

export function WelcomeNotice() {
  const [notice, setNotice] = useState<NoticeKind | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  const dismiss = useCallback(async () => {
    if (!notice) return;

    if (notice === "guest") {
      writeStorage(GUEST_NOTICE_KEY);
      setNotice(null);
      return;
    }

    if (userId) {
      writeStorage(`${USER_NOTICE_KEY_PREFIX}${userId}`);
      setNotice(null);
      if (isSupabaseConfigured()) {
        await createClient().auth.updateUser({
          data: { [USER_NOTICE_METADATA_KEY]: new Date().toISOString() },
        });
      }
    }
  }, [notice, userId]);

  useEffect(() => {
    let mounted = true;

    async function resolveNotice() {
      const guestSeen = readStorage(GUEST_NOTICE_KEY);
      if (!isSupabaseConfigured()) {
        if (mounted && !guestSeen) setNotice("guest");
        return;
      }

      const supabase = createClient();
      const user = await getCurrentUserOrNull(supabase);
      if (!mounted) return;

      if (!user) {
        if (!guestSeen) setNotice("guest");
        return;
      }

      setUserId(user.id);
      const localUserSeen = readStorage(`${USER_NOTICE_KEY_PREFIX}${user.id}`);
      const accountSeen = Boolean(user.user_metadata?.[USER_NOTICE_METADATA_KEY]);
      if (!localUserSeen && !accountSeen) setNotice("user");
    }

    void resolveNotice();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") void dismiss();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])",
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dismiss, notice]);

  if (!notice) return null;

  const isUserWelcome = notice === "user";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-[#000001]/78 p-0 backdrop-blur-md sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) void dismiss();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-notice-title"
        aria-describedby="welcome-notice-description"
        className="apple-sheet relative max-h-[92svh] w-full overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 sm:max-w-2xl sm:px-8 sm:pb-8 sm:pt-6"
      >
        <div className="mb-3 flex justify-center sm:hidden"><span className="apple-sheet-handle" /></div>
        <button
          ref={closeButtonRef}
          type="button"
          className="muted-button pressable absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--aurora)] sm:right-6 sm:top-6"
          aria-label="关闭介绍"
          onClick={() => void dismiss()}
        >
          <X aria-hidden="true" className="size-4" />
        </button>

        <div className="pr-12">
          <div className="mb-5 inline-flex size-11 items-center justify-center rounded-full border border-[color:var(--star-apricot)]/35 bg-[color:var(--star-apricot)]/10 text-[color:var(--star-apricot)]">
            {isUserWelcome ? <Sparkles aria-hidden="true" className="size-5" /> : <LockKeyhole aria-hidden="true" className="size-5" />}
          </div>
          <h2 id="welcome-notice-title" className="text-2xl font-semibold tracking-[-0.02em] text-ink-primary sm:text-3xl">
            {isUserWelcome ? "欢迎来到拾星" : "认识一下拾星"}
          </h2>
          <p id="welcome-notice-description" className="mt-3 max-w-xl text-sm leading-7 text-ink-secondary sm:text-[15px]">
            {isUserWelcome
              ? "把散落的岗位、材料和求职进度收进一个清晰的工作台。"
              : "拾星是一款面向求职者的求职管理工具，帮助你减少重复整理信息的时间，更清楚地判断下一步应该做什么。"}
          </p>
        </div>

        {isUserWelcome ? <UserWelcomeContent /> : <GuestWelcomeContent />}

        <footer className="mt-7 flex flex-col-reverse gap-3 border-t border-white/[0.1] pt-5 sm:flex-row sm:items-center sm:justify-end">
          {!isUserWelcome ? (
            <Link
              href="/login?mode=register"
              className="text-action pressable inline-flex h-10 items-center justify-center px-4 text-sm font-medium"
              onClick={() => writeStorage(GUEST_NOTICE_KEY)}
            >
              注册或登录
            </Link>
          ) : null}
          <Button className="w-full sm:w-auto" onClick={() => void dismiss()}>
            {isUserWelcome ? "开始使用拾星" : "我知道了"}
          </Button>
        </footer>
      </section>
    </div>
  );
}

function GuestWelcomeContent() {
  return (
    <div className="mt-7 space-y-6">
      <p className="text-sm leading-7 text-ink-secondary sm:text-[15px]">
        你可以在这里整理招聘信息、管理投递进度、制作和优化简历，并记录求职过程中的重要节点。
      </p>
      <PrivacySection>
        <p>你主动填写的账号、简历和求职信息会存储在受权限控制的云服务中，主要用于提供网站功能。我们不会主动公开、出售或将你的简历用于广告投放。</p>
        <p>为了降低隐私风险，请不要填写身份证号、银行卡号、账号密码和详细家庭住址等与求职无关的敏感信息。</p>
      </PrivacySection>
    </div>
  );
}

function UserWelcomeContent() {
  return (
    <div className="mt-7 space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {["整理招聘岗位，避免错过申请时间", "管理简历和求职材料", "记录投递、笔试和面试进度"].map((item) => (
          <div key={item} className="apple-panel flex gap-3 p-4 text-sm leading-6 text-ink-secondary">
            <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-[color:var(--star-apricot)]" />
            <span>{item}</span>
          </div>
        ))}
      </div>
      <p className="text-sm leading-7 text-ink-secondary sm:text-[15px]">
        你可以先完善个人信息和简历，也可以直接浏览招聘信息。账号资料和求职内容只会在你注册、填写、保存或使用相关功能时记录。
      </p>
      <PrivacySection>
        <p>网站使用 Vercel 提供网页托管服务，使用 Supabase 提供账号认证和数据存储服务。你的数据不会向其他用户公开、出售或用于广告投放。</p>
        <p>开发者仅会在故障排查、安全响应或依法配合时，按必要范围和最小权限处理相关数据；不会未经许可主动披露你的个人信息。</p>
      </PrivacySection>
    </div>
  );
}

function PrivacySection({ children }: { children: React.ReactNode }) {
  return (
    <section className="border-l-2 border-[color:var(--aurora)]/55 pl-4 sm:pl-5">
      <h3 className="text-sm font-semibold text-ink-primary">关于隐私与数据安全</h3>
      <div className="mt-2 space-y-2 text-xs leading-6 text-ink-muted sm:text-sm sm:leading-6">{children}</div>
    </section>
  );
}

function readStorage(key: string) {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeStorage(key: string) {
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // Storage can be unavailable in private browsing; the dialog remains dismissible.
  }
}
