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
const DOWNLOAD_URL = "/downloads/starjob-resume-assistant-v0.2.6.zip";
const LEGACY_COMPATIBLE_VERSIONS = new Set(["0.1.7", "0.1.8", "0.1.9"]);
const SHORT_TIMEOUT_AI_VERSIONS = new Set(["0.2.0"]);
const PREVIOUS_AI_VERSIONS = new Set(["0.2.1", "0.2.2", "0.2.3", "0.2.4", "0.2.5"]);

type SyncState = "idle" | "checking" | "syncing" | "success" | "missing" | "auth" | "empty" | "error";

export function ExtensionHubClient() {
  const [installed, setInstalled] = useState(false);
  const [extensionVersion, setExtensionVersion] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<SyncState>("checking");
  const [message, setMessage] = useState("正在检测拾星网申助手");
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
        const detectedVersion = typeof payload.version === "string" ? payload.version : null;
        setInstalled(true);
        setExtensionVersion(detectedVersion);
        setSyncState("idle");
        setMessage(detectedVersion && LEGACY_COMPATIBLE_VERSIONS.has(detectedVersion)
          ? `${detectedVersion} 可继续同步与原有填写；AI 智能填写需要升级到 0.2.6。`
          : detectedVersion && SHORT_TIMEOUT_AI_VERSIONS.has(detectedVersion)
            ? `${detectedVersion} 的 AI 填写仍可使用；建议升级到 0.2.6，获得真实进度、取消操作与并行分析。`
            : detectedVersion && PREVIOUS_AI_VERSIONS.has(detectedVersion)
              ? `${detectedVersion} 仍可继续使用；升级到 0.2.6 后会隔离不同页面框架的字段，并准确提示局部写入失败。`
              : "网申助手已安装，可同步当前账户的云端简历。");
      }
      if (payload.type === "SYNC_COMPLETE") {
        if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
        setInstalled(true);
        setSyncState("success");
        setMessage(`已将 ${Number(payload.count) || 0} 份简历同步至当前浏览器。`);
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
        setMessage("尚未检测到网申助手，请先完成安装。");
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
      setMessage("尚未检测到网申助手，请先完成安装。");
      return;
    }

    setSyncState("syncing");
    setMessage("正在读取云端简历");

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
        setMessage("当前账户还没有云端简历，请先在简历制作页保存一份。");
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
        setMessage("网申助手未响应，请在浏览器扩展管理页确认它已启用。");
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
          <h1 className="text-4xl font-semibold leading-[1.08] tracking-[-0.035em] text-ink-primary sm:text-5xl">
            <span className="block">一份简历，</span>
            <span className="block">抵达更多坐标</span>
          </h1>
          <p className="mt-5 max-w-[46ch] text-base leading-8 text-ink-secondary">
            把拾星简历同步到浏览器，在网申页面填写常用字段；你负责核对与提交。
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href={DOWNLOAD_URL} download className="gold-button pressable inline-flex h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold">
              <ArrowDownIcon aria-hidden="true" className="size-4" />
              获取安装包
            </a>
            <Link href="/extension/guide" className="text-action pressable h-11 px-2 text-sm font-semibold">
              查看安装教程
              <ArrowRightIcon aria-hidden="true" className="size-4" />
            </Link>
          </div>
          <p className="mt-4 text-xs leading-6 text-ink-muted">最新版本 0.2.6，适用于 Chrome、Edge 及其他 Chromium 浏览器，安装包由拾星官网直接提供。AI 智能填写会展示真实批次进度与已用时；不同页面框架的字段分别处理，局部失败也会明确提示。</p>
        </div>

        <div className="extension-product-visual mx-auto w-full max-w-[350px]" aria-label="拾星网申助手 0.2.6 产品图">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/extension/starjob-resume-assistant-popup-v026.png"
            alt="拾星网申助手 0.2.6 真实扩展面板，展示三种填写方式、填写结果和处理进度"
            width={760}
            height={1680}
            className="h-auto w-full"
          />
        </div>
      </section>

      <section id="sync" className="scroll-mt-24">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(360px,1.15fr)] lg:items-start">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.02em] text-ink-primary">将简历同步到浏览器</h2>
            <p className="mt-3 max-w-[48ch] text-sm leading-7 text-ink-secondary">
              登录后可读取最多 20 份云端简历。照片会被移除，其余内容仅保存于当前浏览器的扩展本地存储。
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
              {installed ? (
                <button type="button" className="gold-button pressable inline-flex h-11 items-center rounded-lg px-4 text-sm font-semibold disabled:cursor-wait disabled:opacity-60" onClick={syncResumes} disabled={isWorking}>
                  {syncState === "syncing" ? "正在同步" : "同步到扩展"}
                </button>
              ) : syncState === "checking" ? (
                <button type="button" className="gold-button inline-flex h-11 items-center rounded-lg px-4 text-sm font-semibold opacity-60" disabled>
                  正在检测网申助手
                </button>
              ) : (
                <button type="button" className="gold-button pressable inline-flex h-11 items-center rounded-lg px-4 text-sm font-semibold" onClick={() => window.location.reload()}>
                  安装后重新检测
                </button>
              )}
              {!installed && syncState !== "checking" ? <Link href="/extension/guide" className="text-action h-11 px-2 text-sm font-semibold">查看安装步骤</Link> : null}
              {syncState === "auth" ? <Link href="/login?next=/extension%23sync" className="text-action h-11 px-2 text-sm font-semibold">前往登录</Link> : null}
              {syncState === "empty" ? <Link href="/resume" className="text-action h-11 px-2 text-sm font-semibold">制作简历</Link> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-8 border-t border-[color:var(--line-ghost)] pt-10 md:grid-cols-2">
        <div className="max-w-xl">
          <ShieldCheckIcon aria-hidden="true" className="size-7 text-[color:var(--ok)]" />
          <h2 className="mt-4 text-xl font-semibold text-ink-primary">权限止于所需</h2>
          <p className="mt-3 text-sm leading-7 text-ink-secondary">不读取浏览历史或 Cookie。只有当你主动点击填写时，扩展才会临时访问当前网申页面。</p>
        </div>
        <div className="max-w-xl">
          <LockKeyIcon aria-hidden="true" className="size-7 text-[color:var(--aurora)]" />
          <h2 className="mt-4 text-xl font-semibold text-ink-primary">核对与提交，由你决定</h2>
          <p className="mt-3 text-sm leading-7 text-ink-secondary">不自动提交，不填写敏感声明、验证码或密码。页面已有内容默认保留，新填内容会清晰标记。</p>
          <p className="mt-2 text-xs leading-6 text-ink-muted">普通模式的智能匹配仅分析去内容化的字段元数据。主动选择“AI 智能填写”后，系统会以所选简历为唯一依据，从上到下填写全部可确认的安全字段；自我描述会以第一人称归纳有依据的责任心、沟通与专业优势，经历描述只使用对应记录，页面已有输入内容不会被读取或发送。</p>
        </div>
      </section>
    </div>
  );
}
