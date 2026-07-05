"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Database, LogOut, Rows3, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { getCurrentUserOrNull } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { StarFieldBackground } from "@/components/visuals/StarFieldBackground";

const adminNavItems = [
  { href: "/admin", label: "管理后台", icon: Settings },
  { href: "/admin/jobs", label: "岗位管理", icon: Rows3 },
  { href: "/admin/import", label: "批量导入", icon: Database },
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
        const { data } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
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

  return (
    <div className="min-h-screen text-ink-primary">
      <StarFieldBackground quiet />
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-void-950/88 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 w-full max-w-[1440px] flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <Link href="/admin" className="flex min-w-0 items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/shi-xing-wordmark.png" alt={SITE_NAME} className="h-8 w-auto shrink-0 object-contain" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-ink-primary">
                管理后台
              </span>
              <span className="block truncate text-xs text-ink-muted">{SITE_NAME} 数据维护</span>
            </span>
          </Link>

          <nav className="flex flex-wrap items-center gap-2">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex h-10 items-center gap-2 rounded-full border px-3 text-sm transition",
                    active
                      ? "bg-nebula-blue/10 text-nebula-silver"
                      : "text-ink-secondary hover:bg-white/[0.055] hover:text-ink-primary",
                  )}
                >
                  <Icon aria-hidden="true" className="size-4" />
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/"
              className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm text-ink-secondary transition hover:bg-white/[0.055] hover:text-ink-primary"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              返回用户端
            </Link>
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm text-ink-secondary transition hover:bg-white/[0.055] hover:text-ink-primary"
              onClick={handleLogout}
            >
              <LogOut aria-hidden="true" className="size-4" />
              退出登录
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        {loading ? (
          <div className="p-6 text-sm text-ink-secondary">
            正在确认管理员权限...
          </div>
        ) : allowed ? (
          children
        ) : (
          <div className="p-6">
            <h1 className="text-2xl font-semibold text-ink-primary">管理后台</h1>
            <p className="mt-3 text-sm text-ink-secondary">{message}</p>
            <Link
              href="/login?next=%2Fadmin"
              className="gold-button mt-5 inline-flex h-10 items-center rounded-full px-4 text-sm font-medium"
            >
              登录管理员账号
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
