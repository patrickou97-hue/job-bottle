"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  ChevronDown,
  Coins,
  Database,
  Gauge,
  KeyRound,
  LogOut,
  MessageSquareText,
  MoreHorizontal,
  Rows3,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { SITE_NAME } from "@/lib/constants";
import { feedbackVariants, motionDuration, motionEase } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { StarJobWordmark } from "@/components/brand/StarJobWordmark";

type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const primaryNavItems: AdminNavItem[] = [
  { href: "/admin", label: "总览", icon: Settings },
  { href: "/admin/analytics", label: "数据分析", icon: Activity },
  { href: "/admin/feedback", label: "反馈管理", icon: MessageSquareText },
  { href: "/admin/jobs", label: "岗位管理", icon: Rows3 },
  { href: "/admin/users", label: "用户管理", icon: Users },
];

const utilityNavItems: AdminNavItem[] = [
  { href: "/admin/referrals", label: "内推码", icon: KeyRound },
  { href: "/admin/import", label: "批量导入", icon: Database },
  { href: "/admin/billing", label: "诘星计费", icon: Coins },
];

const navGroups: Array<{ label: string; items: AdminNavItem[] }> = [
  { label: "核心运营", items: primaryNavItems.slice(0, 2) },
  { label: "内容与用户", items: primaryNavItems.slice(2) },
  { label: "增长与财务", items: utilityNavItems.filter((item) => item.href !== "/admin/import") },
  { label: "系统工具", items: utilityNavItems.filter((item) => item.href === "/admin/import") },
];

