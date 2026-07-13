"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root layout rendering failed", error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body className="m-0 bg-[#000001] font-sans text-white">
        <main className="flex min-h-screen items-center justify-center px-5 text-center">
          <div className="max-w-lg">
            <h1 className="text-3xl font-semibold">拾星暂时无法打开</h1>
            <p className="mt-4 text-sm leading-7 text-white/70">
              页面加载遇到异常，请重新尝试。你的账号数据不会因此被删除。
            </p>
            <button
              type="button"
              className="mt-7 h-10 rounded-lg bg-[#7E7CB5] px-5 text-sm font-medium text-white"
              onClick={reset}
            >
              重新尝试
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
