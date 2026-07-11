"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BriefcaseBusiness, FileText, FlaskConical, ListChecks, LogOut, MessageCircle, Shield, User } from "lucide-react";
import { useEffect, useState } from "react";
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
  { href: "/explore", label: "岗位", icon: BriefcaseBusiness },
  { href: "/my", label: "投递", icon: ListChecks },
  { href: "/resume", label: "简历", icon: FileText },
  { href: "/forum", label: "社区", icon: MessageCircle },
  { href: "/bottle", label: "星瓶", icon: FlaskConical },
  { href: "/profile", label: "个人", icon: User },
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
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (mounted) setProfile((data as Profile | null) ?? null);
    }

    void loadProfile();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { void loadProfile(); });
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
      "inline-flex h-10 items-center border-b-2 px-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--star-apricot)]",
      active
        ? "border-[color:var(--star-apricot)] text-ink-primary"
        : "border-transparent text-ink-secondary hover:border-white/20 hover:text-ink-primary",
    );
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#000001]/82 backdrop-blur-md">
        <div className="mx-auto flex h-15 w-full max-w-[1320px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center" aria-label="返回首页">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/shi-xing-wordmark.png" alt={SITE_NAME} className="h-7 w-auto object-contain" />
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center gap-1 md:flex" aria-label="主导航">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={navClass(item.href)}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-1 border-l border-white/[0.08] pl-3 md:flex">
          {profile ? (
            <>
              {profile.role === "admin" ? (
                <Link href="/admin" className="text-action pressable h-9 px-2.5 text-sm">
                  <Shield aria-hidden="true" className="size-4" />
                  管理
                </Link>
              ) : null}
              <Link href="/profile" className="text-action pressable h-9 px-2.5 text-sm">
                <User aria-hidden="true" className="size-4" />
                {profile.display_name || "资料"}
              </Link>
              <button type="button" className="text-action pressable h-9 px-2.5 text-sm" onClick={handleLogout}>
                <LogOut aria-hidden="true" className="size-4" />
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
        className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-6 border-t border-white/[0.1] bg-[#000001]/90 px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-xl md:hidden"
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
                "flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 text-[10px] transition",
                active ? "text-ink-primary" : "text-ink-muted",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon aria-hidden="true" className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
