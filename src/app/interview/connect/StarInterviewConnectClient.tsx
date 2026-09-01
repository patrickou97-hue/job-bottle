"use client";

import { useState } from "react";

type Props = {
  state: string;
  installId: string;
  pkceChallenge: string;
  signedIn: boolean;
  displayName: string;
};

export function StarInterviewConnectClient({
  state,
  installId,
  pkceChallenge,
  signedIn,
  displayName,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const query = new URLSearchParams({ state, install_id: installId, code_challenge: pkceChallenge });
  const loginNext = `/interview/connect?${query.toString()}`;
  const validRequest = Boolean(state && installId && pkceChallenge);

  async function authorize() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/star-interview/auth/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state,
          installId,
          pkceChallenge,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        data?: { code: string; state: string };
      };
      if (!response.ok || !payload.data) throw new Error(payload.error || "连接未完成，请重试。");
      const callback = new URL("starinterview://auth/callback");
      callback.hash = new URLSearchParams({
        code: payload.data.code,
        state: payload.data.state,
      }).toString();
      window.location.assign(callback.toString());
      setMessage("连接完成，正在返回诘星…");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "连接未完成，请重试。");
      setBusy(false);
    }
  }

  if (!validRequest) {
    return <ConnectError text="授权链接已失效，请返回诘星 App 重新连接。" />;
  }

  return (
    <div className="surface-card rounded-[28px] p-7 sm:p-9">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-[#12294E] text-lg font-semibold text-[#F4C542]">诘</span>
        <div>
          <p className="text-sm font-semibold text-ink-primary">诘星 StarInterview</p>
          <p className="text-xs text-ink-muted">由拾星账户安全连接</p>
        </div>
      </div>

      <h1 className="mt-8 text-3xl font-semibold tracking-[-0.03em] text-ink-primary">连接拾星简历库</h1>
      <p className="mt-3 text-sm leading-7 text-ink-secondary">
        诘星将以只读方式访问当前拾星账户中的全部简历，供你在 App 内选择使用；不会修改或删除拾星中的原始简历。
      </p>

      {!signedIn ? (
        <a
          className="pressable mt-7 flex min-h-12 w-full items-center justify-center rounded-xl bg-[#1D2F4F] px-5 text-sm font-semibold text-white"
          href={`/login?next=${encodeURIComponent(loginNext)}`}
        >
          登录拾星后继续
        </a>
      ) : (
        <>
          <div className="mt-6 flex items-center justify-between border-y border-[color:var(--line-ghost)] py-4 text-sm">
            <span className="text-ink-muted">当前账户</span>
            <span className="font-medium text-ink-primary">{displayName}</span>
          </div>

          <div className="info-banner mt-5 text-sm">
            连接后，当前账户中已有及此后新建的简历都会显示在诘星中；简历的导入与编辑仍在拾星网页完成。
          </div>
          {message ? <p className="info-banner mt-5 text-sm">{message}</p> : null}
          <button
            type="button"
          className="pressable mt-6 min-h-12 w-full rounded-xl bg-[#1D2F4F] px-5 text-sm font-semibold text-white disabled:opacity-50"
            onClick={authorize}
            disabled={busy}
          >
            {busy ? "正在建立连接…" : "允许只读访问，返回诘星"}
          </button>
        </>
      )}

      <p className="mt-4 text-center text-xs leading-5 text-ink-muted">授权码仅可使用一次；连接可随时在诘星中撤销。</p>
    </div>
  );
}

function ConnectError({ text }: { text: string }) {
  return (
    <div className="surface-card rounded-[28px] p-7 sm:p-9">
      <p className="text-xs font-semibold tracking-[0.18em] text-ink-muted">STARINTERVIEW</p>
      <h1 className="mt-4 text-2xl font-semibold text-ink-primary">未能连接诘星</h1>
      <p className="mt-3 text-sm leading-7 text-ink-secondary">{text}</p>
    </div>
  );
}