export function AdminShell({ children, initialAccess }: { children: ReactNode; initialAccess?: { allowed: boolean; message: string } }) {
  const pathname = usePathname();
  const router = useRouter();
  const [allowed, setAllowed] = useState(initialAccess?.allowed ?? false);
  const [loading, setLoading] = useState(initialAccess === undefined);
  const [message, setMessage] = useState(initialAccess?.message ?? "");
  const isUtilityRoute = utilityNavItems.some((item) => isNavActive(pathname, item.href));
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (initialAccess !== undefined) return;
    let mounted = true;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 6000);

    async function checkAdmin() {
      try {
        if (!isSupabaseConfigured()) {
          if (mounted) {
            console.error("Supabase environment variables are not configured.");
            setMessage("暂时无法核验管理员权限。");
          }
          return;
        }
        const response = await fetch("/api/admin/session", {
          cache: "no-store",
          credentials: "include",
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        if (!response.ok) {
          if (mounted) setMessage(payload?.error || (response.status === 401 ? "请先登录管理员账号。" : "无权限访问。"));
          return;
        }
        if (mounted) setAllowed(true);
      } catch (error) {
        if (mounted) {
          setMessage(error instanceof DOMException && error.name === "AbortError" ? "管理员权限核验超时，请刷新后重试。" : "无法确认管理员权限。");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void checkAdmin();
    return () => {
      mounted = false;
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [initialAccess]);

  async function handleLogout() {
    if (!isSupabaseConfigured()) return;
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  const activeItem = [...primaryNavItems, ...utilityNavItems].find((item) => isNavActive(pathname, item.href)) ?? primaryNavItems[0];

  function renderNavLink(item: AdminNavItem, mobile = false) {
    const Icon = item.icon;
    const active = isNavActive(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn("admin-shell__nav-link", active && "admin-shell__nav-link--active")}
        aria-current={active ? "page" : undefined}
        onClick={mobile ? () => setMobileNavOpen(false) : undefined}
      >
        <Icon aria-hidden="true" className="admin-shell__nav-icon" />
        <span>{item.label}</span>
        {active ? <span aria-hidden="true" className="admin-shell__nav-dot" /> : null}
      </Link>
    );
  }

  return (
    <div className="admin-shell theme-work min-h-screen bg-[color:var(--background)] text-ink-primary">
      <header className="admin-shell__header app-navbar sticky top-0 z-40 border-b">
        <div className="admin-shell__header-inner">
          <Link href="/admin" className="admin-shell__brand" aria-label="进入管理后台">
            <span className="admin-shell__brand-mark">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/shi-xing-wordmark-lockup.png" alt={SITE_NAME} width={1056} height={430} className="admin-shell__brand-cn brand-wordmark" />
              <StarJobWordmark className="admin-shell__brand-en" />
            </span>
            <span aria-hidden="true" className="admin-shell__brand-divider" />
            <span className="admin-shell__brand-section">管理空间</span>
          </Link>

          <div className="admin-shell__header-actions">
            <div className="admin-shell__more">
              <button
                type="button"
                className={cn("admin-shell__more-trigger", isUtilityRoute && "admin-shell__more-trigger--active")}
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                onClick={() => setMoreOpen((current) => !current)}
              >
                <MoreHorizontal aria-hidden="true" className="size-4" />
                <span>更多</span>
                <ChevronDown aria-hidden="true" className={cn("size-3.5", moreOpen && "rotate-180")} />
              </button>
              {moreOpen ? (
                <div className="admin-shell__more-menu" role="menu" aria-label="更多管理工具">
                  {utilityNavItems.map((item) => {
                    const Icon = item.icon;
                    const active = isNavActive(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        role="menuitem"
                        className={cn("admin-shell__more-link", active && "admin-shell__more-link--active")}
                        onClick={() => setMoreOpen(false)}
                      >
                        <Icon aria-hidden="true" className="size-4" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
            <div className="admin-shell__account nav-account">
            <Link href="/" className="text-action admin-shell__account-action">
              <ArrowLeft aria-hidden="true" className="size-4" />
              <span className="admin-shell__account-label">返回首页</span>
            </Link>
            <button type="button" className="text-action admin-shell__account-action" onClick={handleLogout}>
              <LogOut aria-hidden="true" className="size-4" />
              <span className="admin-shell__account-label">退出</span>
            </button>
            </div>
          </div>
        </div>
      </header>

      <div className="admin-shell__layout">
        <aside className="admin-shell__sidebar">
          <div className="admin-shell__sidebar-intro">
            <div className="admin-shell__sidebar-overline"><Gauge aria-hidden="true" /> StarJob Admin</div>
            <strong>超级功能台</strong>
            <span>运营、内容与权限集中管理</span>
          </div>
          <nav className="admin-shell__nav" aria-label="管理导航">
            {navGroups.map((group) => (
              <div key={group.label} className="admin-shell__nav-group-block">
                <span className="admin-shell__nav-label">{group.label}</span>
                {group.items.map((item) => renderNavLink(item))}
              </div>
            ))}
          </nav>
          <div className="admin-shell__sidebar-footer">
            <span className="admin-shell__sidebar-status"><i aria-hidden="true" /> 生产环境</span>
            <span>管理员权限已启用</span>
          </div>
        </aside>

        <div key={pathname} className="admin-shell__mobile-nav">
          <button
            type="button"
            className="admin-shell__mobile-trigger"
            aria-expanded={mobileNavOpen}
            aria-controls="admin-mobile-nav"
            onClick={() => setMobileNavOpen((current) => !current)}
          >
            <span>
              <small>当前模块</small>
              <strong>{activeItem?.label ?? "总览"}</strong>
            </span>
            <ChevronDown aria-hidden="true" className={cn("admin-shell__mobile-chevron", mobileNavOpen && "rotate-180")} />
          </button>
          {mobileNavOpen ? (
            <nav id="admin-mobile-nav" className="admin-shell__mobile-panel" aria-label="管理导航">
              {navGroups.map((group) => (
                <div key={group.label} className="admin-shell__mobile-group">
                  <span className="admin-shell__nav-label">{group.label}</span>
                  {group.items.map((item) => renderNavLink(item, true))}
                </div>
              ))}
            </nav>
          ) : null}
        </div>

        <main className="admin-shell__main">
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={loading ? "loading" : allowed ? pathname : "denied"}
              className="admin-shell__page-transition"
              variants={feedbackVariants}
              initial="initial"
              animate="enter"
              exit="exit"
              transition={{ duration: motionDuration.fast, ease: motionEase.enter }}
            >
              {loading ? (
                <div className="empty-state admin-shell__permission-state text-sm text-ink-secondary">
                  <span className="loading-line">正在确认管理员权限</span>
                </div>
              ) : allowed ? (
                children
              ) : (
                <div className="form-section admin-shell__permission-state py-6">
                  <p className="page-kicker">权限提示</p>
                  <h1 className="mt-2 text-2xl font-semibold text-ink-primary">管理后台</h1>
                  <p className="mt-3 text-sm text-ink-secondary">{message}</p>
                  <Link
                    href="/login?next=%2Fadmin"
                    className="gold-button mt-5 inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium"
                  >
                    登录管理员账号
                  </Link>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function isNavActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}
