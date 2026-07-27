"use client";

import Link from "next/link";
import { ArrowRight, Infinity as InfinityIcon, RefreshCw, Sparkles, WalletCards } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

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

type BillingData = {
  wallet: {
    balanceFen: number;
    totalGrantedFen: number;
    totalRechargedFen: number;
    totalSpentFen: number;
    nominalSpentFen: number;
  };
  ledger: LedgerEntry[];
  accessMode: "standard" | "unlimited";
  pricing: {
    asrFenPerMinute: number;
    completionFenPerAnswer: number;
    targetInterviewFen: number;
  };
  recharge: { available: boolean; provider: "wechat_native" };
};

export function StarInterviewBillingClient() {
  const [data, setData] = useState<BillingData | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [checkout, setCheckout] = useState<{
    orderId: string;
    amountFen: number;
    expiresAt: string;
    qrDataUrl: string;
  } | null>(null);
  const [checkoutState, setCheckoutState] = useState<"idle" | "creating">("idle");

  const load = useCallback(async () => {
    setState("loading");
    const response = await fetch("/api/star-interview/billing", { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(typeof payload.error === "string" ? payload.error : "诘星账本暂时无法读取。");
      setState("error");
      return;
    }
    setData(payload as BillingData);
    setState("ready");
  }, []);

  useEffect(() => {
    let mounted = true;
    void fetch("/api/star-interview/billing", { cache: "no-store" })
      .then(async (response) => ({ response, payload: await response.json().catch(() => ({})) }))
      .then(({ response, payload }) => {
        if (!mounted) return;
        if (!response.ok) {
          setMessage(typeof payload.error === "string" ? payload.error : "诘星账本暂时无法读取。");
          setState("error");
          return;
        }
        setData(payload as BillingData);
        setState("ready");
      });
    return () => { mounted = false; };
  }, []);

  if (state === "loading") {
    return <div className="empty-state"><span className="loading-line">正在读取诘星余额</span></div>;
  }
  if (state === "error" || !data) {
    return (
      <div className="empty-state">
        <p>{message}</p>
        <Button className="mt-4" onClick={() => void load()}>重试</Button>
      </div>
    );
  }

  const unlimited = data.accessMode === "unlimited";
  async function createRecharge(amountFen: number) {
    setCheckoutState("creating");
    setMessage("");
    const response = await fetch("/api/star-interview/recharge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountFen }),
    });
    const payload = await response.json().catch(() => ({}));
    setCheckoutState("idle");
    if (!response.ok) {
      setMessage(typeof payload.error === "string" ? payload.error : "充值订单创建失败。");
      return;
    }
    setCheckout(payload);
  }
  return (
    <main className="observatory-page">
      <header className="page-hero border-b border-[color:var(--line-ghost)] pb-10">
        <p className="page-kicker">StarInterview · 诘星</p>
        <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.46fr)] lg:items-end">
          <div>
            <h1 className="page-title">余额与使用账单</h1>
            <p className="page-description mt-4 max-w-[58ch]">
              每次成功识别与生成回答才会计费。失败请求不扣款，所有变动都保留在同一份账户账本中。
            </p>
          </div>
          <div className="border-l-2 border-nebula-blue/70 pl-5">
            <span className="text-xs font-medium text-ink-muted">{unlimited ? "可用余额（不限制使用）" : "当前可用余额"}</span>
            <strong className="mt-2 block font-display text-4xl font-semibold tracking-[-0.05em] text-ink-primary tabular-nums">
              ¥{fen(data.wallet.balanceFen)}
            </strong>
            <span className="mt-2 flex items-center gap-2 text-sm text-ink-secondary">
              {unlimited ? <><InfinityIcon className="size-4 text-nebula-blue" />无限账户不会因余额不足中断</> : "余额不足时会在下一次模型调用前提示充值"}
            </span>
          </div>
        </div>
      </header>

      <section className="grid gap-px border-b border-[color:var(--line-ghost)] bg-[color:var(--line-ghost)] sm:grid-cols-3" aria-label="计费概览">
        <Metric label="实际已扣" value={`¥${fen(data.wallet.totalSpentFen)}`} />
        <Metric label={unlimited ? "按标准价模拟消耗" : "累计标准消耗"} value={`¥${fen(data.wallet.nominalSpentFen)}`} />
        <Metric label="充值与赠送" value={`¥${fen(data.wallet.totalRechargedFen + data.wallet.totalGrantedFen)}`} />
      </section>

      <section className="grid gap-10 border-b border-[color:var(--line-ghost)] py-10 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1fr)]">
        <div>
          <p className="section-eyebrow"><WalletCards className="size-4" />充值</p>
          <h2 className="section-title mt-3">为下一场面试预留余额</h2>
          <p className="mt-3 max-w-[48ch] text-sm leading-7 text-ink-secondary">
            建议单次准备 ¥20—¥40。参考价格为语音识别 ¥0.40/分钟、每次成功生成回答 ¥0.80；一场 30 分钟、约 10 次回答的面试约 ¥20。
          </p>
        </div>
        {data.recharge.available ? (
          <div className="border-l border-[color:var(--line-ghost)] pl-6">
            <p className="text-sm font-semibold text-ink-primary">微信扫码充值</p>
            {checkout ? (
              <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={checkout.qrDataUrl} alt={`微信支付 ¥${fen(checkout.amountFen)} 二维码`} className="size-48 rounded-lg border border-[color:var(--line-ghost)] bg-white p-2" />
                <div>
                  <strong className="text-2xl tabular-nums text-ink-primary">¥{fen(checkout.amountFen)}</strong>
                  <p className="mt-2 text-sm leading-6 text-ink-secondary">请使用微信扫描二维码。支付成功后余额会由签名回调自动到账。</p>
                  <p className="mt-2 text-xs text-ink-muted">二维码于 {formatDate(checkout.expiresAt)} 失效</p>
                  <Button variant="secondary" className="mt-4" onClick={() => void load()}>我已支付，刷新余额</Button>
                </div>
              </div>
            ) : (
              <>
                <p className="mt-2 text-sm leading-6 text-ink-secondary">选择金额后生成 15 分钟有效的一次性支付二维码。</p>
                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[1_000, 2_000, 4_000, 10_000].map((amount) => (
                    <Button key={amount} variant="secondary" disabled={checkoutState === "creating"} onClick={() => void createRecharge(amount)}>
                      ¥{fen(amount)}
                    </Button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="border-l-2 border-aurum/60 pl-6">
            <p className="text-sm font-semibold text-ink-primary">在线充值尚未开通</p>
            <p className="mt-2 max-w-[54ch] text-sm leading-7 text-ink-secondary">
              当前线上环境缺少微信支付商户号、证书和回调验签配置，因此这里不会展示一个无法完成付款的按钮。管理员仍可在后台向单个用户或全部用户发放余额。
            </p>
          </div>
        )}
      </section>

      <section className="py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="section-eyebrow"><Sparkles className="size-4" />流水</p>
            <h2 className="section-title mt-3">最近变动</h2>
          </div>
          <button type="button" className="text-action h-9 px-2.5 text-sm" onClick={() => void load()}>
            <RefreshCw className="size-4" />刷新
          </button>
        </div>
        {data.ledger.length ? (
          <div className="mt-6 border-y border-[color:var(--line-ghost)]">
            {data.ledger.map((entry) => (
              <div key={entry.id} className="grid gap-2 border-b border-[color:var(--line-ghost)] py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_140px_120px] sm:items-center">
                <div>
                  <p className="text-sm font-medium text-ink-primary">{entryLabel(entry)}</p>
                  <p className="mt-1 text-xs text-ink-muted">{formatDate(entry.created_at)}{entry.note ? ` · ${entry.note}` : ""}</p>
                </div>
                <span className="text-sm text-ink-secondary sm:text-right">余额 ¥{fen(entry.balance_after_fen)}</span>
                <strong className={`text-sm tabular-nums sm:text-right ${entry.amount_fen > 0 ? "text-nebula-blue" : "text-ink-primary"}`}>
                  {entry.amount_fen > 0 ? "+" : entry.amount_fen < 0 ? "−" : "影子 " }¥{fen(Math.abs(entry.amount_fen || entry.nominal_amount_fen))}
                </strong>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 border-y border-[color:var(--line-ghost)] py-10 text-sm text-ink-muted">还没有余额变动。</div>
        )}
        <Link href="/interview" className="text-action mt-6 inline-flex text-sm">返回诘星介绍 <ArrowRight className="size-4" /></Link>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="bg-[color:var(--background)] px-5 py-6"><span className="text-xs text-ink-muted">{label}</span><strong className="mt-2 block text-2xl font-semibold tabular-nums text-ink-primary">{value}</strong></div>;
}

function fen(value: number) { return (value / 100).toFixed(2); }
function formatDate(value: string) { return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
function entryLabel(entry: LedgerEntry) {
  if (entry.entry_type === "admin_grant") return "管理员发放";
  if (entry.entry_type === "recharge") return "充值到账";
  if (entry.entry_type === "refund") return "退款到账";
  if (entry.entry_type === "correction") return "余额调整";
  return entry.feature === "asr" ? "语音识别" : "回答生成";
}
