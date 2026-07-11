"use client";

import { useEffect, useMemo, useState } from "react";
import { Ban, Check, ChevronLeft, ChevronRight, RefreshCw, Search, Shield, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  fetchAdminUsers,
  updateAdminUser,
  type AdminUserSummary,
} from "@/lib/admin-users";
import type { ProfileRole } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

type Draft = { displayName: string; role: ProfileRole };

export function AdminUsersClient() {
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [savingId, setSavingId] = useState("");
  const [confirmDisableId, setConfirmDisableId] = useState("");
  const [confirmRoleId, setConfirmRoleId] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setState("loading");
      setMessage("");
      void fetchAdminUsers(page)
        .then((result) => {
          if (cancelled) return;
          setUsers(result.users);
          setCurrentUserId(result.currentUserId);
          setHasMore(result.hasMore);
          setDrafts(Object.fromEntries(result.users.map((user) => [user.id, {
            displayName: user.displayName,
            role: user.role,
          }])));
          setState("ready");
        })
        .catch((error) => {
          if (cancelled) return;
          setState("error");
          setMessage(error instanceof Error ? error.message : "用户列表读取失败，请稍后重试。");
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [page, revision]);

  const visibleUsers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((user) => [user.email, user.displayName, user.school, ...user.targetRoles]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(needle)));
  }, [query, users]);

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
      setUsers((current) => current.map((item) => item.id === user.id ? result.user : item));
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

  if (state === "loading") {
    return <div className="empty-state"><span className="loading-line">正在读取用户账户</span></div>;
  }

  if (state === "error") {
    return (
      <div className="empty-state">
        <p>{message}</p>
        <Button className="mt-4" onClick={() => setRevision((value) => value + 1)}>重试</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-y border-white/[0.1] py-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full max-w-md">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索邮箱、姓名、学校或方向" className="pl-9" />
        </label>
        <span className="text-sm text-ink-muted">本页 {visibleUsers.length} / {users.length} 位用户</span>
      </div>

      {message ? <p className="border-l-2 border-nebula-blue/70 pl-3 text-sm leading-6 text-ink-secondary" role="status">{message}</p> : null}

      {visibleUsers.length === 0 ? (
        <div className="empty-state">没有匹配的用户账户。</div>
      ) : (
        <div className="divide-y divide-white/[0.1] border-y border-white/[0.1]">
          {visibleUsers.map((user) => {
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
                    {isSelf ? <span className="text-xs text-nebula-silver">当前账号</span> : null}
                    {disabled ? <span className="text-xs text-[#d8a8b7]">已停用</span> : null}
                    {!user.emailConfirmedAt ? <span className="text-xs text-ink-muted">邮箱未确认</span> : null}
                  </div>
                  <p className="mt-2 text-sm text-ink-secondary">{user.school || "学校未填写"} · {user.targetRoles.join("、") || "求职方向未填写"}</p>
                  <p className="mt-2 text-xs text-ink-muted">
                    {user.applicationCount} 条投递 · {user.resumeCount} 份简历 · 最近登录 {user.lastSignInAt ? formatDateTime(user.lastSignInAt) : "暂无"}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">注册于 {formatDateTime(user.createdAt)}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
                  <label>
                    <span className="mb-1.5 block text-xs text-ink-muted">显示名</span>
                    <Input value={draft.displayName} onChange={(event) => updateDraft(user.id, { displayName: event.target.value })} />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-xs text-ink-muted">账户身份</span>
                    <Select value={draft.role} disabled={isSelf} onChange={(event) => updateDraft(user.id, { role: event.target.value as ProfileRole })}>
                      <option value="user">普通用户</option>
                      <option value="admin">管理员</option>
                    </Select>
                  </label>
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Button variant="secondary" disabled={!dirty || savingId === user.id} onClick={() => requestSaveUser(user)}>
                    <Check aria-hidden="true" className="size-4" />
                    {confirmRoleId === user.id ? "确认身份" : "保存身份"}
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={isSelf || savingId === user.id}
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

      <div className="flex items-center justify-end gap-2">
        <Button variant="secondary" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} aria-label="上一页">
          <ChevronLeft aria-hidden="true" className="size-4" />
        </Button>
        <span className="min-w-16 text-center text-sm text-ink-muted">第 {page} 页</span>
        <Button variant="secondary" disabled={!hasMore} onClick={() => setPage((value) => value + 1)} aria-label="下一页">
          <ChevronRight aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </div>
  );
}
