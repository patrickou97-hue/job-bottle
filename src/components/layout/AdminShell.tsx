"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Database, LogOut, Rows3, Settings, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { getCurrentUserOrNull } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

const adminNavItems = [
  { href: "/admin", label: "管理后台", icon: Settings },
  { href: "/admin/jobs", label: "岗位管理", icon: Rows3 },
  { href: "/admin/import", label: "批量导入", icon: Database },
  { href: "/admin/users", label: "用户管理", icon: Users },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function checkAdmin() {
      try {
        if (!isSupabaseConfigured()) {
          if (mounted) setMessage("请先配置数据库环境变量。");
          return;
        }
        const supabase = createClient();
        const user = await getCurrentUserOrNull(supabase);
        if (!user) {
          if (mounted) setMessage("请先登录管理员账号。");
          return;
        }
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        if (error) throw error;
        if (data?.role !== "admin") {
          if (mounted) setMessage("无权限访问。");
          return;
        }
        if (mounted) setAllowed(true);
      } catch {
        if (mounted) setMessage("无法确认管理员权限。");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void checkAdmin();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleLogout() {
    if (!isSupabaseConfigured()) return;
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  function navClass(itemHref: string) {
    const active = itemHref === "/admin" ? pathname === "/admin" : pathname.startsWith(itemHref);
    return cn(
      "pressable inline-flex h-10 items-center gap-2 border-b-2 px-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--star-apricot)]",
      active
        ? "border-[color:var(--star-apricot)] text-ink-primary"
        : "border-transparent text-ink-secondary hover:border-white/20 hover:text-ink-primary",
    );
  }

  return (
    <div className="min-h-screen bg-[#000001] text-ink-primary">
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#000001]/82 backdrop-blur-md">
        <div className="mx-auto flex min-h-15 w-full max-w-[1380px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 sm:px-6 lg:px-8">
          <Link href="/admin" className="flex min-w-0 shrink-0 items-center gap-3" aria-label="管理">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/shi-xing-wordmark.png" alt={SITE_NAME} className="h-7 w-auto shrink-0 object-contain" />
            <span className="text-sm font-semibold text-ink-primary">管理</span>
          </Link>

          <nav className="order-3 flex w-full items-center gap-1 overflow-x-auto sm:order-none sm:w-auto sm:flex-1" aria-label="管理导航">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={navClass(item.href)}
                >
                  <Icon aria-hidden="true" className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1 border-l border-white/[0.08] pl-3">
            <Link href="/" className="text-action h-9 px-2.5 text-sm">
              <ArrowLeft aria-hidden="true" className="size-4" />
              返回首页
            </Link>
            <button type="button" className="text-action h-9 px-2.5 text-sm" onClick={handleLogout}>
              <LogOut aria-hidden="true" className="size-4" />
              退出
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        {loading ? (
          <div className="empty-state text-sm text-ink-secondary">
            <span className="loading-line">正在确认管理员权限</span>
          </div>
        ) : allowed ? (
          children
        ) : (
          <div className="liquid-panel p-6">
            <h1 className="text-2xl font-semibold text-ink-primary">管理后台</h1>
            <p className="mt-3 text-sm text-ink-secondary">{message}</p>
            <Link
              href="/login?next=%2Fadmin"
              className="gold-button mt-5 inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium"
            >
              登录管理员账号
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
