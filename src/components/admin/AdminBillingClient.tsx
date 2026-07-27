"use client";

import { Coins, Search, Send, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
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
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<BalanceUser[]>([]);
  const [listState, setListState] = useState<"loading" | "ready" | "error">("loading");
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let mounted = true;
    void fetch("/api/admin/star-interview-balance", { cache: "no-store" })
      .then(async (response) => ({ response, payload: await response.json().catch(() => ({})) }))
      .then(({ response, payload }) => {
        if (!mounted) return;
        if (!response.ok) {
          setMessage(typeof payload.error === "string" ? payload.error : "诘星余额列表暂时无法读取。");
          setListState("error");
          return;
        }
        setUsers(payload.users as BalanceUser[]);
        setTotal(payload.total as number);
        setListState("ready");
      });
    return () => { mounted = false; };
  }, []);

  async function loadUsers() {
    setListState("loading");
    const params = new URLSearchParams();
    if (query.trim()) params.set("query", query.trim());
    const response = await fetch(`/api/admin/star-interview-balance?${params}`, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(typeof payload.error === "string" ? payload.error : "诘星余额列表暂时无法读取。");
      setListState("error");
      return;
    }
    setUsers(payload.users as BalanceUser[]);
    setTotal(payload.total as number);
    setListState("ready");
  }

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
    if (response.ok) void loadUsers();
  }

  return (
    <div className="space-y-8">
      <header className="border-b border-[color:var(--line-ghost)] pb-7">
        <p className="page-kicker">StarInterview · 计费</p>
        <h1 className="page-title mt-3">余额发放</h1>
        <p className="page-description mt-3">所有赠送都写入用户账本。重复请求由幂等键拦截，不会重复到账。</p>
      </header>
      <section className="border-b border-[color:var(--line-ghost)] pb-9">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="section-eyebrow"><Coins className="size-4" />用户余额</p>
            <h2 className="section-title mt-3">账户账本概览</h2>
            <p className="mt-2 text-sm text-ink-muted">{total} 位用户 · 点击用户即可进入单独发放</p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <label className="relative min-w-0 flex-1 sm:w-80">
              <span className="sr-only">搜索用户余额</span>
              <Search className="pointer-events-none absolute left-3 top-3 size-4 text-ink-muted" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void loadUsers(); }} placeholder="姓名、邮箱或用户 ID" className="pl-9" />
            </label>
            <Button variant="secondary" onClick={() => void loadUsers()}>搜索</Button>
          </div>
        </div>
        {listState === "loading" ? (
          <div className="py-10 text-sm text-ink-muted"><span className="loading-line">正在读取用户余额</span></div>
        ) : users.length ? (
          <div className="mt-6 overflow-hidden border-y border-[color:var(--line-ghost)]">
            <div className="hidden grid-cols-[minmax(220px,1.4fr)_110px_130px_130px] gap-4 border-b border-[color:var(--line-ghost)] py-3 text-xs font-medium text-ink-muted md:grid">
              <span>用户</span><span>访问方式</span><span className="text-right">当前余额</span><span className="text-right">累计消耗</span>
            </div>
            {users.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => {
                  setScope("single");
                  setUserId(user.id);
                  setConfirming(false);
                  setMessage(`已选择 ${user.displayName}（${user.email}）。`);
                }}
                className="grid w-full gap-2 border-b border-[color:var(--line-ghost)] py-4 text-left transition-colors last:border-b-0 hover:bg-[color:var(--surface-hover-bg)]/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--aurora)] md:grid-cols-[minmax(220px,1.4fr)_110px_130px_130px] md:items-center md:gap-4"
              >
                <span className="min-w-0">
                  <strong className="block truncate text-sm text-ink-primary">{user.displayName}</strong>
                  <span className="mt-1 block truncate text-xs text-ink-muted">{user.email}</span>
                </span>
                <span className="text-xs text-ink-secondary">{user.accessMode === "unlimited" ? "无限使用" : "标准计费"}</span>
                <strong className="text-sm tabular-nums text-ink-primary md:text-right">¥{fen(user.balanceFen)}</strong>
                <span className="text-sm tabular-nums text-ink-secondary md:text-right">¥{fen(user.nominalSpentFen)}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-6 border-y border-[color:var(--line-ghost)] py-10 text-sm text-ink-muted">没有符合条件的用户。</div>
        )}
      </section>

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

type BalanceUser = {
  id: string;
  email: string;
  displayName: string;
  accessMode: "standard" | "unlimited";
  balanceFen: number;
  totalSpentFen: number;
  nominalSpentFen: number;
  updatedAt: string | null;
};

function fen(value: number) {
  return (value / 100).toFixed(2);
}
