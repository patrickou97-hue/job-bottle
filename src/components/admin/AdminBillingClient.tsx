"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Coins,
  History,
  Search,
  Send,
  ShieldAlert,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn, formatDateTime } from "@/lib/utils";

const AMOUNT_PRESETS = ["10", "20", "50", "100"];
const OPERATION_KEY_STORAGE_PREFIX = "starjob:admin-balance-operation:v1:";
const OPERATION_KEY_TTL_MS = 24 * 60 * 60 * 1_000;

const EMPTY_SUMMARY: BalanceSummary = {
  totalUsers: 0,
  fundedUsers: 0,
  unlimitedUsers: 0,
  totalBalanceFen: 0,
};

export function AdminBillingClient() {
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [summary, setSummary] = useState<BalanceSummary>(EMPTY_SUMMARY);
  const [summaryState, setSummaryState] = useState<"loading" | "ready" | "error">("loading");
  const [query, setQuery] = useState("");
  const [searchedQuery, setSearchedQuery] = useState("");
  const [users, setUsers] = useState<BalanceUser[]>([]);
  const [searchState, setSearchState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<BalanceUser | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [ledgerState, setLedgerState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [amountYuan, setAmountYuan] = useState("20");
  const [reason, setReason] = useState("诘星体验余额");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"info" | "success" | "error">("info");
  const pendingOperationKeysRef = useRef(new Map<string, PendingGrantOperation>());
  const submitInFlightRef = useRef(false);

  useEffect(() => {
    void loadSummary();
  }, []);

  async function loadSummary() {
    setSummaryState("loading");
    const response = await fetch("/api/admin/star-interview-balance?summaryOnly=1", { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setSummaryState("error");
      return;
    }
    setSummary(payload.summary as BalanceSummary);
    setSummaryState("ready");
  }

  async function searchUsers(nextPage = 1) {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      setSearchState("idle");
      setUsers([]);
      setTotal(0);
      setPage(1);
      setTotalPages(1);
      setMessage("");
      return;
    }

    setSearchState("loading");
    setMessage("");
    setConfirming(false);
    const params = new URLSearchParams({ query: normalizedQuery, page: String(nextPage) });
    const response = await fetch(`/api/admin/star-interview-balance?${params}`, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(typeof payload.error === "string" ? payload.error : "用户余额暂时无法读取。");
      setMessageTone("error");
      setSearchState("error");
      return;
    }
    setUsers(payload.users as BalanceUser[]);
    setSearchedQuery(normalizedQuery);
    setPage(payload.page as number);
    setTotal(payload.total as number);
    setTotalPages(payload.totalPages as number);
    setSearchState("ready");
  }

  async function selectUser(user: BalanceUser) {
    if (submitInFlightRef.current) return;
    setMode("single");
    setSelectedUser(user);
    setConfirming(false);
    setMessage("");
    setLedger([]);
    setLedgerState("loading");
    const response = await fetch(`/api/admin/star-interview-balance?userId=${encodeURIComponent(user.id)}`, {
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setLedgerState("error");
      return;
    }
    setSelectedUser(payload.user as BalanceUser);
    setLedger(payload.ledger as LedgerEntry[]);
    setLedgerState("ready");
  }

  function resetConfirmation() {
    setConfirming(false);
    setMessage("");
  }

  async function submit() {
    if (submitInFlightRef.current) return;

    const amount = Number(amountYuan);
    if (!Number.isFinite(amount) || amount < 1 || amount > 1_000) {
      setMessage("发放金额需在 ¥1.00 至 ¥1,000.00 之间。");
      setMessageTone("error");
      return;
    }
    if (!reason.trim()) {
      setMessage("请填写账本说明。");
      setMessageTone("error");
      return;
    }
    if (mode === "single" && !selectedUser) {
      setMessage("请先搜索并选择一个用户。");
      setMessageTone("error");
      return;
    }

    const normalizedGrant = {
      mode,
      recipient: mode === "batch" ? "all" : selectedUser!.id,
      amountFen: Math.round(amount * 100),
      reason: reason.trim(),
    } as const;
    const operationFingerprint = JSON.stringify(normalizedGrant);
    submitInFlightRef.current = true;
    let pendingOperation: PendingGrantOperation;
    try {
      pendingOperation = await getOrCreatePendingGrantOperation(
        operationFingerprint,
        pendingOperationKeysRef.current,
      );
    } catch {
      submitInFlightRef.current = false;
      setMessage("暂时无法创建安全的发放操作编号，请稍后重试。");
      setMessageTone("error");
      return;
    }

    if (!confirming) {
      setConfirming(true);
      setMessageTone("info");
      setMessage(
        mode === "batch"
          ? `将向全部 ${summary.totalUsers} 位注册用户发放 ¥${amount.toFixed(2)}，请再次点击确认。`
          : `将向 ${selectedUser?.displayName} 发放 ¥${amount.toFixed(2)}，请再次点击确认。`,
      );
      submitInFlightRef.current = false;
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/star-interview-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(normalizedGrant.mode === "batch"
            ? { allUsers: true }
            : { userIds: [normalizedGrant.recipient] }),
          amountFen: normalizedGrant.amountFen,
          reason: normalizedGrant.reason,
          idempotencyKey: pendingOperation.idempotencyKey,
        }),
      });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const error = readGrantError(payload) ?? "余额发放失败。";
        setMessage(`${error} 保持发放对象、金额和说明不变后重试时，将沿用同一操作编号。`);
        setMessageTone("error");
        return;
      }
      if (!isConfirmedGrantResponse(payload)) {
        setMessage("未能确认本次发放结果。请保持发放对象、金额和说明不变后再次确认；重试会沿用同一操作编号，避免重复到账。");
        setMessageTone("error");
        return;
      }

      await clearPendingGrantOperation(pendingOperation, pendingOperationKeysRef.current);
      setMessage(`发放完成：${payload.succeeded} 位用户已到账 ¥${(normalizedGrant.amountFen / 100).toFixed(2)}。`);
      setMessageTone("success");
      void loadSummary();
      if (selectedUser && normalizedGrant.mode === "single") {
        try {
          const responseAfterGrant = await fetch(
            `/api/admin/star-interview-balance?userId=${encodeURIComponent(normalizedGrant.recipient)}`,
            { cache: "no-store" },
          );
          const payloadAfterGrant = await responseAfterGrant.json().catch(() => ({}));
          if (responseAfterGrant.ok) {
            setSelectedUser(payloadAfterGrant.user as BalanceUser);
            setLedger(payloadAfterGrant.ledger as LedgerEntry[]);
            setLedgerState("ready");
          }
        } catch {
          setLedgerState("error");
        }
      }
    } catch {
      setMessage("网络中断，暂时无法确认本次发放结果。请保持发放对象、金额和说明不变后再次确认；重试会沿用同一操作编号，避免重复到账。");
      setMessageTone("error");
    } finally {
      submitInFlightRef.current = false;
      setSaving(false);
      setConfirming(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1180px] space-y-9 pb-16">
      <header className="border-b border-[color:var(--line-ghost)] px-1 pb-8 sm:px-2">
        <Link
          href="/admin"
          className="text-action -ml-2 mb-6 inline-flex h-9 items-center gap-2 px-2 text-sm"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          返回管理后台
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="page-kicker">StarInterview · 账户资金</p>
            <h1 className="page-title mt-3">余额管理</h1>
            <p className="page-description mt-3 max-w-2xl">
              搜索并确认账户后再发放余额。每笔操作都会写入账本，支持追溯且不会重复到账。
            </p>
          </div>
          <div className="flex rounded-xl bg-[color:var(--surface-subtle-bg)] p-1" aria-label="发放模式">
            <button
              type="button"
              onClick={() => {
                if (submitInFlightRef.current) return;
                setMode("single");
                resetConfirmation();
              }}
              disabled={saving}
              className={modeButtonClass(mode === "single")}
              aria-pressed={mode === "single"}
            >
              <UserRound aria-hidden="true" className="size-4" />
              单人发放
            </button>
            <button
              type="button"
              onClick={() => {
                if (submitInFlightRef.current) return;
                setMode("batch");
                resetConfirmation();
              }}
              disabled={saving}
              className={modeButtonClass(mode === "batch")}
              aria-pressed={mode === "batch"}
            >
              <UsersRound aria-hidden="true" className="size-4" />
              全员发放
            </button>
          </div>
        </div>
      </header>

      <section className="grid gap-px overflow-hidden rounded-[22px] border border-[color:var(--line-ghost)] bg-[color:var(--line-ghost)] sm:grid-cols-2 xl:grid-cols-4">
        <SummaryMetric
          label="注册账户"
          value={summaryState === "ready" ? String(summary.totalUsers) : "—"}
          helper="全部 StarInterview 账户"
        />
        <SummaryMetric
          label="有余额账户"
          value={summaryState === "ready" ? String(summary.fundedUsers) : "—"}
          helper="当前余额大于 ¥0"
        />
        <SummaryMetric
          label="无限使用"
          value={summaryState === "ready" ? String(summary.unlimitedUsers) : "—"}
          helper="仍记录影子消耗"
        />
        <SummaryMetric
          label="账户余额合计"
          value={summaryState === "ready" ? `¥${fen(summary.totalBalanceFen)}` : "—"}
          helper={summaryState === "error" ? "概览暂时无法读取" : "所有账户当前余额"}
        />
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(340px,0.84fr)_minmax(0,1.16fr)]">
        <section
          aria-labelledby="account-search-title"
          className="rounded-[24px] border border-[color:var(--line-ghost)] bg-[color:var(--surface-read-bg-strong)] p-5 sm:p-7"
        >
          <div className="flex items-start gap-3">
            <Search aria-hidden="true" className="mt-1 size-5 text-[color:var(--aurora)]" />
            <div>
              <h2 id="account-search-title" className="section-title">查找账户</h2>
              <p className="mt-2 text-sm leading-6 text-ink-secondary">输入姓名、邮箱或用户 ID，不再默认展示全部用户。</p>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <label className="min-w-0 flex-1">
              <span className="sr-only">搜索用户</span>
              <Input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  if (!event.target.value.trim()) {
                    setSearchState("idle");
                    setUsers([]);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void searchUsers(1);
                }}
                placeholder="姓名、邮箱或用户 ID"
              />
            </label>
            <Button variant="secondary" onClick={() => void searchUsers(1)} disabled={!query.trim()}>
              搜索
            </Button>
          </div>

          <div className="mt-6 min-h-64 border-t border-[color:var(--line-ghost)]">
            {searchState === "idle" ? (
              <SearchEmpty />
            ) : searchState === "loading" ? (
              <div className="py-10 text-sm text-ink-muted">
                <span className="loading-line">正在查找账户</span>
              </div>
            ) : searchState === "error" ? (
              <div className="py-10 text-sm text-[color:var(--text-danger)]">搜索失败，请稍后重试。</div>
            ) : users.length ? (
              <>
                <div className="flex items-center justify-between px-1 py-4 text-xs text-ink-muted">
                  <span>“{searchedQuery}”找到 {total} 位用户</span>
                  {totalPages > 1 ? <span>{page} / {totalPages} 页</span> : null}
                </div>
                <div className="border-y border-[color:var(--line-ghost)]">
                  {users.map((user) => {
                    const active = selectedUser?.id === user.id;
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => void selectUser(user)}
                        disabled={saving}
                        className={cn(
                          "group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-[color:var(--line-ghost)] px-4 py-4 text-left transition-colors last:border-b-0 hover:bg-[color:var(--surface-hover-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--aurora)]",
                          active && "bg-[color:var(--surface-hover-bg)]",
                        )}
                      >
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <strong className="truncate text-sm text-ink-primary">{user.displayName}</strong>
                            {user.accessMode === "unlimited" ? (
                              <span className="rounded-full bg-[color:var(--surface-subtle-bg)] px-2 py-0.5 text-[11px] text-ink-secondary">无限</span>
                            ) : null}
                          </span>
                          <span className="mt-1 block truncate text-xs text-ink-muted">{user.email}</span>
                        </span>
                        <span className="text-right">
                          <strong className="block text-sm tabular-nums text-ink-primary">¥{fen(user.balanceFen)}</strong>
                          <span className="mt-1 block text-[11px] text-ink-muted">选择账户</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                {totalPages > 1 ? (
                  <div className="mt-4 flex items-center justify-end gap-2">
                    <Button
                      variant="secondary"
                      className="min-h-9 px-3"
                      disabled={page <= 1}
                      onClick={() => void searchUsers(page - 1)}
                    >
                      <ChevronLeft aria-hidden="true" className="size-4" />
                      上一页
                    </Button>
                    <Button
                      variant="secondary"
                      className="min-h-9 px-3"
                      disabled={page >= totalPages}
                      onClick={() => void searchUsers(page + 1)}
                    >
                      下一页
                      <ChevronRight aria-hidden="true" className="size-4" />
                    </Button>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="py-10">
                <p className="text-sm font-medium text-ink-primary">没有找到匹配账户</p>
                <p className="mt-2 text-sm text-ink-muted">检查姓名或邮箱，也可以粘贴完整用户 ID。</p>
              </div>
            )}
          </div>
        </section>

        <section
          aria-labelledby="grant-title"
          className="rounded-[24px] border border-[color:var(--line-ghost)] bg-[color:var(--surface-read-bg-strong)] p-5 sm:p-7"
        >
          <div className="flex items-start gap-3">
            <CircleDollarSign aria-hidden="true" className="mt-1 size-5 text-[color:var(--aurora)]" />
            <div>
              <h2 id="grant-title" className="section-title">设置发放</h2>
              <p className="mt-2 text-sm leading-6 text-ink-secondary">
                {mode === "single" ? "核对选中账户与余额，再填写金额和账本说明。" : "全员发放属于高影响操作，需要二次确认。"}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-[color:var(--surface-subtle-bg)] p-5 sm:p-6">
            {mode === "single" ? (
              selectedUser ? (
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-ink-muted">发放对象</p>
                    <h3 className="mt-2 truncate text-lg font-semibold text-ink-primary">{selectedUser.displayName}</h3>
                    <p className="mt-1 truncate text-sm text-ink-secondary">{selectedUser.email}</p>
                    <p className="mt-2 font-mono text-[11px] text-ink-muted">{selectedUser.id}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-x-7 gap-y-2 text-right">
                    <MetricPair label="当前余额" value={`¥${fen(selectedUser.balanceFen)}`} />
                    <MetricPair label="累计消耗" value={`¥${fen(selectedUser.nominalSpentFen)}`} />
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 py-1">
                  <UserRound aria-hidden="true" className="mt-0.5 size-5 text-ink-muted" />
                  <div>
                    <p className="text-sm font-medium text-ink-primary">尚未选择账户</p>
                    <p className="mt-1 text-sm leading-6 text-ink-muted">先在左侧搜索结果中选择一位用户。</p>
                  </div>
                </div>
              )
            ) : (
              <div className="flex items-start gap-3">
                <ShieldAlert aria-hidden="true" className="mt-0.5 size-5 text-[color:var(--text-danger)]" />
                <div>
                  <p className="text-sm font-medium text-ink-primary">将覆盖全部 {summary.totalUsers} 位注册用户</p>
                  <p className="mt-1 text-sm leading-6 text-ink-secondary">
                    包括无限使用账户。余额仍会增加，无限账户继续只记录影子消耗。
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <span className="block text-xs font-medium text-ink-muted">快捷金额</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {AMOUNT_PRESETS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => {
                      if (submitInFlightRef.current) return;
                      setAmountYuan(amount);
                      resetConfirmation();
                    }}
                    disabled={saving}
                    className={cn(
                      "pressable min-h-10 rounded-lg border px-4 text-sm tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--aurora)]",
                      amountYuan === amount
                        ? "border-[color:var(--aurora)] bg-[color:var(--surface-hover-bg)] text-ink-primary"
                        : "border-[color:var(--line)] text-ink-secondary hover:border-[color:var(--line-strong)] hover:text-ink-primary",
                    )}
                  >
                    ¥{amount}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-1.5 block text-xs font-medium text-ink-muted">发放金额（元）</span>
                <Input
                  type="number"
                  min="1"
                  max="1000"
                  step="1"
                  value={amountYuan}
                  disabled={saving}
                  onChange={(event) => {
                    if (submitInFlightRef.current) return;
                    setAmountYuan(event.target.value);
                    resetConfirmation();
                  }}
                />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-medium text-ink-muted">账本说明</span>
                <Input
                  value={reason}
                  maxLength={120}
                  disabled={saving}
                  onChange={(event) => {
                    if (submitInFlightRef.current) return;
                    setReason(event.target.value);
                    resetConfirmation();
                  }}
                  placeholder="例如：内测体验余额"
                />
              </label>
            </div>

            {message ? (
              <p
                className={cn(
                  "border-l-2 pl-3 text-sm leading-6",
                  messageTone === "error" && "border-[color:var(--text-danger)] text-[color:var(--text-danger)]",
                  messageTone === "success" && "border-[color:var(--aurora)] text-ink-primary",
                  messageTone === "info" && "border-aurum/70 text-ink-secondary",
                )}
                role="status"
              >
                {message}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[color:var(--line-ghost)] pt-5">
              <p className="text-xs leading-5 text-ink-muted">确认后立即到账，并写入管理员发放记录。</p>
              <Button
                variant={mode === "batch" && confirming ? "danger" : "primary"}
                disabled={saving || !reason.trim() || !amountYuan || (mode === "single" && !selectedUser)}
                onClick={() => void submit()}
              >
                {confirming ? <Coins aria-hidden="true" className="size-4" /> : <Send aria-hidden="true" className="size-4" />}
                {saving ? "正在发放" : confirming ? "确认并发放" : "发放余额"}
              </Button>
            </div>
          </div>

          {mode === "single" && selectedUser ? (
            <div className="mt-10 border-t border-[color:var(--line-ghost)] pt-7">
              <div className="flex items-center gap-2">
                <History aria-hidden="true" className="size-4 text-ink-muted" />
                <h3 className="text-sm font-semibold text-ink-primary">最近账本</h3>
              </div>
              {ledgerState === "loading" ? (
                <div className="py-7 text-sm text-ink-muted"><span className="loading-line">正在读取账本</span></div>
              ) : ledgerState === "error" ? (
                <p className="py-7 text-sm text-[color:var(--text-danger)]">最近账本暂时无法读取。</p>
              ) : ledger.length ? (
                <div className="mt-4 divide-y divide-[color:var(--line-ghost)] overflow-hidden rounded-2xl border border-[color:var(--line-ghost)]">
                  {ledger.map((entry) => (
                    <div key={entry.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 px-4 py-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-ink-primary">{entry.note || ledgerLabel(entry)}</p>
                        <p className="mt-1 text-xs text-ink-muted">
                          {ledgerLabel(entry)} · {formatDateTime(entry.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <strong className={cn(
                          "block text-sm tabular-nums",
                          entry.amount_fen > 0 ? "text-[color:var(--aurora)]" : "text-ink-primary",
                        )}>
                          {entry.amount_fen > 0 ? "+" : ""}¥{fen(entry.amount_fen)}
                        </strong>
                        <span className="mt-1 block text-[11px] tabular-nums text-ink-muted">
                          余额 ¥{fen(entry.balance_after_fen)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-7 text-sm text-ink-muted">这个账户还没有账本记录。</p>
              )}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function SummaryMetric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="bg-[color:var(--surface-read-bg-strong)] px-6 py-6">
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-[-0.02em] text-ink-primary">{value}</p>
      <p className="mt-1 text-xs text-ink-muted">{helper}</p>
    </div>
  );
}

function MetricPair({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="mt-1 text-base font-semibold tabular-nums text-ink-primary">{value}</p>
    </div>
  );
}

function SearchEmpty() {
  return (
    <div className="flex min-h-64 items-center justify-center py-10 text-center">
      <div>
        <WalletCards aria-hidden="true" className="mx-auto size-7 text-ink-muted" />
        <p className="mt-4 text-sm font-medium text-ink-primary">搜索后显示账户</p>
        <p className="mt-2 max-w-64 text-sm leading-6 text-ink-muted">页面不会再铺出全部用户，结果只在需要时出现。</p>
      </div>
    </div>
  );
}

function modeButtonClass(active: boolean) {
  return cn(
    "pressable inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--aurora)]",
    active
      ? "bg-[color:var(--background)] text-ink-primary shadow-[0_1px_2px_rgba(16,31,54,0.08)]"
      : "text-ink-muted hover:text-ink-primary",
  );
}

function ledgerLabel(entry: LedgerEntry) {
  if (entry.entry_type === "admin_grant") return "管理员发放";
  if (entry.entry_type === "recharge") return "用户充值";
  if (entry.entry_type === "refund") return "余额退款";
  if (entry.entry_type === "correction") return "账本修正";
  if (entry.feature === "asr") return "语音识别";
  if (entry.feature === "completion") return "回答生成";
  return "服务使用";
}

function fen(value: number) {
  return (value / 100).toFixed(2);
}

function readGrantError(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("error" in payload)) return null;
  return typeof payload.error === "string" ? payload.error : null;
}

function isConfirmedGrantResponse(payload: unknown): payload is { succeeded: number; total: number } {
  if (!payload || typeof payload !== "object") return false;
  if (!("succeeded" in payload) || !("total" in payload)) return false;
  const result = payload as { succeeded: unknown; total: unknown };
  return typeof result.succeeded === "number"
    && typeof result.total === "number"
    && Number.isInteger(result.succeeded)
    && Number.isInteger(result.total)
    && result.succeeded >= 0
    && result.succeeded === result.total;
}

async function getOrCreatePendingGrantOperation(
  fingerprint: string,
  memory: Map<string, PendingGrantOperation>,
) {
  const digest = await digestOperationFingerprint(fingerprint);
  const storageKey = digest ? `${OPERATION_KEY_STORAGE_PREFIX}${digest}` : null;
  const resolveOperation = () => {
    const now = Date.now();
    if (storageKey) {
      const persisted = readPersistedGrantOperation(storageKey, now);
      if (persisted) {
        const operation = { fingerprint, storageKey, ...persisted };
        memory.set(fingerprint, operation);
        return operation;
      }
    }

    const cached = memory.get(fingerprint);
    if (cached && cached.expiresAt > now) {
      const persisted = storageKey
        ? writePersistedGrantOperation(storageKey, cached)
        : false;
      const operation = {
        ...cached,
        storageKey: persisted ? storageKey : cached.storageKey,
      };
      memory.set(fingerprint, operation);
      return operation;
    }
    memory.delete(fingerprint);

    const operation: PendingGrantOperation = {
      fingerprint,
      storageKey: null,
      idempotencyKey: createIdempotencyKey(),
      expiresAt: now + OPERATION_KEY_TTL_MS,
    };
    if (storageKey && writePersistedGrantOperation(storageKey, operation)) {
      operation.storageKey = storageKey;
    }
    memory.set(fingerprint, operation);
    return operation;
  };

  return storageKey
    ? withOperationStorageLock(storageKey, resolveOperation)
    : resolveOperation();
}

async function clearPendingGrantOperation(
  operation: PendingGrantOperation,
  memory: Map<string, PendingGrantOperation>,
) {
  if (memory.get(operation.fingerprint)?.idempotencyKey === operation.idempotencyKey) {
    memory.delete(operation.fingerprint);
  }
  if (!operation.storageKey) return;

  await withOperationStorageLock(operation.storageKey, () => {
    const persisted = readPersistedGrantOperation(operation.storageKey!, Date.now());
    if (persisted?.idempotencyKey === operation.idempotencyKey) {
      removePersistedGrantOperation(operation.storageKey!);
    }
  });
}

async function digestOperationFingerprint(fingerprint: string) {
  if (typeof globalThis.crypto?.subtle === "undefined" || typeof TextEncoder === "undefined") {
    return null;
  }
  try {
    const digest = await globalThis.crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(fingerprint),
    );
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

function readPersistedGrantOperation(storageKey: string, now: number) {
  const storage = getOperationStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(storageKey);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!isPersistedGrantOperation(value, now)) {
      storage.removeItem(storageKey);
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

function writePersistedGrantOperation(
  storageKey: string,
  operation: Pick<PendingGrantOperation, "idempotencyKey" | "expiresAt">,
) {
  const storage = getOperationStorage();
  if (!storage) return false;
  try {
    storage.setItem(storageKey, JSON.stringify({
      idempotencyKey: operation.idempotencyKey,
      expiresAt: operation.expiresAt,
    }));
    return true;
  } catch {
    return false;
  }
}

function removePersistedGrantOperation(storageKey: string) {
  try {
    getOperationStorage()?.removeItem(storageKey);
  } catch {
    // A storage failure only reduces persistence; the in-memory key is still cleared after success.
  }
}

function getOperationStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

async function withOperationStorageLock<T>(storageKey: string, task: () => T | Promise<T>) {
  if (typeof navigator === "undefined" || !navigator.locks?.request) return task();
  try {
    return await navigator.locks.request(`starjob-admin-balance:${storageKey}`, { mode: "exclusive" }, task);
  } catch {
    return task();
  }
}

function isPersistedGrantOperation(
  value: unknown,
  now: number,
): value is Pick<PendingGrantOperation, "idempotencyKey" | "expiresAt"> {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { idempotencyKey?: unknown; expiresAt?: unknown };
  return typeof candidate.idempotencyKey === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(candidate.idempotencyKey)
    && typeof candidate.expiresAt === "number"
    && Number.isFinite(candidate.expiresAt)
    && candidate.expiresAt > now
    && candidate.expiresAt <= now + OPERATION_KEY_TTL_MS;
}

function createIdempotencyKey() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
  }
  throw new Error("Secure random values are unavailable.");
}

type PendingGrantOperation = {
  fingerprint: string;
  storageKey: string | null;
  idempotencyKey: string;
  expiresAt: number;
};

type BalanceSummary = {
  totalUsers: number;
  fundedUsers: number;
  unlimitedUsers: number;
  totalBalanceFen: number;
};

type BalanceUser = {
  id: string;
  email: string;
  displayName: string;
  accessMode: "standard" | "unlimited";
  balanceFen: number;
  totalGrantedFen: number;
  totalRechargedFen: number;
  totalSpentFen: number;
  nominalSpentFen: number;
  updatedAt: string | null;
};

type LedgerEntry = {
  id: string;
  entry_type: "usage" | "admin_grant" | "recharge" | "refund" | "correction";
  amount_fen: number;
  nominal_amount_fen: number;
  balance_after_fen: number;
  feature: "asr" | "completion" | null;
  note: string | null;
  created_at: string;
};
