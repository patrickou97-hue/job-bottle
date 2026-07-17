"use client";

import Link from "next/link";
import { Check, LockKeyhole, Megaphone, Sparkles, X } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CommunityHelpLink } from "@/components/ui/CommunityHelpLink";
import { getCurrentUserOrNull } from "@/lib/auth";
import { formatShanghaiDate } from "@/lib/dates";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const GUEST_NOTICE_KEY = "shi-xing:guest-welcome-seen:2026-07-13";
const USER_NOTICE_KEY_PREFIX = "shi-xing:user-welcome-seen:2026-07-13:";
const USER_NOTICE_METADATA_KEY = "welcome_notice_seen_at";
const ANNOUNCEMENT_SEEN_KEY_PREFIX = "shi-xing:announcement-seen:";
const ANNOUNCEMENT_SEEN_ID_KEY = "latest_announcement_seen_id";
const ANNOUNCEMENT_SEEN_AT_KEY = "latest_announcement_seen_at";

type NoticeKind = "guest" | "user" | "announcement";

type AnnouncementSummary = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
};

export function WelcomeNotice() {
  const [notice, setNotice] = useState<NoticeKind | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<AnnouncementSummary | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  const dismiss = useCallback(async () => {
    if (!notice) return;

    if (notice === "guest") {
      writeStorage(GUEST_NOTICE_KEY);
      setNotice(null);
      return;
    }

    if (notice === "announcement" && userId && announcement) {
      writeStorage(`${ANNOUNCEMENT_SEEN_KEY_PREFIX}${userId}:${announcement.id}`);
      setNotice(null);
      if (isSupabaseConfigured()) {
        await createClient().auth.updateUser({
          data: {
            [ANNOUNCEMENT_SEEN_ID_KEY]: announcement.id,
            [ANNOUNCEMENT_SEEN_AT_KEY]: new Date().toISOString(),
          },
        });
      }
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
  }, [announcement, notice, userId]);

  useEffect(() => {
    let mounted = true;

    async function resolveUserNotice(user: User) {
      if (!mounted) return;
      setUserId(user.id);
      const localUserSeen = readStorage(`${USER_NOTICE_KEY_PREFIX}${user.id}`);
      const accountSeen = Boolean(user.user_metadata?.[USER_NOTICE_METADATA_KEY]);
      if (!localUserSeen && !accountSeen) {
        setNotice("user");
        return;
      }

      const response = await fetch("/api/announcements/latest", { cache: "no-store" }).catch(() => null);
      if (!mounted || !response?.ok) return;
      const payload = await response.json().catch(() => null) as { announcement?: AnnouncementSummary | null } | null;
      const nextAnnouncement = payload?.announcement ?? null;
      if (!nextAnnouncement || readStorage(`${ANNOUNCEMENT_SEEN_KEY_PREFIX}${user.id}:${nextAnnouncement.id}`)) return;
      setAnnouncement(nextAnnouncement);
      setNotice("announcement");
    }

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
      await resolveUserNotice(user);
    }

    void resolveNotice();
    const supabase = isSupabaseConfigured() ? createClient() : null;
    const { data: authListener } = supabase?.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setNotice(null);
        setAnnouncement(null);
        setUserId(null);
      }
      if (event === "SIGNED_IN" && session?.user) {
        window.setTimeout(() => void resolveUserNotice(session.user), 0);
      }
    }) ?? { data: { subscription: null } };
    return () => {
      mounted = false;
      authListener.subscription?.unsubscribe();
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
  const isAnnouncement = notice === "announcement";

  return (
    <div
      className="theme-work fixed inset-0 z-[100] flex items-end justify-center bg-black/48 p-0 sm:items-center sm:p-6"
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
          className="muted-button pressable absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--aurora)] sm:right-6 sm:top-6"
          aria-label={isAnnouncement ? "关闭公告" : "关闭介绍"}
          onClick={() => void dismiss()}
        >
          <X aria-hidden="true" className="size-4" />
        </button>

        <div className="pr-12">
          <div className="mb-5 inline-flex size-11 items-center justify-center rounded-lg border border-[color:var(--star-apricot)]/35 bg-[color:var(--star-apricot)]/10 text-[color:var(--star-apricot)]">
            {isAnnouncement
              ? <Megaphone aria-hidden="true" className="size-5" />
              : isUserWelcome
                ? <Sparkles aria-hidden="true" className="size-5" />
                : <LockKeyhole aria-hidden="true" className="size-5" />}
          </div>
          <h2 id="welcome-notice-title" className="text-2xl font-semibold tracking-[-0.02em] text-ink-primary sm:text-3xl">
            {isAnnouncement ? announcement?.title : isUserWelcome ? "欢迎来到拾星" : "认识一下拾星"}
          </h2>
          <p id="welcome-notice-description" className="mt-3 max-w-xl text-sm leading-7 text-ink-secondary sm:text-[15px]">
            {isAnnouncement
              ? `拾星公告 · ${announcement ? formatShanghaiDate(announcement.createdAt) : "刚刚更新"}`
              : isUserWelcome
              ? "把散落的岗位、材料和求职进度收进一个清晰的工作台。"
              : "拾星是一款面向求职者的求职管理工具，帮助你减少重复整理信息的时间，更清楚地判断下一步应该做什么。"}
          </p>
        </div>

        {isAnnouncement && announcement
          ? <AnnouncementContent announcement={announcement} />
          : isUserWelcome
            ? <UserWelcomeContent />
            : <GuestWelcomeContent />}

        <footer className="mt-7 flex flex-col gap-3 border-t border-[color:var(--line-ghost)] pt-5 sm:flex-row sm:items-center">
          {isAnnouncement ? (
            <Link href="/forum" className="text-action justify-center text-sm sm:mr-auto sm:justify-start" onClick={() => void dismiss()}>
              查看全部拾星指南
            </Link>
          ) : (
            <CommunityHelpLink
              className="justify-center sm:mr-auto sm:justify-start"
              onClick={() => void dismiss()}
            />
          )}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
            {!isUserWelcome && !isAnnouncement ? (
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
          </div>
        </footer>
      </section>
    </div>
  );
}

function AnnouncementContent({ announcement }: { announcement: AnnouncementSummary }) {
  return (
    <div className="mt-7 space-y-5">
      <div className="whitespace-pre-wrap text-sm leading-7 text-ink-secondary sm:text-[15px]">
        {announcement.content}
      </div>
      {announcement.tags.length ? (
        <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-[color:var(--line-ghost)] pt-4 text-xs text-ink-muted">
          {announcement.tags.map((tag) => <span key={tag}>#{tag}</span>)}
        </div>
      ) : null}
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
          <div key={item} className="flex gap-3 border-t border-[color:var(--line-ghost)] py-4 text-sm leading-6 text-ink-secondary">
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
