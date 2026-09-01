import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { PageShell } from "@/components/layout/PageShell";
import { KineticWord } from "@/components/ui/KineticWord";

const LOGIN_SLOGAN_WORDS = ["坐标", "投递进展", "求职选择"] as const;

export const metadata: Metadata = {
  title: "登录",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <PageShell navigation="minimal" contentClassName="login-route-content">
      <div className="login-page">
        <section className="login-page__story" aria-labelledby="login-story-title">
          <header className="login-page__story-header">
            <Link href="/" aria-label="返回拾星主页" className="inline-flex">
              <Image
                src="/brand/shi-xing-wordmark.png"
                alt="拾星 StarJob"
                width={1216}
                height={542}
                priority
                className="login-page__wordmark brand-wordmark"
              />
            </Link>
          </header>

          <div className="login-page__story-copy">
            <p className="login-page__eyebrow">拾星 · StarJob</p>
            <h2 id="login-story-title" aria-label="把明日的坐标收进星瓶">
              把明日的
              <span className="login-page__story-word-group">
                <KineticWord words={LOGIN_SLOGAN_WORDS} />
              </span>
              <br aria-hidden="true" />
              <span className="login-page__story-tail">收进星瓶</span>
            </h2>
            <p>让岗位、简历与每一步进展，都有迹可循。</p>
          </div>

          <div className="login-page__bottle-scene" aria-hidden="true">
            <span className="login-page__bottle-halo" />
            <span className="login-page__orbit login-page__orbit--outer" />
            <span className="login-page__orbit login-page__orbit--inner" />
            <span className="login-page__orbit-beacon" />
            <span className="login-page__bottle-frames" />
          </div>

          <nav className="login-page__story-footer" aria-label="登录页快捷入口">
            <Link href="/guide">拾星指南</Link>
            <Link href="/feedback">反馈建议</Link>
          </nav>
        </section>

        <section className="login-page__form-side" aria-label="登录表单">
          <div className="login-page__form-light" aria-hidden="true" />
          <div className="login-page__form-content">
            <p className="login-page__form-kicker">登录拾星</p>
            <Suspense
              fallback={
                <div className="empty-state login-page__loading">
                  <span className="loading-line">正在为你打开拾星</span>
                </div>
              }
            >
              <LoginForm />
              </Suspense>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
