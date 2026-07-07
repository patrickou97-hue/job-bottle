import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { PageShell } from "@/components/layout/PageShell";

export default function LoginPage() {
  return (
    <PageShell>
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
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
    </PageShell>
  );
}
