"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Shield, User } from "lucide-react";
import { useEffect, useState } from "react";
import { getCurrentUserOrNull } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

const navItems = [
  { href: "/explore", label: "探索星海" },
  { href: "/my", label: "我的星图" },
  { href: "/bottle", label: "我的星瓶" },
  { href: "/resume", label: "简历制作" },
  { href: "/forum", label: "讨论区" },
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
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (mounted) setProfile((data as Profile | null) ?? null);
    }

    loadProfile();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadProfile();
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

  const nav = (
    <>
      {navItems.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-full px-3 py-2 text-sm font-medium transition",
              active
                ? "bg-nebula-blue/12 text-nebula-silver shadow-star-sm"
                : "text-ink-secondary hover:bg-white/[0.06] hover:text-nebula-silver",
            )}
            onClick={() => setMenuOpen(false)}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5 lg:px-8">
      <div className="mx-auto flex h-16 w-full max-w-[1380px] items-center justify-between rounded-full bg-[rgba(4,9,22,0.58)] px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_22px_70px_rgba(0,0,0,0.22)] backdrop-blur-2xl backdrop-saturate-[1.15] sm:px-4">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/shi-xing-wordmark.png" alt={SITE_NAME} className="h-8 w-auto object-contain md:h-9" />
        </Link>

        <nav className="hidden items-center gap-1 rounded-full bg-white/[0.025] px-1 py-1 md:flex">{nav}</nav>

        <div className="hidden items-center gap-2 md:flex">
          {profile ? (
            <>
              {profile.role === "admin" ? (
                <Link
                  href="/admin"
                  className="text-action pressable h-10 px-3 text-sm"
                >
                  <Shield aria-hidden="true" className="size-4" />
                  管理入口
                </Link>
              ) : null}
              <span className="status-pill inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm text-ink-secondary">
                {profile.role === "admin" ? (
                  <Shield aria-hidden="true" className="size-4 text-nebula-blue" />
                ) : (
                  <User aria-hidden="true" className="size-4 text-nebula-blue" />
                )}
                {profile.display_name || "个人中心"}
              </span>
              <button
                type="button"
                className="muted-button pressable inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm transition hover:bg-white/10"
                onClick={handleLogout}
              >
                <LogOut aria-hidden="true" className="size-4" />
                退出登录
              </button>
            </>
          ) : (
            <Link className="gold-button rounded-full px-4 py-2 text-sm font-medium" href="/login">
              登录
            </Link>
          )}
        </div>

        <button
          type="button"
          className="muted-button pressable relative inline-flex size-10 items-center justify-center rounded-full md:hidden"
          onClick={() => setMenuOpen((value) => !value)}
          aria-label="打开导航"
        >
          <span
            aria-hidden="true"
            className={cn(
              "absolute h-px w-5 bg-current transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
              menuOpen ? "rotate-45" : "-translate-y-1.5",
            )}
          />
          <span
            aria-hidden="true"
            className={cn(
              "absolute h-px w-5 bg-current transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
              menuOpen ? "-rotate-45" : "translate-y-1.5",
            )}
          />
        </button>
      </div>

      {menuOpen ? (
        <div className="mx-auto mt-3 max-w-[1380px] rounded-[28px] bg-[rgba(4,9,22,0.82)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_24px_80px_rgba(0,0,0,0.26)] backdrop-blur-2xl md:hidden">
          <nav className="grid gap-1">{nav}</nav>
          <div className="mt-3">
            {profile ? (
              <div className="grid gap-2">
                {profile.role === "admin" ? (
                  <Link
                    href="/admin"
                    className="muted-button rounded-full px-4 py-2 text-center text-sm"
                    onClick={() => setMenuOpen(false)}
                  >
                    管理入口
                  </Link>
                ) : null}
                <button
                  type="button"
                  className="muted-button w-full rounded-full px-4 py-2 text-sm"
                  onClick={handleLogout}
                >
                  退出登录
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="gold-button block rounded-full px-4 py-2 text-center text-sm font-medium"
                onClick={() => setMenuOpen(false)}
              >
                登录
              </Link>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
