"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDownIcon,
  ArrowRightIcon,
  LockKeyIcon,
  PuzzlePieceIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react";

const CHANNEL = "starjob-resume-assistant";
const DOWNLOAD_URL = "https://pan.baidu.com/s/10QoSAiNpFOch881oCniEjA?pwd=SXZS";

type SyncState = "idle" | "checking" | "syncing" | "success" | "missing" | "auth" | "empty" | "error";

export function ExtensionHubClient() {
  const [installed, setInstalled] = useState(false);
  const [extensionVersion, setExtensionVersion] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<SyncState>("checking");
  const [message, setMessage] = useState("正在检查浏览器中的拾星网申助手");
  const syncTimerRef = useRef<number | null>(null);

  const postToExtension = useCallback((payload: Record<string, unknown>) => {
    window.postMessage({ channel: CHANNEL, source: "website", ...payload }, window.location.origin);
  }, []);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const payload = event.data;
      if (!payload || payload.channel !== CHANNEL || payload.source !== "extension") return;

      if (payload.type === "READY" || payload.type === "PONG") {
        setInstalled(true);
        setExtensionVersion(typeof payload.version === "string" ? payload.version : null);
        setSyncState("idle");
        setMessage("扩展已安装，可以同步当前账号的云端简历");
      }
      if (payload.type === "SYNC_COMPLETE") {
        if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
        setInstalled(true);
        setSyncState("success");
        setMessage(`已同步 ${Number(payload.count) || 0} 份简历到当前浏览器`);
      }
      if (payload.type === "SYNC_ERROR") {
        if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
        setSyncState("error");
        setMessage(typeof payload.message === "string" ? payload.message : "扩展未能保存简历，请重试");
      }
    }

    window.addEventListener("message", handleMessage);
    postToExtension({ type: "PING" });
    const timer = window.setTimeout(() => {
      setSyncState((current) => {
        if (current !== "checking") return current;
        setMessage("尚未检测到扩展，请先下载并完成安装");
        return "missing";
      });
    }, 1_500);

    return () => {
      window.removeEventListener("message", handleMessage);
      window.clearTimeout(timer);
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    };
  }, [postToExtension]);

  async function syncResumes() {
    if (!installed) {
      setSyncState("missing");
      setMessage("请先安装扩展，再回到这里同步简历");
      return;
    }

    setSyncState("syncing");
    setMessage("正在读取当前账号的云端简历");

    try {
      const response = await fetch("/api/resume/extension-profile", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      const payload = await response.json() as {
        error?: string;
        resumes?: unknown[];
        syncedAt?: string;
        version?: number;
        aiMatchingAvailable?: boolean;
        matchToken?: string | null;
        matchTokenExpiresAt?: string | null;
      };

      if (response.status === 401) {
        setSyncState("auth");
        setMessage(payload.error || "请先登录拾星，再同步简历");
        return;
      }
      if (!response.ok) throw new Error(payload.error || "简历读取失败");
      if (!payload.resumes?.length) {
        setSyncState("empty");
        setMessage("当前账号还没有云端简历，请先在简历制作页保存一份");
        return;
      }

      postToExtension({
        type: "SYNC_RESUMES",
        version: payload.version || 1,
        resumes: payload.resumes,
        syncedAt: payload.syncedAt || new Date().toISOString(),
        aiMatchingAvailable: Boolean(payload.aiMatchingAvailable),
        matchToken: payload.matchToken || null,
        matchTokenExpiresAt: payload.matchTokenExpiresAt || null,
      });
      syncTimerRef.current = window.setTimeout(() => {
        setSyncState("error");
        setMessage("扩展没有响应，请在扩展管理页确认它已启用");
      }, 4_000);
    } catch (error) {
      setSyncState("error");
      setMessage(error instanceof Error ? error.message : "同步失败，请稍后重试");
    }
  }

  const isWorking = syncState === "checking" || syncState === "syncing";

  return (
    <div className="observatory-page extension-page space-y-16">
      <section className="extension-hero grid items-center gap-10 border-b border-[color:var(--line-ghost)] pb-12 lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)]">
        <div className="max-w-2xl">
          <h1 className="max-w-[11ch] text-4xl font-semibold leading-[1.08] tracking-[-0.035em] text-ink-primary sm:text-5xl">
            一份简历，投向更多可能
          </h1>
          <p className="mt-5 max-w-[46ch] text-base leading-8 text-ink-secondary">
            将拾星简历同步到浏览器，常见网申字段按页面顺序填入。你只需检查，再决定提交。
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href={DOWNLOAD_URL} target="_blank" rel="noreferrer" className="gold-button pressable inline-flex h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold">
              <ArrowDownIcon aria-hidden="true" className="size-4" />
              获取安装包
            </a>
            <Link href="/extension/guide" className="text-action pressable h-11 px-2 text-sm font-semibold">
              查看安装教程
              <ArrowRightIcon aria-hidden="true" className="size-4" />
            </Link>
          </div>
          <p className="mt-4 text-xs leading-6 text-ink-muted">适用于 Chrome、Edge 及其他 Chromium 浏览器。安装包通过百度网盘提供，提取码 SXZS。</p>
        </div>

        <div className="extension-product-visual mx-auto w-full max-w-[350px]" aria-label="拾星网申助手产品图">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/extension/starjob-resume-assistant-iphone17pm.png" alt="iPhone 17 Pro Max 正面设备框内展示拾星网申助手扩展面板" />
        </div>
      </section>

      <section id="sync" className="scroll-mt-24">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(360px,1.15fr)] lg:items-start">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.02em] text-ink-primary">同步你的拾星简历</h2>
            <p className="mt-3 max-w-[48ch] text-sm leading-7 text-ink-secondary">
              登录后读取最多 20 份云端简历，移除照片，再保存到当前浏览器的扩展本地存储。
            </p>
          </div>
          <div className="border-y border-[color:var(--line-ghost)] py-6">
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg ${installed ? "bg-[color:var(--surface-selected-bg)] text-[color:var(--ok)]" : "bg-[color:var(--surface-subtle-bg)] text-ink-muted"}`}>
                <PuzzlePieceIcon aria-hidden="true" className="size-5" weight={installed ? "fill" : "regular"} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink-primary">{installed ? `扩展已连接${extensionVersion ? `，版本 ${extensionVersion}` : ""}` : "等待扩展连接"}</p>
                <p className="mt-1 text-sm leading-6 text-ink-secondary" aria-live="polite">{message}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" className="gold-button pressable inline-flex h-11 items-center rounded-lg px-4 text-sm font-semibold disabled:cursor-wait disabled:opacity-60" onClick={syncResumes} disabled={isWorking}>
                {syncState === "syncing" ? "正在同步" : "同步到扩展"}
              </button>
              {syncState === "auth" ? <Link href="/login?next=/extension%23sync" className="text-action h-11 px-2 text-sm font-semibold">前往登录</Link> : null}
              {syncState === "empty" ? <Link href="/resume" className="text-action h-11 px-2 text-sm font-semibold">制作简历</Link> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-8 border-t border-[color:var(--line-ghost)] pt-10 md:grid-cols-2">
        <div className="max-w-xl">
          <ShieldCheckIcon aria-hidden="true" className="size-7 text-[color:var(--ok)]" />
          <h2 className="mt-4 text-xl font-semibold text-ink-primary">权限保持克制</h2>
          <p className="mt-3 text-sm leading-7 text-ink-secondary">不读取浏览历史和 Cookie。只有点击填写按钮后，扩展才临时访问当前网申页。</p>
        </div>
        <div className="max-w-xl">
          <LockKeyIcon aria-hidden="true" className="size-7 text-[color:var(--aurora)]" />
          <h2 className="mt-4 text-xl font-semibold text-ink-primary">由你检查和提交</h2>
          <p className="mt-3 text-sm leading-7 text-ink-secondary">不自动提交，不填写敏感声明、验证码和密码。已有内容默认保留，填写结果会在页面中标记。</p>
          <p className="mt-2 text-xs leading-6 text-ink-muted">智能匹配只分析字段标签、占位符、字段名、控件类型和所属区块，不发送输入框现有内容或简历正文。</p>
        </div>
      </section>
    </div>
  );
}
