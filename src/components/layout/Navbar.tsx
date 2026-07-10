"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, Shield, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { getCurrentUserOrNull } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

const navItems = [
  { href: "/explore", label: "岗位池" },
  { href: "/my", label: "投递" },
  { href: "/resume", label: "简历" },
  { href: "/profile", label: "资料" },
  { href: "/forum", label: "经验库" },
  { href: "/bottle", label: "星瓶" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

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

        <button
          type="button"
          className="pressable ml-auto inline-flex size-10 items-center justify-center rounded-lg text-ink-secondary hover:bg-white/[0.06] hover:text-ink-primary md:hidden"
          onClick={() => setMenuOpen((value) => !value)}
          aria-label={menuOpen ? "关闭导航" : "打开导航"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
        </button>
      </div>

      {menuOpen ? (
        <div className="border-t border-white/[0.08] bg-[#000001]/88 px-4 py-3 backdrop-blur-md md:hidden">
          <nav className="mx-auto grid max-w-[1320px] gap-1" aria-label="移动主导航">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className={cn(navClass(item.href), "justify-between px-0")} onClick={() => setMenuOpen(false)}>
                {item.label}
              </Link>
            ))}
            {profile ? (
              <div className="mt-2 flex items-center gap-2">
                <Link href="/profile" className="text-action h-9 px-0 text-sm" onClick={() => setMenuOpen(false)}>资料</Link>
                <button type="button" className="text-action h-9 px-0 text-sm" onClick={handleLogout}>退出登录</button>
              </div>
            ) : <Link href="/login" className="gold-button mt-3 inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium" onClick={() => setMenuOpen(false)}>登录</Link>}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
