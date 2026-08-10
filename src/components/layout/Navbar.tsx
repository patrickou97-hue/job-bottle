"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BriefcaseIcon, FileTextIcon, FlaskIcon, ListChecksIcon, ShieldCheckIcon, SignOutIcon, UserCircleIcon } from "@phosphor-icons/react";
import { BookOpen, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { getCurrentUserOrNull } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import { isSceneRoute, markSceneDeparture } from "@/lib/scene-transition";

const navItems = [
  { href: "/explore", label: "岗位坐标" },
  { href: "/my", label: "投递管理" },
  { href: "/resume", label: "简历制作" },
  { href: "/extension", label: "网申助手", beta: true },
  { href: "/forum", label: "拾星指南" },
  { href: "/bottle", label: "星瓶" },
  { href: "/profile", label: "个人中心" },
  { href: "/feedback", label: "反馈" },
];

const tabletPrimaryNavItems = navItems.slice(0, 3);
const tabletMoreNavItems = navItems.slice(3);

const mobileNavItems = [
  { href: "/explore", label: "岗位", icon: BriefcaseIcon },
  { href: "/my", label: "投递", icon: ListChecksIcon },
  { href: "/resume", label: "简历", icon: FileTextIcon },
  { href: "/forum", label: "指南", icon: BookOpen },
  { href: "/bottle", label: "星瓶", icon: FlaskIcon },
  { href: "/profile", label: "个人", icon: UserCircleIcon },
];

export function Navbar({ appearance = "work" }: { appearance?: "scene" | "work" }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    let mounted = true;

    async function loadProfile() {
      const user = await getCurrentUserOrNull(supabase);
      if (!user) {
        if (mounted) setProfile(null);
        return;
      }
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (error) {
        if (mounted) setProfile(null);
        return;
      }
      if (mounted) setProfile((data as Profile | null) ?? null);
    }

    void loadProfile();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => {
        if (mounted) void loadProfile();
      }, 0);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    if (!isSupabaseConfigured()) return;
    await createClient().auth.signOut();
    setProfile(null);
    router.push("/");
    router.refresh();
  }

  function navClass(itemHref: string) {
    const active = pathname.startsWith(itemHref);
    return cn(
      "relative inline-flex h-10 items-center px-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--star-apricot)]",
      active
        ? "text-ink-primary"
        : "text-ink-secondary hover:text-ink-primary",
    );
  }

  function handleSceneLink(event: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (
      appearance !== "scene" ||
      isSceneRoute(href) ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) return;
    markSceneDeparture(href);
  }

  return (
    <>
      <header className={cn("app-navbar sticky top-0 z-40 border-b", appearance === "scene" && "app-navbar--scene")}>
        <div className="mx-auto flex h-15 w-full max-w-[1320px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex shrink-0 items-center gap-2.5">
          <Link
            href="/interview?preview=recruitment"
            aria-label="发现诘星 StarInterview 彩蛋"
            title="有一颗新星正在靠近"
            className="group grid size-8 place-items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--aurora)]"
            onClick={(event) => handleSceneLink(event, "/interview?preview=recruitment")}
          >
            <motion.span
              className="relative grid size-6 place-items-center"
              whileHover={{ rotate: 18, scale: 1.12 }}
              whileTap={{ scale: 0.94 }}
              transition={{ type: "spring", stiffness: 420, damping: 24 }}
            >
              <svg viewBox="0 0 24 24" className="size-6 overflow-visible drop-shadow-[0_0_8px_rgba(126,124,181,0.48)]" aria-hidden="true">
                <defs>
                  <linearGradient id="star-interview-signal" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#67E8F9" />
                    <stop offset="0.32" stopColor="#818CF8" />
                    <stop offset="0.66" stopColor="#E879F9" />
                    <stop offset="1" stopColor="#FBBF24" />
                  </linearGradient>
                </defs>
                <path
                  d="M12 1.5C12.55 7.65 16.35 11.45 22.5 12C16.35 12.55 12.55 16.35 12 22.5C11.45 16.35 7.65 12.55 1.5 12C7.65 11.45 11.45 7.65 12 1.5Z"
                  fill="url(#star-interview-signal)"
                />
              </svg>
              <span className="absolute right-0 top-0 size-1 rounded-full bg-[#FBBF24] opacity-70 transition-opacity group-hover:opacity-100" />
            </motion.span>
          </Link>
          <Link href="/" className="flex items-center" aria-label="返回首页">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/shi-xing-wordmark.png" alt={SITE_NAME} width={1216} height={542} className="brand-wordmark h-7 w-auto object-contain" />
          </Link>
        </div>

        <nav className="hidden min-w-0 flex-1 items-center gap-1 lg:flex" aria-label="主导航">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={navClass(item.href)}
                aria-label={item.beta ? `${item.label} Beta` : item.label}
                aria-current={active ? "page" : undefined}
                onClick={(event) => handleSceneLink(event, item.href)}
              >
                <span className={cn("relative inline-flex items-center", item.beta && "pr-2")}>
                  {item.label}
                  {item.beta ? <span className="nav-beta" aria-hidden="true">BETA</span> : null}
                </span>
                {active ? (
                  <motion.span
                    layoutId="primary-nav-indicator"
                    className="absolute inset-x-2.5 bottom-0 h-0.5 bg-[color:var(--aurora)]"
                    transition={{ type: "spring", stiffness: 420, damping: 38 }}
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <nav className="relative hidden min-w-0 flex-1 items-center gap-1 md:flex lg:hidden" aria-label="平板主导航">
          {tabletPrimaryNavItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={navClass(item.href)}
                aria-current={active ? "page" : undefined}
                onClick={(event) => handleSceneLink(event, item.href)}
              >
                {item.label}
                {active ? (
                  <motion.span
                    layoutId="tablet-nav-indicator"
                    className="absolute inset-x-2.5 bottom-0 h-0.5 bg-[color:var(--aurora)]"
                    transition={{ type: "spring", stiffness: 420, damping: 38 }}
                  />
                ) : null}
              </Link>
            );
          })}
          <details className="group relative">
            <summary
              className={cn(
                "pressable flex h-10 cursor-pointer list-none items-center gap-1 rounded-md px-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--star-apricot)] [&::-webkit-details-marker]:hidden",
                tabletMoreNavItems.some((item) => pathname.startsWith(item.href))
                  ? "text-ink-primary"
                  : "text-ink-secondary hover:text-ink-primary",
              )}
            >
              更多
              <ChevronDown aria-hidden="true" className="size-3.5 transition-transform group-open:rotate-180" />
            </summary>
            <div className="absolute left-0 top-[calc(100%+.35rem)] z-50 min-w-40 overflow-hidden rounded-xl border border-[color:var(--line-ghost)] bg-[color:var(--surface-read-bg-strong)] p-1.5 shadow-[0_18px_48px_rgba(0,0,0,0.16)]">
              {tabletMoreNavItems.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "pressable flex min-h-10 items-center justify-between rounded-lg px-3 text-sm transition",
                      active ? "bg-[color:var(--surface-selected-bg)] text-ink-primary" : "text-ink-secondary hover:bg-[color:var(--surface-hover-bg)] hover:text-ink-primary",
                    )}
                    aria-current={active ? "page" : undefined}
                    onClick={(event) => handleSceneLink(event, item.href)}
                  >
                    <span>{item.label}</span>
                    {item.beta ? <span className="text-[9px] font-semibold tracking-[0.08em] text-[color:var(--aurora)]">BETA</span> : null}
                  </Link>
                );
              })}
            </div>
          </details>
        </nav>

        <div className="nav-account ml-auto hidden items-center gap-1 border-l pl-3 md:flex">
          {profile ? (
            <>
              {profile.role === "admin" ? (
                <Link href="/admin" className="text-action pressable h-9 px-2.5 text-sm" onClick={(event) => handleSceneLink(event, "/admin")}>
                  <ShieldCheckIcon aria-hidden="true" className="size-4" weight="regular" />
                  管理
                </Link>
              ) : null}
              <Link href="/profile" className="text-action pressable h-9 px-2.5 text-sm" onClick={(event) => handleSceneLink(event, "/profile")}>
                <UserCircleIcon aria-hidden="true" className="size-4" weight="regular" />
                {profile.display_name || "资料"}
              </Link>
              <button type="button" className="text-action pressable h-9 px-2.5 text-sm" onClick={handleLogout}>
                <SignOutIcon aria-hidden="true" className="size-4" weight="regular" />
                退出
              </button>
            </>
          ) : (
            <Link className="gold-button inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium" href="/login" onClick={(event) => handleSceneLink(event, "/login")}>登录</Link>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3 text-sm md:hidden">
          <Link
            href="/feedback"
            className={cn("transition", pathname.startsWith("/feedback") ? "text-ink-primary" : "text-ink-secondary")}
            onClick={(event) => handleSceneLink(event, "/feedback")}
          >
            反馈
          </Link>
          <span aria-hidden="true" className="h-3 w-px bg-[color:var(--line-soft)]" />
          <Link
            href={profile ? "/profile" : "/login"}
            className={cn("transition", pathname.startsWith("/profile") ? "text-ink-primary" : "text-ink-secondary")}
            onClick={(event) => handleSceneLink(event, profile ? "/profile" : "/login")}
          >
            {profile ? "个人中心" : "登录"}
          </Link>
        </div>
        </div>
      </header>
      <nav
        className="apple-dock fixed inset-x-3 bottom-[var(--app-safe-bottom)] z-50 grid grid-cols-6 md:hidden"
        aria-label="移动主导航"
      >
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 text-[10px] transition",
                active ? "text-ink-primary" : "text-ink-muted",
              )}
              aria-current={active ? "page" : undefined}
              onClick={(event) => handleSceneLink(event, item.href)}
            >
              <span className="relative">
                <Icon aria-hidden="true" className="relative z-10 size-[18px]" weight={active ? "fill" : "regular"} />
                {active ? <motion.span layoutId="mobile-nav-indicator" className="mobile-nav-indicator absolute -inset-x-2 -inset-y-1" transition={{ type: "spring", stiffness: 430, damping: 38 }} /> : null}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
