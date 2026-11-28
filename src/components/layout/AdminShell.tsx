"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, LogOut } from "lucide-react";
import { navGroups, type AdminNavItem } from "./admin-navigation";
import { useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function AdminShell({ children, initialAccess }: { children: ReactNode; initialAccess: { allowed: boolean; message: string } }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  async function handleLogout() {
    if (!isSupabaseConfigured()) return;
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  const activeItem = navGroups.flatMap(group => group.items).find((item) => isNavActive(pathname, item.href));

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
            </span>
            <span aria-hidden="true" className="admin-shell__brand-divider" />
            <span className="admin-shell__brand-section">管理空间</span>
          </Link>

          <div className="admin-shell__header-actions">
            <div className="admin-shell__account nav-account">
              <Link href="/" aria-label="返回首页" className="text-action admin-shell__account-action">
                <ArrowLeft aria-hidden="true" className="size-4" />
                <span className="admin-shell__account-label">返回首页</span>
              </Link>
              <button type="button" aria-label="退出" className="text-action admin-shell__account-action" onClick={handleLogout}>
                <LogOut aria-hidden="true" className="size-4" />
                <span className="admin-shell__account-label">退出</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="admin-shell__layout">
        {initialAccess.allowed && <aside className="admin-shell__sidebar">
          <nav className="admin-shell__nav" aria-label="管理导航">
            {navGroups.map((group) => (
              <div key={group.label} className="admin-shell__nav-group-block">
                <span className="admin-shell__nav-label">{group.label}</span>
                {group.items.map((item) => renderNavLink(item))}
              </div>
            ))}
          </nav>
        </aside>}

        {initialAccess.allowed && <div key={pathname} className="admin-shell__mobile-nav">
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
        </div>}

        <main id="admin-main" className="admin-shell__main">
          {initialAccess.allowed ? (
            children
          ) : (
            <div className="form-section admin-shell__permission-state py-6">
              <h1 className="mt-2 text-2xl font-semibold text-ink-primary">管理后台</h1>
              <p className="mt-3 text-sm text-ink-secondary">{initialAccess.message}</p>
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
    </div>
  );
}

function isNavActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}
