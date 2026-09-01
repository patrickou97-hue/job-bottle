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
      <body className="theme-work m-0 bg-[#F2F4F7] font-sans text-[#152A55]">
        <main className="flex min-h-screen items-center justify-center px-5 text-center">
          <div className="max-w-lg">
            <h1 className="text-3xl font-semibold">拾星暂时未能打开</h1>
            <p className="mt-4 text-sm leading-7 text-[#6e6e73]">
              加载过程中出现异常，请重新尝试。你的账户数据不会受到影响。
            </p>
            <button
              type="button"
              className="mt-7 h-10 rounded-lg bg-[#F3C64D] px-5 text-sm font-medium text-[#152A55]"
              onClick={reset}
            >
              重试
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
