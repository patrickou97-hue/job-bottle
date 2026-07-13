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
    <main className="flex min-h-screen items-center justify-center bg-[#000001] px-5 text-center text-ink-primary">
      <div className="max-w-lg">
        <p className="page-kicker">页面暂时无法打开</p>
        <h1 className="mt-3 text-3xl font-semibold">这段星轨刚刚中断了</h1>
        <p className="mt-4 text-sm leading-7 text-ink-secondary">
          当前页面的数据没有被主动删除。你可以重新尝试，或先返回首页。
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button onClick={reset}>重新尝试</Button>
          <Link href="/" className="muted-button inline-flex h-10 items-center rounded-lg px-4 text-sm">
            返回首页
          </Link>
        </div>
      </div>
    </main>
  );
}
