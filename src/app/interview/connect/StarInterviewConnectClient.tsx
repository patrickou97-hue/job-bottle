"use client";

import { useState } from "react";

type ResumeSummary = {
  id: string;
  title: string;
  targetRole: string;
  updatedAt: string;
};

type Props = {
  state: string;
  installId: string;
  pkceChallenge: string;
  signedIn: boolean;
  displayName: string;
  resumes: ResumeSummary[];
};

export function StarInterviewConnectClient({
  state,
  installId,
  pkceChallenge,
  signedIn,
  displayName,
  resumes,
}: Props) {
  const [selectedId, setSelectedId] = useState(resumes[0]?.id ?? "");
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
          selectedResumeIds: [selectedId],
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        data?: { code: string; state: string };
      };
      if (!response.ok || !payload.data) throw new Error(payload.error || "授权失败，请重试。");
      const callback = new URL("starinterview://auth/callback");
      callback.hash = new URLSearchParams({
        code: payload.data.code,
        state: payload.data.state,
      }).toString();
      window.location.assign(callback.toString());
      setMessage("授权完成，正在返回诘星…");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "授权失败，请重试。");
      setBusy(false);
    }
  }

  if (!validRequest) {
    return <ConnectError text="授权链接已失效，请返回诘星 App 后重新连接。" />;
  }

  return (
    <div className="surface-card rounded-[28px] p-7 sm:p-9">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-[#7E7CB5] text-lg font-semibold text-[#F1EFFF]">诘</span>
        <div>
          <p className="text-sm font-semibold text-ink-primary">诘星 StarInterview</p>
          <p className="text-xs text-ink-muted">使用拾星账户安全连接</p>
        </div>
      </div>

      <h1 className="mt-8 text-3xl font-semibold tracking-[-0.03em] text-ink-primary">选择用于面试的简历</h1>
      <p className="mt-3 text-sm leading-7 text-ink-secondary">
        诘星只会读取你选择的简历，并在本机保存面试快照；不会修改或删除拾星中的原始简历。
      </p>

      {!signedIn ? (
        <a
          className="pressable mt-7 flex min-h-12 w-full items-center justify-center rounded-xl bg-[#7E7CB5] px-5 text-sm font-semibold text-[#F1EFFF]"
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

          <div className="mt-5 space-y-2">
            {resumes.map((resume) => {
              const selected = selectedId === resume.id;
              return (
                <button
                  key={resume.id}
                  type="button"
                  className={`pressable flex w-full items-center gap-4 rounded-2xl border px-4 py-4 text-left transition ${
                    selected
                      ? "border-[#7E7CB5] bg-[#7E7CB5]/12"
                      : "border-[color:var(--line-ghost)] bg-[color:var(--surface-soft-bg)]"
                  }`}
                  onClick={() => setSelectedId(resume.id)}
                >
                  <span className={`size-3 rounded-full border ${selected ? "border-[#7E7CB5] bg-[#7E7CB5]" : "border-[color:var(--line-strong)]"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink-primary">{resume.title}</span>
                    <span className="mt-1 block truncate text-xs text-ink-muted">
                      {resume.targetRole || "通用简历"} · 更新于 {new Date(resume.updatedAt).toLocaleDateString("zh-CN")}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {resumes.length === 0 ? (
            <div className="info-banner mt-5 text-sm">当前账户还没有云端简历，请先在拾星创建或上传一份简历。</div>
          ) : null}
          {message ? <p className="info-banner mt-5 text-sm">{message}</p> : null}
          <button
            type="button"
            className="pressable mt-6 min-h-12 w-full rounded-xl bg-[#7E7CB5] px-5 text-sm font-semibold text-[#F1EFFF] disabled:opacity-50"
            onClick={authorize}
            disabled={busy || !selectedId}
          >
            {busy ? "正在授权…" : "允许只读导入并返回诘星"}
          </button>
        </>
      )}

      <p className="mt-4 text-center text-xs leading-5 text-ink-muted">授权码单次有效，登录会话可随时在诘星内撤销。</p>
    </div>
  );
}

function ConnectError({ text }: { text: string }) {
  return (
    <div className="surface-card rounded-[28px] p-7 sm:p-9">
      <p className="text-xs font-semibold tracking-[0.18em] text-ink-muted">STARINTERVIEW</p>
      <h1 className="mt-4 text-2xl font-semibold text-ink-primary">无法连接诘星</h1>
      <p className="mt-3 text-sm leading-7 text-ink-secondary">{text}</p>
    </div>
  );
}
