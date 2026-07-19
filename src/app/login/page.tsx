import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "登录",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <PageShell>
      <div className="grid min-h-[calc(100vh-3.75rem)] lg:grid-cols-[minmax(320px,0.8fr)_minmax(480px,1.2fr)]">
        <section className="hidden border-r border-[color:var(--line-ghost)] bg-[#eef1f5] px-10 py-16 lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#12294e]">拾星 · StarJob</p>
            <h1 className="mt-8 max-w-md text-4xl font-semibold leading-tight text-[#1d1d1f]">「用星瓶收录明日坐标」</h1>
          </div>
          <p className="max-w-sm text-sm leading-7 text-[#6e6e73]">让拾星StarJob成为你秋招路上的超级伙伴</p>
        </section>
        <div className="flex items-start justify-center px-5 py-8 sm:px-8 sm:py-12 lg:items-center lg:bg-white lg:py-10">
        <Suspense
          fallback={
            <div className="empty-state">
              <span className="loading-line">正在打开登录</span>
            </div>
          }
        >
          <LoginForm />
        </Suspense>
        </div>
      </div>
    </PageShell>
  );
}
