"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BriefcaseIcon, ChatCircleIcon, FileTextIcon, FlaskIcon, ListChecksIcon, ShieldCheckIcon, SignOutIcon, UserCircleIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { getCurrentUserOrNull } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

const navItems = [
  { href: "/explore", label: "岗位坐标" },
  { href: "/my", label: "投递管理" },
  { href: "/resume", label: "简历制作" },
  { href: "/forum", label: "求职社区" },
  { href: "/bottle", label: "星瓶" },
  { href: "/profile", label: "个人中心" },
];

const mobileNavItems = [
  { href: "/explore", label: "岗位", icon: BriefcaseIcon },
  { href: "/my", label: "投递", icon: ListChecksIcon },
  { href: "/resume", label: "简历", icon: FileTextIcon },
  { href: "/forum", label: "社区", icon: ChatCircleIcon },
  { href: "/bottle", label: "星瓶", icon: FlaskIcon },
  { href: "/profile", label: "个人", icon: UserCircleIcon },
];

export function Navbar() {
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

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#000001]/68 backdrop-blur-2xl backdrop-saturate-150">
        <div className="mx-auto flex h-15 w-full max-w-[1320px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center" aria-label="返回首页">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/shi-xing-wordmark.png" alt={SITE_NAME} className="h-7 w-auto object-contain" />
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center gap-1 md:flex" aria-label="主导航">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={navClass(item.href)} aria-current={active ? "page" : undefined}>
                {item.label}
                {active ? (
                  <motion.span
                    layoutId="primary-nav-indicator"
                    className="absolute inset-x-2.5 bottom-0 h-0.5 rounded-full bg-[color:var(--aurora)] shadow-[0_0_12px_rgba(126,124,181,.42)]"
                    transition={{ type: "spring", stiffness: 420, damping: 38 }}
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto hidden items-center gap-1 border-l border-white/[0.08] pl-3 md:flex">
          {profile ? (
            <>
              {profile.role === "admin" ? (
                <Link href="/admin" className="text-action pressable h-9 px-2.5 text-sm">
                  <ShieldCheckIcon aria-hidden="true" className="size-4" weight="regular" />
                  管理
                </Link>
              ) : null}
              <Link href="/profile" className="text-action pressable h-9 px-2.5 text-sm">
                <UserCircleIcon aria-hidden="true" className="size-4" weight="regular" />
                {profile.display_name || "资料"}
              </Link>
              <button type="button" className="text-action pressable h-9 px-2.5 text-sm" onClick={handleLogout}>
                <SignOutIcon aria-hidden="true" className="size-4" weight="regular" />
                退出
              </button>
            </>
          ) : (
            <Link className="gold-button inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium" href="/login">登录</Link>
          )}
        </div>

        <Link href={profile ? "/profile" : "/login"} className="ml-auto text-sm text-ink-secondary md:hidden">
          {profile ? profile.display_name || "个人中心" : "登录"}
        </Link>
        </div>
      </header>
      <nav
        className="apple-dock fixed inset-x-3 bottom-[max(.65rem,env(safe-area-inset-bottom))] z-50 grid grid-cols-6 md:hidden"
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
                "relative flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-xl text-[10px] transition",
                active ? "text-ink-primary" : "text-ink-muted",
              )}
              aria-current={active ? "page" : undefined}
            >
              <span className="relative">
                <Icon aria-hidden="true" className="relative z-10 size-[18px]" weight={active ? "fill" : "regular"} />
                {active ? <motion.span layoutId="mobile-nav-indicator" className="absolute -inset-2 rounded-full bg-white/[0.1]" transition={{ type: "spring", stiffness: 430, damping: 38 }} /> : null}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
