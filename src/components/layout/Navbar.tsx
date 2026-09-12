"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BriefcaseIcon, FileTextIcon, FlaskIcon, ListChecksIcon, ShieldCheckIcon, SignOutIcon, UserCircleIcon } from "@phosphor-icons/react";
import { BookOpen, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

const primaryNavItems = navItems.filter((item) => !["/forum", "/profile", "/feedback"].includes(item.href));
const moreNavItems = navItems.filter((item) => ["/forum", "/profile", "/feedback"].includes(item.href));
const compactMoreNavItems = primaryNavItems.slice(3);

const mobileNavItems = [
  { href: "/explore", label: "岗位", icon: BriefcaseIcon },
  { href: "/my", label: "投递", icon: ListChecksIcon },
  { href: "/resume", label: "简历", icon: FileTextIcon },
  { href: "/forum", label: "指南", icon: BookOpen },
  { href: "/bottle", label: "星瓶", icon: FlaskIcon },
  { href: "/profile", label: "个人", icon: UserCircleIcon },
];

type NavbarProfile = Pick<Profile, "id" | "display_name" | "role">;

export function Navbar({ appearance = "work" }: { appearance?: "scene" | "work" }) {
  const pathname = usePathname();
  const router = useRouter();
  const moreRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    function dismiss(event: PointerEvent | KeyboardEvent) {
      if (event instanceof KeyboardEvent) {
        if (event.key === "Escape" && moreRef.current?.open) {
          moreRef.current.open = false;
          moreRef.current.querySelector("summary")?.focus();
        }
      } else if (event.target instanceof Node && !moreRef.current?.contains(event.target) && moreRef.current) moreRef.current.open = false;
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", dismiss);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", dismiss); };
  }, []);
  useEffect(() => { if (moreRef.current) moreRef.current.open = false; }, [pathname]);
  const [profile, setProfile] = useState<NavbarProfile | null>(null);

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
      const { data, error } = await supabase.from("profiles").select("id,display_name,role").eq("id", user.id).maybeSingle();
      if (error) {
        if (mounted) setProfile(null);
        return;
      }
      if (mounted) setProfile((data as NavbarProfile | null) ?? null);
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
      "ui-nav-link relative inline-flex h-10 items-center px-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--star-apricot)]",
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
        <div className="flex shrink-0 items-center">
          <Link href="/" className="flex items-center" aria-label="返回首页">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/shi-xing-wordmark.png" alt={SITE_NAME} width={1216} height={542} className="brand-wordmark h-7 w-auto object-contain" />
          </Link>
        </div>

        <nav className="hidden min-w-0 items-center gap-1 md:flex" aria-label="主导航">
          {primaryNavItems.map((item, index) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(navClass(item.href), index >= 3 && "hidden lg:inline-flex")}
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
                    className="ui-nav-indicator"
                    transition={{ type: "spring", stiffness: 420, damping: 38 }}
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>

          <details ref={moreRef} className="group relative ml-auto md:ml-0">
            <summary
              className={cn(
                "pressable flex h-10 cursor-pointer list-none items-center gap-1 rounded-md px-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--star-apricot)] [&::-webkit-details-marker]:hidden",
                moreNavItems.some((item) => pathname.startsWith(item.href))
                  ? "text-ink-primary"
                  : "text-ink-secondary hover:text-ink-primary",
              )}
            >
              更多
              <ChevronDown aria-hidden="true" className="size-3.5 transition-transform group-open:rotate-180" />
            </summary>
            <div className="absolute right-0 top-[calc(100%+.35rem)] z-50 min-w-40 overflow-hidden rounded-xl border border-[color:var(--line-ghost)] bg-[color:var(--surface-read-bg-strong)] p-1.5 shadow-[0_18px_48px_rgba(0,0,0,0.16)]">
              {[...compactMoreNavItems, ...moreNavItems].map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "pressable flex min-h-10 items-center justify-between rounded-lg px-3 text-sm transition",
                      compactMoreNavItems.some((entry) => entry.href === item.href) && "lg:hidden",
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

        <div className="nav-account ml-auto hidden items-center gap-1 border-l pl-3 md:flex">
          {profile ? (
            <>
              {profile.role === "admin" ? (
                <Link href="/admin" className="text-action pressable h-9 px-2.5 text-sm" onClick={(event) => handleSceneLink(event, "/admin")}>
                  <ShieldCheckIcon aria-hidden="true" className="size-4" weight="regular" />
                  管理
                </Link>
              ) : null}
              <button type="button" className="text-action pressable h-9 px-2.5 text-sm" onClick={handleLogout}>
                <SignOutIcon aria-hidden="true" className="size-4" weight="regular" />
                退出
              </button>
            </>
          ) : (
            <Link className="gold-button inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium" href="/login" onClick={(event) => handleSceneLink(event, "/login")}>登录</Link>
          )}
        </div>

        {!profile ? <div className="md:hidden"><Link href="/login" className="text-action text-sm">登录</Link></div> : null}

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
