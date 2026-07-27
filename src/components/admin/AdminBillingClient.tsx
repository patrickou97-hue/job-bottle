"use client";

import { Coins, Send, UsersRound } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function AdminBillingClient() {
  const [scope, setScope] = useState<"single" | "all">("single");
  const [userId, setUserId] = useState("");
  const [amountYuan, setAmountYuan] = useState("20");
  const [reason, setReason] = useState("诘星体验余额");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit() {
    if (!confirming) {
      setConfirming(true);
      setMessage(scope === "all" ? "请再次点击确认：余额将发放给全部注册用户。" : "请再次点击确认本次单用户发放。");
      return;
    }
    setSaving(true);
    setMessage("");
    const amountFen = Math.round(Number(amountYuan) * 100);
    const response = await fetch("/api/admin/star-interview-balance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(scope === "all" ? { allUsers: true } : { userIds: [userId.trim()] }),
        amountFen,
        reason,
        idempotencyKey: crypto.randomUUID(),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setSaving(false);
    setConfirming(false);
    setMessage(response.ok
      ? `已向 ${payload.succeeded} 位用户发放 ¥${Number(amountYuan).toFixed(2)}。`
      : typeof payload.error === "string" ? payload.error : "余额发放失败。");
  }

  return (
    <div className="space-y-8">
      <header className="border-b border-[color:var(--line-ghost)] pb-7">
        <p className="page-kicker">StarInterview · 计费</p>
        <h1 className="page-title mt-3">余额发放</h1>
        <p className="page-description mt-3">所有赠送都写入用户账本。重复请求由幂等键拦截，不会重复到账。</p>
      </header>
      <section className="grid gap-8 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)]">
        <div>
          <p className="section-eyebrow"><UsersRound className="size-4" />发放范围</p>
          <div className="mt-4 flex gap-2">
            <Button variant={scope === "single" ? "primary" : "secondary"} onClick={() => { setScope("single"); setConfirming(false); }}>单个用户</Button>
            <Button variant={scope === "all" ? "primary" : "secondary"} onClick={() => { setScope("all"); setConfirming(false); }}>全部用户</Button>
          </div>
          <p className="mt-4 text-sm leading-7 text-ink-secondary">单个发放时，可从“用户管理 → 技术信息”复制用户 ID。</p>
        </div>
        <div className="space-y-4 border-l border-[color:var(--line-ghost)] pl-6">
          {scope === "single" ? <label><span className="mb-1.5 block text-xs text-ink-muted">用户 ID</span><Input value={userId} onChange={(event) => { setUserId(event.target.value); setConfirming(false); }} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" /></label> : <div className="border-l-2 border-aurum/60 pl-4 text-sm leading-6 text-ink-secondary">本次操作会覆盖全部已注册账户，包括无限账户；无限账户余额会增加，但仍只记录影子消耗。</div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className="mb-1.5 block text-xs text-ink-muted">发放金额（元）</span><Input type="number" min="1" max="1000" step="1" value={amountYuan} onChange={(event) => { setAmountYuan(event.target.value); setConfirming(false); }} /></label>
            <label><span className="mb-1.5 block text-xs text-ink-muted">账本说明</span><Input value={reason} onChange={(event) => { setReason(event.target.value); setConfirming(false); }} /></label>
          </div>
          {message ? <p className="border-l-2 border-nebula-blue/70 pl-3 text-sm leading-6 text-ink-secondary" role="status">{message}</p> : null}
          <Button disabled={saving || !reason.trim() || !amountYuan || (scope === "single" && !userId.trim())} onClick={() => void submit()}>
            {confirming ? <Coins className="size-4" /> : <Send className="size-4" />}{saving ? "正在发放" : confirming ? "确认发放" : "发放余额"}
          </Button>
        </div>
      </section>
    </div>
  );
}
