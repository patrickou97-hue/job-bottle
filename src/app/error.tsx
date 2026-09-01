"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page rendering failed", error);
  }, [error]);

  return (
    <main className="theme-work flex min-h-screen items-center justify-center bg-[#F2F4F7] px-5 text-center text-ink-primary">
      <div className="max-w-lg">
        <p className="page-kicker">页面暂时未能打开</p>
        <h1 className="mt-3 text-3xl font-semibold">这段星轨暂时中断</h1>
        <p className="mt-4 text-sm leading-7 text-ink-secondary">
          当前页面的数据仍在。请重新尝试，或先返回首页。
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button onClick={reset}>重试</Button>
          <Link href="/" className="muted-button inline-flex h-10 items-center rounded-lg px-4 text-sm">
            返回首页
          </Link>
        </div>
      </div>
    </main>
  );
}
