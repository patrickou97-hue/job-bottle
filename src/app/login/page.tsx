import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { LoginVoyage } from "@/components/auth/LoginVoyage";
import { StarJobWordmark } from "@/components/brand/StarJobWordmark";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { PageShell } from "@/components/layout/PageShell";
import { ArrowUpRight } from "lucide-react";
import "./login.css";
import { isArcSweepAuthorizationReturn } from "@/lib/arcsweep/login-context";

type LoginSearchParams = {
  reason?: string | string[];
  next?: string | string[];
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<LoginSearchParams>;
}): Promise<Metadata> {
  const query = await searchParams;
  const reason = typeof query.reason === "string" ? query.reason : "";
  const next = typeof query.next === "string" ? query.next : null;
  const isArcSweepConnect = reason === "arcsweep-connect" && isArcSweepAuthorizationReturn(next);
  if (!isArcSweepConnect) return { title: "登录", robots: { index: false, follow: false } };

  const title = "Arc 账号登录 · ArcSweep";
  const description = "使用 Arc 账号连接 ArcSweep。扫描、分类和清理由你在本机控制。";
  return {
    title: { absolute: title },
    applicationName: "ArcSweep",
    description,
    manifest: null,
    icons: { icon: "/brand/arcsweep-icon-mark.png" },
    openGraph: { type: "website", locale: "zh_CN", siteName: "ArcSweep", title, description },
    twitter: { card: "summary", title, description },
    robots: { index: false, follow: false },
  };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<LoginSearchParams>;
}) {
  const query = await searchParams;
  const reason = typeof query.reason === "string" ? query.reason : "";
  const next = typeof query.next === "string" ? query.next : null;
  const isArcSweepConnect = reason === "arcsweep-connect" && isArcSweepAuthorizationReturn(next);

  return (
    <PageShell navigation="minimal" showSiteFooter={false} contentClassName="login-route-content">
      <div className={`auth-gateway${isArcSweepConnect ? " auth-gateway--arc" : ""}`}>
        <header className="auth-gateway__header">
          {isArcSweepConnect ? (
            <div className="auth-gateway__brand auth-gateway__brand--arc" role="group" aria-label="ArcSweep Arc 账号">
              <Image src="/brand/arcsweep-icon-mark.png" alt="" width={42} height={42} priority />
              <span>ArcSweep</span><span className="auth-gateway__account-label">Arc 账号</span>
            </div>
          ) : (
            <>
              <Link href="/" className="auth-gateway__brand" aria-label="返回拾星主页"><Image src="/brand/shi-xing-wordmark.png" alt="拾星" width={1216} height={542} priority className="auth-gateway__logo"/><StarJobWordmark className="auth-gateway__english-logo" /></Link>
              <Link href="/explore" className="auth-gateway__explore">先看看岗位 <ArrowUpRight size={15} aria-hidden="true" /></Link>
            </>
          )}
        </header>
        <div className="auth-gateway__layout">
          <section className="auth-gateway__form" aria-label={isArcSweepConnect ? "Arc 账号登录与注册" : "账户登录与注册"}>
            <Suspense fallback={<p role="status">正在打开登录表单…</p>}><LoginForm isArcSweepConnect={isArcSweepConnect} /></Suspense>
          </section>
          <LoginVoyage isArcSweepConnect={isArcSweepConnect} />
        </div>
        <footer className="auth-gateway__footer">
          {isArcSweepConnect
            ? <span>Arc 账号 · 登录后返回 ArcSweep 授权确认</span>
            : <><span>每一步，都有迹可循。</span><nav aria-label="登录页帮助"><Link href="/guide">拾星指南</Link><Link href="/feedback">帮助与反馈</Link></nav></>}
        </footer>
      </div>
    </PageShell>
  );
}
