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

export const metadata: Metadata = {
  title: "登录",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <PageShell navigation="minimal" contentClassName="login-route-content">
      <div className="auth-gateway">
        <header className="auth-gateway__header">
          <Link href="/" className="auth-gateway__brand" aria-label="返回拾星主页"><Image src="/brand/shi-xing-wordmark.png" alt="拾星" width={1216} height={542} priority className="auth-gateway__logo"/><StarJobWordmark className="auth-gateway__english-logo" /></Link>
          <Link href="/explore" className="auth-gateway__explore">先看看岗位 <ArrowUpRight size={15} aria-hidden="true" /></Link>
        </header>
        <div className="auth-gateway__layout">
          <section className="auth-gateway__form" aria-label="账户登录与注册">
            <Suspense fallback={<p role="status">正在打开登录表单…</p>}><LoginForm /></Suspense>
          </section>
          <LoginVoyage />
        </div>
        <footer className="auth-gateway__footer"><span>每一步，都有迹可循。</span><nav aria-label="登录页帮助"><Link href="/guide">拾星指南</Link><Link href="/feedback">帮助与反馈</Link></nav></footer>
      </div>
    </PageShell>
  );
}
