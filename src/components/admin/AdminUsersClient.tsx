"use client";

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  confirmAdminUserEmail,
  fetchAdminUsers,
  updateAdminUser,
  type AdminUserActivityFilter,
  type AdminUserMetrics,
  type AdminUserRoleFilter,
  type AdminUserSort,
  type AdminUserStatusFilter,
  type AdminUserSummary,
} from "@/lib/admin-users";
import type { ProfileRole } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";

type Draft = { displayName: string; role: ProfileRole };

const EMPTY_METRICS: AdminUserMetrics = {
  totalUsers: 0,
  active24h: 0,
  active3d: 0,
  neverSignedIn: 0,
  disabledUsers: 0,
};

export function AdminUsersClient() {
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [metrics, setMetrics] = useState<AdminUserMetrics>(EMPTY_METRICS);
  const [currentUserId, setCurrentUserId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalFiltered, setTotalFiltered] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState("");
  const [activity, setActivity] = useState<AdminUserActivityFilter>("all");
  const [role, setRole] = useState<AdminUserRoleFilter>("all");
  const [status, setStatus] = useState<AdminUserStatusFilter>("all");
  const [sort, setSort] = useState<AdminUserSort>("activity_desc");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [savingId, setSavingId] = useState("");
  const [confirmDisableId, setConfirmDisableId] = useState("");
  const [confirmEmailId, setConfirmEmailId] = useState("");
  const [confirmRoleId, setConfirmRoleId] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (hasLoadedRef.current) setRefreshing(true);
      else setState("loading");
      setMessage("");
      void fetchAdminUsers({ page, pageSize, query, activity, role, status, sort })
        .then((result) => {
          if (cancelled) return;
          setUsers(result.users);
          setMetrics(result.metrics);
          setCurrentUserId(result.currentUserId);
          setPage(result.page);
          setPageSize(result.pageSize);
          setTotalFiltered(result.totalFiltered);
          setTotalPages(result.totalPages);
          setDrafts(Object.fromEntries(result.users.map((user) => [user.id, {
            displayName: user.displayName,
            role: user.role,
          }])));
          hasLoadedRef.current = true;
          setState("ready");
        })
        .catch((error) => {
          if (cancelled) return;
          setState("error");
          setMessage(error instanceof Error ? error.message : "用户列表读取失败，请稍后重试。");
        })
        .finally(() => {
          if (!cancelled) setRefreshing(false);
        });
    }, query ? 260 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activity, page, pageSize, query, revision, role, sort, status]);

  function updateDraft(id: string, values: Partial<Draft>) {
    setConfirmRoleId("");
    setDrafts((current) => ({ ...current, [id]: { ...current[id], ...values } }));
  }

  function requestSaveUser(user: AdminUserSummary) {
    const draft = drafts[user.id] ?? { displayName: user.displayName, role: user.role };
    if (draft.role !== user.role && confirmRoleId !== user.id) {
      setConfirmRoleId(user.id);
      setMessage(`再次点击“确认身份”将把 ${user.email} 的身份改为${draft.role === "admin" ? "管理员" : "普通用户"}。`);
      return;
    }
    void saveUser(user);
  }

  async function saveUser(user: AdminUserSummary, disabled = Boolean(user.bannedUntil)) {
    const draft = drafts[user.id] ?? { displayName: user.displayName, role: user.role };
    setSavingId(user.id);
    setMessage("");
    try {
      const result = await updateAdminUser(user.id, { ...draft, disabled });
      const wasDisabled = Boolean(user.bannedUntil);
      const isDisabled = Boolean(result.user.bannedUntil);
      setUsers((current) => current.map((item) => item.id === user.id ? result.user : item));
      if (wasDisabled !== isDisabled) {
        setMetrics((current) => ({
          ...current,
          disabledUsers: Math.max(0, current.disabledUsers + (isDisabled ? 1 : -1)),
        }));
      }
      setDrafts((current) => ({ ...current, [user.id]: {
        displayName: result.user.displayName,
        role: result.user.role,
      }}));
      setConfirmDisableId("");
      setConfirmRoleId("");
      setMessage(`${result.user.email} 的账户设置已更新。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "用户账户更新失败，原设置未改变。");
    } finally {
      setSavingId("");
    }
  }

  function requestAccountToggle(user: AdminUserSummary) {
    const disabled = Boolean(user.bannedUntil);
    if (disabled) {
      void saveUser(user, false);
      return;
    }
    if (confirmDisableId === user.id) {
      void saveUser(user, true);
      return;
    }
    setConfirmDisableId(user.id);
    setMessage(`再次点击“确认停用”将阻止 ${user.email} 登录，现有数据会保留。`);
  }

  function requestEmailConfirmation(user: AdminUserSummary) {
    if (user.emailConfirmedAt) return;
    if (confirmEmailId !== user.id) {
      setConfirmEmailId(user.id);
      setMessage(`再次点击“确认邮箱”将跳过验证邮件，把 ${user.email} 设为已确认。`);
      return;
    }
    void confirmEmail(user);
  }

  async function confirmEmail(user: AdminUserSummary) {
    setSavingId(user.id);
    setMessage("");
    try {
      const result = await confirmAdminUserEmail(user.id);
      setUsers((current) => status === "unconfirmed"
        ? current.filter((item) => item.id !== user.id)
        : current.map((item) => item.id === user.id ? result.user : item));
      if (status === "unconfirmed") {
        const nextTotal = Math.max(0, totalFiltered - 1);
        const nextTotalPages = Math.max(1, Math.ceil(nextTotal / pageSize));
        setTotalFiltered(nextTotal);
        setTotalPages(nextTotalPages);
        if (page > nextTotalPages) setPage(nextTotalPages);
      }
      setConfirmEmailId("");
      setMessage(result.user.bannedUntil
        ? `${result.user.email} 的邮箱状态已正常，账户仍处于停用状态。`
        : `${result.user.email} 的邮箱状态已正常。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "邮箱确认状态更新失败，原状态未改变。");
    } finally {
      setSavingId("");
    }
  }

  function resetFilters() {
    setQuery("");
    setActivity("all");
    setRole("all");
    setStatus("all");
    setSort("activity_desc");
    setPage(1);
  }

  function selectActivity(nextActivity: AdminUserActivityFilter) {
    setActivity(nextActivity);
    setPage(1);
  }

  const hasFilters = Boolean(query || activity !== "all" || role !== "all" || status !== "all" || sort !== "activity_desc");

  if (state === "loading") {
    return <div className="empty-state"><span className="loading-line">正在汇总全部用户账户</span></div>;
  }

  if (state === "error") {
    return (
      <div className="empty-state">
        <p>{message}</p>
        <Button className="mt-4" onClick={() => setRevision((value) => value + 1)}>重试</Button>
      </div>
    );
  }

  const metricItems = [
    { label: "用户总数", value: metrics.totalUsers, helper: "全部注册账户", activity: "all" as const, icon: UsersRound },
    { label: "最近 24h 活跃", value: metrics.active24h, helper: "按最近登录统计", activity: "24h" as const, icon: Activity },
    { label: "最近 3 日活跃", value: metrics.active3d, helper: "按最近登录统计", activity: "3d" as const, icon: Clock3 },
    { label: "从未登录", value: metrics.neverSignedIn, helper: metrics.disabledUsers ? `另有 ${metrics.disabledUsers} 个停用账户` : "尚无成功登录", activity: "never" as const, icon: UserRound },
  ];

  return (
    <div className="space-y-6">
      <section aria-label="用户概览" className="grid grid-cols-2 border-y border-[color:var(--line-ghost)] lg:grid-cols-4">
        {metricItems.map((item, index) => {
          const Icon = item.icon;
          const active = activity === item.activity;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => selectActivity(item.activity)}
              className={cn(
                "pressable min-w-0 px-3 py-5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--aurora)] sm:px-5",
                index % 2 === 1 ? "border-l border-[color:var(--line-ghost)]" : "",
                index >= 2 ? "border-t border-[color:var(--line-ghost)] lg:border-t-0" : "",
                index === 2 ? "lg:border-l" : "",
                active ? "bg-[color:var(--surface-hover-bg)]" : "hover:bg-[color:var(--surface-hover-bg)]/55",
              )}
              aria-pressed={active}
            >
              <span className="flex items-center gap-2 text-xs text-ink-muted"><Icon aria-hidden="true" className="size-4" />{item.label}</span>
              <strong className="mt-2 block text-3xl font-semibold tracking-[-0.04em] text-ink-primary">{item.value}</strong>
              <span className="mt-1 block truncate text-xs text-ink-muted">{item.helper}</span>
            </button>
          );
        })}
      </section>

      <section aria-label="用户筛选" className="space-y-3 border-b border-[color:var(--line-ghost)] pb-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1.5fr)_repeat(4,minmax(130px,0.6fr))]">
          <label className="relative block">
            <span className="sr-only">搜索用户</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
            <Input
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(1); }}
              placeholder="搜索邮箱、姓名、学校、方向或用户 ID"
              className="pl-9"
            />
          </label>
          <label>
            <span className="sr-only">活跃时间</span>
            <Select value={activity} onChange={(event) => selectActivity(event.target.value as AdminUserActivityFilter)}>
              <option value="all">全部活跃时间</option>
              <option value="24h">最近 24 小时</option>
              <option value="3d">最近 3 日</option>
              <option value="7d">最近 7 日</option>
              <option value="never">从未登录</option>
            </Select>
          </label>
          <label>
            <span className="sr-only">账户身份</span>
            <Select value={role} onChange={(event) => { setRole(event.target.value as AdminUserRoleFilter); setPage(1); }}>
              <option value="all">全部身份</option>
              <option value="user">普通用户</option>
              <option value="admin">管理员</option>
            </Select>
          </label>
          <label>
            <span className="sr-only">账户状态</span>
            <Select value={status} onChange={(event) => { setStatus(event.target.value as AdminUserStatusFilter); setPage(1); }}>
              <option value="all">全部账户状态</option>
              <option value="enabled">可正常登录</option>
              <option value="disabled">已停用</option>
              <option value="unconfirmed">邮箱未确认</option>
            </Select>
          </label>
          <label>
            <span className="sr-only">排序方式</span>
            <Select value={sort} onChange={(event) => { setSort(event.target.value as AdminUserSort); setPage(1); }}>
              <option value="activity_desc">最近活跃优先</option>
              <option value="created_desc">最新注册优先</option>
              <option value="created_asc">最早注册优先</option>
              <option value="email_asc">邮箱名称排序</option>
            </Select>
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink-muted">
          <span>{refreshing ? "正在更新结果…" : `找到 ${totalFiltered} 位用户 · 第 ${page} / ${totalPages} 页`}</span>
          <div className="flex items-center gap-2">
            {hasFilters ? (
              <button type="button" className="text-action h-9 px-2.5 text-sm" onClick={resetFilters}>
                <RotateCcw aria-hidden="true" className="size-4" />重置筛选
              </button>
            ) : null}
            <button type="button" className="text-action h-9 px-2.5 text-sm" onClick={() => setRevision((value) => value + 1)} disabled={refreshing}>
              <RefreshCw aria-hidden="true" className={cn("size-4", refreshing && "animate-spin")} />刷新
            </button>
          </div>
        </div>
      </section>

      {message ? <p className="border-l-2 border-nebula-blue/70 pl-3 text-sm leading-6 text-ink-secondary" role="status">{message}</p> : null}

      {users.length === 0 ? (
        <div className="empty-state">
          <p>没有匹配的用户账户。</p>
          {hasFilters ? <Button variant="secondary" className="mt-4" onClick={resetFilters}>清空筛选</Button> : null}
        </div>
      ) : (
        <div className={cn("divide-y divide-[color:var(--line-ghost)] border-y border-[color:var(--line-ghost)] transition-opacity", refreshing && "opacity-55")} aria-busy={refreshing}>
          {users.map((user) => {
            const draft = drafts[user.id] ?? { displayName: user.displayName, role: user.role };
            const isSelf = user.id === currentUserId;
            const disabled = Boolean(user.bannedUntil);
            const dirty = draft.displayName !== user.displayName || draft.role !== user.role;
            return (
              <article key={user.id} className="grid gap-5 py-6 lg:grid-cols-[minmax(260px,1fr)_minmax(280px,0.8fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {user.role === "admin" ? <Shield aria-hidden="true" className="size-4 text-nebula-blue" /> : <UserRound aria-hidden="true" className="size-4 text-ink-muted" />}
                    <h2 className="truncate text-base font-semibold text-ink-primary">{user.email}</h2>
                    {isSelf ? <span className="text-xs text-[color:var(--aurora)]">当前账号</span> : null}
                    {disabled ? <span className="text-xs text-[#d8a8b7]">已停用</span> : null}
                    {!user.emailConfirmedAt ? <span className="text-xs text-ink-muted">邮箱未确认</span> : null}
                  </div>
                  <p className="mt-2 text-sm text-ink-secondary">{user.school || "学校未填写"} · {user.targetRoles.join("、") || "求职方向未填写"}</p>
                  <p className="mt-2 text-xs text-ink-muted">
                    {user.applicationCount} 条投递 · {user.resumeCount} 份简历 · {formatLastActivity(user.lastSignInAt)}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">注册于 {formatDateTime(user.createdAt)}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
                  <label>
                    <span className="mb-1.5 block text-xs text-ink-muted">显示名</span>
                    <Input disabled={refreshing || savingId === user.id} value={draft.displayName} onChange={(event) => updateDraft(user.id, { displayName: event.target.value })} />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-xs text-ink-muted">账户身份</span>
                    <Select value={draft.role} disabled={isSelf || refreshing || savingId === user.id} onChange={(event) => updateDraft(user.id, { role: event.target.value as ProfileRole })}>
                      <option value="user">普通用户</option>
                      <option value="admin">管理员</option>
                    </Select>
                  </label>
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {!user.emailConfirmedAt ? (
                    <Button
                      variant="secondary"
                      disabled={refreshing || savingId === user.id}
                      onClick={() => requestEmailConfirmation(user)}
                    >
                      <ShieldCheck aria-hidden="true" className="size-4" />
                      {confirmEmailId === user.id ? "确认邮箱" : "设为已确认"}
                    </Button>
                  ) : null}
                  <Button variant="secondary" disabled={!dirty || refreshing || savingId === user.id} onClick={() => requestSaveUser(user)}>
                    <Check aria-hidden="true" className="size-4" />
                    {confirmRoleId === user.id ? "确认身份" : "保存身份"}
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={isSelf || refreshing || savingId === user.id}
                    onClick={() => requestAccountToggle(user)}
                    className={disabled ? "" : "text-[#d8a8b7]"}
                  >
                    {disabled ? <RefreshCw aria-hidden="true" className="size-4" /> : <Ban aria-hidden="true" className="size-4" />}
                    {disabled ? "恢复登录" : confirmDisableId === user.id ? "确认停用" : "停用账户"}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="flex flex-col-reverse items-center justify-between gap-3 sm:flex-row">
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          每页
          <Select
            value={String(pageSize)}
            onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}
            className="h-9 min-w-24"
          >
            <option value="25">25 人</option>
            <option value="50">50 人</option>
            <option value="100">100 人</option>
          </Select>
        </label>
        <div className="flex items-center gap-2">
          <Button variant="secondary" disabled={page === 1 || refreshing} onClick={() => setPage((value) => Math.max(1, value - 1))} aria-label="上一页">
            <ChevronLeft aria-hidden="true" className="size-4" />上一页
          </Button>
          <span className="min-w-20 text-center text-sm text-ink-muted">{page} / {totalPages}</span>
          <Button variant="secondary" disabled={page >= totalPages || refreshing} onClick={() => setPage((value) => value + 1)} aria-label="下一页">
            下一页<ChevronRight aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatLastActivity(value: string | null) {
  if (!value) return "从未登录";
  const elapsed = Date.now() - new Date(value).getTime();
  if (elapsed >= 0 && elapsed < 24 * 60 * 60 * 1000) return `24h 内活跃 · ${formatDateTime(value)}`;
  if (elapsed >= 0 && elapsed < 3 * 24 * 60 * 60 * 1000) return `3 日内活跃 · ${formatDateTime(value)}`;
  return `最近登录 ${formatDateTime(value)}`;
}
