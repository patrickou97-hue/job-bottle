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
  KeyRound,
  LogOut,
  MessageSquareText,
  Rows3,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { getCurrentUserOrNull } from "@/lib/auth";
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
  { href: "/admin/referrals", label: "内推码", icon: KeyRound },
  { href: "/admin/users", label: "用户管理", icon: Users },
];

const utilityNavItems: AdminNavItem[] = [
  { href: "/admin/import", label: "批量导入", icon: Database },
  { href: "/admin/billing", label: "诘星计费", icon: Coins },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const isUtilityRoute = utilityNavItems.some((item) => isNavActive(pathname, item.href));
  const [utilityOpen, setUtilityOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkAdmin() {
      try {
        if (!isSupabaseConfigured()) {
          if (mounted) {
            console.error("Supabase environment variables are not configured.");
            setMessage("暂时无法核验管理员权限。");
          }
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

  const activeItem = [...primaryNavItems, ...utilityNavItems].find((item) => isNavActive(pathname, item.href)) ?? primaryNavItems[0];
  const utilityExpanded = utilityOpen || isUtilityRoute;

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
      </header>

      <div className="admin-shell__layout">
        <aside className="admin-shell__sidebar">
          <div className="admin-shell__sidebar-intro">
            <span>StarJob Admin</span>
            <strong>管理工作台</strong>
          </div>
          <nav className="admin-shell__nav" aria-label="管理导航">
            <span className="admin-shell__nav-label">工作台</span>
            {primaryNavItems.map((item) => renderNavLink(item))}
            <span className="admin-shell__nav-divider" />
            <button
              type="button"
              className={cn("admin-shell__nav-group-toggle", utilityExpanded && "admin-shell__nav-group-toggle--open")}
              aria-expanded={utilityExpanded}
              aria-controls="admin-utility-nav"
              onClick={() => setUtilityOpen((current) => !current)}
            >
              <span>更多工具</span>
              <ChevronDown aria-hidden="true" className="admin-shell__nav-chevron" />
            </button>
            {utilityExpanded ? <div id="admin-utility-nav" className="admin-shell__nav-group">{utilityNavItems.map((item) => renderNavLink(item))}</div> : null}
          </nav>
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
              <span className="admin-shell__nav-label">工作台</span>
              {primaryNavItems.map((item) => renderNavLink(item, true))}
              <span className="admin-shell__nav-label admin-shell__nav-label--tools">更多工具</span>
              {utilityNavItems.map((item) => renderNavLink(item, true))}
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
