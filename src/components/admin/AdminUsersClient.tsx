"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  Activity,
  Ban,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
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
  updateStarInterviewAccess,
  type AdminUserActivityFilter,
  type AdminUserMetrics,
  type AdminUserRoleFilter,
  type AdminUserSort,
  type AdminUserStarInterviewFilter,
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
  starInterviewUnlimitedUsers: 0,
};

export function AdminUsersClient() {
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [metrics, setMetrics] = useState<AdminUserMetrics>(EMPTY_METRICS);
  const [currentUserId, setCurrentUserId] = useState("");
  const [canManageStarInterviewAccess, setCanManageStarInterviewAccess] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalFiltered, setTotalFiltered] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState("");
  const [activity, setActivity] = useState<AdminUserActivityFilter>("all");
  const [role, setRole] = useState<AdminUserRoleFilter>("all");
  const [status, setStatus] = useState<AdminUserStatusFilter>("all");
  const [starInterviewAccess, setStarInterviewAccess] = useState<AdminUserStarInterviewFilter>("all");
  const [sort, setSort] = useState<AdminUserSort>("activity_desc");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [savingId, setSavingId] = useState("");
  const [confirmDisableId, setConfirmDisableId] = useState("");
  const [confirmEmailId, setConfirmEmailId] = useState("");
  const [confirmRoleId, setConfirmRoleId] = useState("");
  const [confirmAccessId, setConfirmAccessId] = useState("");
  const [expandedId, setExpandedId] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (hasLoadedRef.current) setRefreshing(true);
      else setState("loading");
      setMessage("");
      void fetchAdminUsers({ page, pageSize, query, activity, role, status, starInterviewAccess, sort })
        .then((result) => {
          if (cancelled) return;
          setUsers(result.users);
          setMetrics(result.metrics);
          setCurrentUserId(result.currentUserId);
          setCanManageStarInterviewAccess(result.canManageStarInterviewAccess);
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
  }, [activity, page, pageSize, query, revision, role, sort, starInterviewAccess, status]);

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
    if (user.accountType === "wechat" || user.emailConfirmedAt) return;
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

  async function requestStarInterviewAccessToggle(user: AdminUserSummary) {
    if (!canManageStarInterviewAccess) return;
    if (confirmAccessId !== user.id) {
      setConfirmAccessId(user.id);
      setMessage(
        `再次点击将${user.starInterviewUnlimitedAccess ? "关闭" : "开启"} ${user.email} 的 StarInterview 无限访问。`,
      );
      return;
    }
    setSavingId(user.id);
    setMessage("");
    try {
      const result = await updateStarInterviewAccess(user.id, !user.starInterviewUnlimitedAccess);
      setUsers((current) => current
        .map((item) => item.id === user.id ? {
          ...item,
          starInterviewUnlimitedAccess: result.starInterviewUnlimitedAccess,
          starInterviewAccessSource: result.starInterviewAccessSource,
        } : item)
        .filter((item) => (
          starInterviewAccess === "all"
          || (starInterviewAccess === "unlimited" && item.starInterviewUnlimitedAccess)
          || (starInterviewAccess === "standard" && !item.starInterviewUnlimitedAccess)
        )));
      setMetrics((current) => ({
        ...current,
        starInterviewUnlimitedUsers: Math.max(
          0,
          current.starInterviewUnlimitedUsers + (result.starInterviewUnlimitedAccess ? 1 : -1),
        ),
      }));
      if (starInterviewAccess !== "all") {
        const nextTotal = Math.max(0, totalFiltered - 1);
        const nextTotalPages = Math.max(1, Math.ceil(nextTotal / pageSize));
        setTotalFiltered(nextTotal);
        setTotalPages(nextTotalPages);
        if (page > nextTotalPages) setPage(nextTotalPages);
      }
      setConfirmAccessId("");
      setMessage(
        `${user.email} 已${result.starInterviewUnlimitedAccess ? "开启" : "关闭"} StarInterview 无限访问。`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "StarInterview 访问权限更新失败，原设置未改变。");
    } finally {
      setSavingId("");
    }
  }

  function resetFilters() {
    setQuery("");
    setActivity("all");
    setRole("all");
    setStatus("all");
    setStarInterviewAccess("all");
    setSort("activity_desc");
    setPage(1);
  }

  function selectActivity(nextActivity: AdminUserActivityFilter) {
    setActivity(nextActivity);
    setPage(1);
  }

  const hasFilters = Boolean(
    query
    || activity !== "all"
    || role !== "all"
    || status !== "all"
    || starInterviewAccess !== "all"
    || sort !== "activity_desc",
  );

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
    { label: "全部用户", value: metrics.totalUsers, helper: "注册账户", activity: "all" as const, icon: UsersRound },
    { label: "24h 活跃", value: metrics.active24h, helper: "最近登录", activity: "24h" as const, icon: Activity },
    { label: "3 日活跃", value: metrics.active3d, helper: "最近登录", activity: "3d" as const, icon: Clock3 },
    { label: "从未登录", value: metrics.neverSignedIn, helper: metrics.disabledUsers ? `${metrics.disabledUsers} 个已停用` : "尚无成功登录", activity: "never" as const, icon: UserRound },
  ];

  return (
    <div className="space-y-5">
      <section aria-label="用户概览" className="grid gap-px overflow-hidden rounded-xl border border-[color:var(--line-ghost)] bg-[color:var(--line-ghost)] sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_minmax(210px,1.2fr)]">
        {metricItems.map((item) => {
          const Icon = item.icon;
          const active = activity === item.activity;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => selectActivity(item.activity)}
              className={cn(
                "pressable min-w-0 bg-[color:var(--background)] px-4 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--aurora)]",
                active ? "bg-[color:var(--surface-hover-bg)]" : "hover:bg-[color:var(--surface-hover-bg)]/55",
              )}
              aria-pressed={active}
            >
              <span className="flex items-center gap-2 text-xs font-medium text-ink-muted"><Icon aria-hidden="true" className="size-4" />{item.label}</span>
              <strong className="mt-2 block text-2xl font-semibold tabular-nums tracking-[-0.04em] text-ink-primary">{item.value}</strong>
              <span className="mt-1 block truncate text-xs text-ink-muted">{item.helper}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            setStarInterviewAccess(starInterviewAccess === "unlimited" ? "all" : "unlimited");
            setPage(1);
          }}
          className={cn(
            "pressable min-w-0 bg-[color:var(--background)] px-4 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--aurora)] sm:col-span-2 xl:col-span-1",
            starInterviewAccess === "unlimited" ? "bg-[color:var(--surface-hover-bg)]" : "hover:bg-[color:var(--surface-hover-bg)]/55",
          )}
          aria-pressed={starInterviewAccess === "unlimited"}
        >
          <span className="flex items-center gap-2 text-xs font-medium text-ink-muted"><Sparkles aria-hidden="true" className="size-4 text-nebula-blue" />StarInterview 无限访问</span>
          <strong className="mt-2 block text-2xl font-semibold tabular-nums tracking-[-0.04em] text-ink-primary">{metrics.starInterviewUnlimitedUsers}</strong>
          <span className="mt-1 block text-xs text-ink-muted">点击查看已授权用户</span>
        </button>
      </section>

      <section aria-label="用户筛选" className="rounded-xl border border-[color:var(--line-ghost)] bg-[color:var(--surface-subtle-bg)]/35 p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-ink-primary">筛选用户</h2>
            <p className="mt-1 text-xs text-ink-muted">多个条件会同时生效</p>
          </div>
          {hasFilters ? (
            <button type="button" className="text-action h-9 px-2.5 text-sm" onClick={resetFilters}>
              <RotateCcw aria-hidden="true" className="size-4" />清空
            </button>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
          <label className="relative block sm:col-span-2 xl:col-span-2">
            <span className="mb-1.5 block text-xs font-medium text-ink-muted">关键词</span>
            <Search aria-hidden="true" className="pointer-events-none absolute bottom-3.5 left-3 size-4 text-ink-muted" />
            <Input
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(1); }}
              placeholder="邮箱、姓名、学校、方向或 ID"
              className="pl-9"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-medium text-ink-muted">最近活跃</span>
            <Select value={activity} onChange={(event) => selectActivity(event.target.value as AdminUserActivityFilter)}>
              <option value="all">不限</option>
              <option value="24h">最近 24 小时</option>
              <option value="3d">最近 3 日</option>
              <option value="7d">最近 7 日</option>
              <option value="never">从未登录</option>
            </Select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-medium text-ink-muted">账户身份</span>
            <Select value={role} onChange={(event) => { setRole(event.target.value as AdminUserRoleFilter); setPage(1); }}>
              <option value="all">不限</option>
              <option value="user">普通用户</option>
              <option value="admin">管理员</option>
            </Select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-medium text-ink-muted">登录状态</span>
            <Select value={status} onChange={(event) => { setStatus(event.target.value as AdminUserStatusFilter); setPage(1); }}>
              <option value="all">不限</option>
              <option value="enabled">可正常登录</option>
              <option value="disabled">已停用</option>
              <option value="unconfirmed">邮箱未确认</option>
            </Select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-medium text-ink-muted">StarInterview</span>
            <Select
              value={starInterviewAccess}
              onChange={(event) => {
                setStarInterviewAccess(event.target.value as AdminUserStarInterviewFilter);
                setPage(1);
              }}
            >
              <option value="all">不限</option>
              <option value="unlimited">无限访问</option>
              <option value="standard">标准访问</option>
            </Select>
          </label>
          <label className="sm:col-span-2 xl:col-span-1">
            <span className="mb-1.5 block text-xs font-medium text-ink-muted">排序</span>
            <Select value={sort} onChange={(event) => { setSort(event.target.value as AdminUserSort); setPage(1); }}>
              <option value="activity_desc">最近活跃优先</option>
              <option value="created_desc">最新注册优先</option>
              <option value="created_asc">最早注册优先</option>
              <option value="email_asc">邮箱名称排序</option>
            </Select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--line-ghost)] pt-4 text-sm text-ink-muted">
          <span>{refreshing ? "正在更新结果…" : `${totalFiltered} 位用户 · 第 ${page} / ${totalPages} 页`}</span>
          <button type="button" className="text-action h-9 px-2.5 text-sm" onClick={() => setRevision((value) => value + 1)} disabled={refreshing}>
            <RefreshCw aria-hidden="true" className={cn("size-4", refreshing && "animate-spin")} />刷新数据
          </button>
        </div>
      </section>

      {message ? <p className="border-l-2 border-nebula-blue/70 pl-3 text-sm leading-6 text-ink-secondary" role="status">{message}</p> : null}

      {users.length === 0 ? (
        <div className="empty-state">
          <p>没有匹配的用户账户。</p>
          {hasFilters ? <Button variant="secondary" className="mt-4" onClick={resetFilters}>清空筛选</Button> : null}
        </div>
      ) : (
        <section className={cn("overflow-hidden rounded-xl border border-[color:var(--line-ghost)] transition-opacity", refreshing && "opacity-55")} aria-label="用户列表" aria-busy={refreshing}>
          <div className="hidden grid-cols-[minmax(240px,1.35fr)_minmax(150px,0.6fr)_minmax(190px,0.75fr)_44px] gap-5 border-b border-[color:var(--line-ghost)] bg-[color:var(--surface-subtle-bg)]/45 px-5 py-3 text-xs font-medium text-ink-muted lg:grid">
            <span>用户</span><span>使用情况</span><span>账户与权限</span><span className="sr-only">展开</span>
          </div>
          {users.map((user) => {
            const draft = drafts[user.id] ?? { displayName: user.displayName, role: user.role };
            const isSelf = user.id === currentUserId;
            const disabled = Boolean(user.bannedUntil);
            const dirty = draft.displayName !== user.displayName || draft.role !== user.role;
            const expanded = expandedId === user.id;
            return (
              <article key={user.id} className="border-b border-[color:var(--line-ghost)] last:border-b-0">
                <button type="button" onClick={() => setExpandedId(expanded ? "" : user.id)} className="grid w-full gap-4 px-4 py-4 text-left transition-colors hover:bg-[color:var(--surface-hover-bg)]/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--aurora)] sm:px-5 lg:grid-cols-[minmax(240px,1.35fr)_minmax(150px,0.6fr)_minmax(190px,0.75fr)_44px] lg:items-center lg:gap-5" aria-expanded={expanded}>
                  <span className="min-w-0">
                    <span className="flex min-w-0 items-center gap-2">
                      {user.role === "admin" ? <Shield aria-hidden="true" className="size-4 shrink-0 text-nebula-blue" /> : <UserRound aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />}
                      <strong className="truncate text-sm font-semibold text-ink-primary">{user.email}</strong>
                      {isSelf ? <span className="shrink-0 text-xs text-[color:var(--aurora)]">当前账号</span> : null}
                    </span>
                    <span className="mt-1.5 block truncate text-xs text-ink-muted">{user.displayName} · {user.school || "学校未填写"} · {user.targetRoles.join("、") || "方向未填写"}</span>
                  </span>
                  <span className="text-xs leading-5 text-ink-secondary">
                    <span className="block">{user.applicationCount} 条投递 · {user.resumeCount} 份简历</span>
                    <span className="block text-ink-muted">{formatLastActivity(user.lastSignInAt)}</span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    <StatusTag tone={user.role === "admin" ? "blue" : "neutral"}>{user.role === "admin" ? "管理员" : "普通用户"}</StatusTag>
                    <StatusTag tone={user.starInterviewUnlimitedAccess ? "gold" : "neutral"}>{user.starInterviewUnlimitedAccess ? "StarInterview 无限" : "标准访问"}</StatusTag>
                    {disabled ? <StatusTag tone="danger">已停用</StatusTag> : null}
                    {user.accountType !== "wechat" && !user.emailConfirmedAt ? <StatusTag tone="neutral">邮箱未确认</StatusTag> : null}
                  </span>
                  <ChevronDown aria-hidden="true" className={cn("hidden size-4 justify-self-end text-ink-muted transition-transform lg:block", expanded && "rotate-180")} />
                </button>

                {expanded ? (
                  <div className="border-t border-[color:var(--line-ghost)] bg-[color:var(--surface-subtle-bg)]/25 px-4 py-5 sm:px-5">
                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(310px,0.65fr)]">
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">账户资料</h3>
                        <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
                          <label><span className="mb-1.5 block text-xs text-ink-muted">显示名</span><Input disabled={refreshing || savingId === user.id} value={draft.displayName} onChange={(event) => updateDraft(user.id, { displayName: event.target.value })} /></label>
                          <label><span className="mb-1.5 block text-xs text-ink-muted">账户身份</span><Select value={draft.role} disabled={isSelf || refreshing || savingId === user.id} onChange={(event) => updateDraft(user.id, { role: event.target.value as ProfileRole })}><option value="user">普通用户</option><option value="admin">管理员</option></Select></label>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button variant="secondary" disabled={!dirty || refreshing || savingId === user.id} onClick={() => requestSaveUser(user)}><Check aria-hidden="true" className="size-4" />{confirmRoleId === user.id ? "确认身份变更" : "保存资料与身份"}</Button>
                          {user.accountType !== "wechat" && !user.emailConfirmedAt ? <Button variant="secondary" disabled={refreshing || savingId === user.id} onClick={() => requestEmailConfirmation(user)}><ShieldCheck aria-hidden="true" className="size-4" />{confirmEmailId === user.id ? "确认邮箱" : "设为已确认"}</Button> : null}
                          <Button variant={disabled ? "secondary" : "danger"} disabled={isSelf || refreshing || savingId === user.id} onClick={() => requestAccountToggle(user)}>{disabled ? <RefreshCw aria-hidden="true" className="size-4" /> : <Ban aria-hidden="true" className="size-4" />}{disabled ? "恢复登录" : confirmDisableId === user.id ? "确认停用账户" : "停用账户"}</Button>
                        </div>
                      </div>

                      <div className="border-t border-[color:var(--line-ghost)] pt-5 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
                        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted"><Sparkles aria-hidden="true" className="size-4" />StarInterview 访问</h3>
                        <div className="mt-3 flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-ink-primary">{user.starInterviewUnlimitedAccess ? "无限访问" : "标准访问"}</p>
                            <p className="mt-1 text-xs leading-5 text-ink-muted">{user.starInterviewAccessSource === "admin_default" ? "管理员初始权限，尚未单独调整" : user.starInterviewAccessSource === "explicit" ? "已由主管理员单独设置" : "普通用户默认状态"}</p>
                          </div>
                          <button type="button" role="switch" aria-checked={user.starInterviewUnlimitedAccess} aria-label={`调整 ${user.email} 的 StarInterview 无限访问`} disabled={!canManageStarInterviewAccess || refreshing || savingId === user.id} onClick={() => void requestStarInterviewAccessToggle(user)} className={cn("relative h-7 w-12 shrink-0 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--aurora)] disabled:cursor-not-allowed disabled:opacity-45", user.starInterviewUnlimitedAccess ? "border-nebula-blue/70 bg-nebula-blue/75" : "border-[color:var(--line)] bg-[color:var(--surface-hover-bg)]")}>
                            <span className={cn("absolute left-0 top-1 size-[18px] rounded-full bg-white shadow-sm transition-transform", user.starInterviewUnlimitedAccess ? "translate-x-6" : "translate-x-1")} />
                          </button>
                        </div>
                        {!canManageStarInterviewAccess ? <p className="mt-3 text-xs leading-5 text-ink-muted">只有主管理员可以调整此权限。</p> : confirmAccessId === user.id ? <p className="mt-3 text-xs leading-5 text-[#d8a8b7]">再次点击开关以确认变更。</p> : null}
                      </div>
                    </div>
                    <details className="mt-5 border-t border-[color:var(--line-ghost)] pt-4 text-xs text-ink-muted">
                      <summary className="cursor-pointer select-none font-medium text-ink-secondary">技术信息</summary>
                      <div className="mt-3 space-y-1 font-mono text-[11px] leading-5"><p className="break-all">用户 ID：{user.id}</p>{user.wechatIdentityId ? <p className="break-all">微信身份 ID：{user.wechatIdentityId}</p> : null}<p>登录方式：{formatAccountType(user.accountType)}</p><p>注册时间：{formatDateTime(user.createdAt)}</p></div>
                    </details>
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>
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

function formatAccountType(value: AdminUserSummary["accountType"]) {
  if (value === "wechat") return "仅微信登录";
  if (value === "linked") return "邮箱与微信已绑定";
  return "仅邮箱登录";
}

function StatusTag({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "neutral" | "blue" | "gold" | "danger";
}) {
  return (
    <span className={cn(
      "inline-flex h-6 items-center whitespace-nowrap rounded-md border px-2 text-[11px] font-medium",
      tone === "neutral" && "border-[color:var(--line-ghost)] text-ink-muted",
      tone === "blue" && "border-nebula-blue/35 bg-nebula-blue/10 text-nebula-blue",
      tone === "gold" && "border-aurum/30 bg-aurum/10 text-ink-primary",
      tone === "danger" && "border-[#a66f81]/35 bg-[#a66f81]/10 text-[#d8a8b7]",
    )}>
      {children}
    </span>
  );
}
