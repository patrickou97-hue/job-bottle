"use client";

import { useSyncExternalStore } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { VIP_STATUS_EVENT, type VipStatus } from "@/lib/starjob-vip";

type Snapshot = { status: VipStatus | null; error: boolean };
const initial: Snapshot = { status: null, error: false };
const freshFor = 120_000;
const listeners = new Set<() => void>();
let snapshot = initial;
let validUntil = 0;
let pending: AbortController | null = null;
let watching = false;
let account: string | null | undefined;
let liveReaders = 0;
let timer: number | undefined;

function publish(next: Snapshot) {
  snapshot = next;
  for (const notify of listeners) notify();
}

async function readStatus() {
  if (!listeners.size || pending || Date.now() < validUntil) return;
  const controller = new AbortController();
  pending = controller;
  const timeout = window.setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch("/api/vip", { cache: "no-store", signal: controller.signal });
    if (!response.ok) throw new Error("VIP_STATUS_UNAVAILABLE");
    const status: VipStatus = await response.json();
    if (pending !== controller) return;
    validUntil = Date.now() + freshFor;
    publish({ status, error: false });
  } catch {
    if (pending !== controller) return;
    validUntil = Date.now() + 5_000;
    publish({ status: snapshot.status, error: true });
  } finally {
    window.clearTimeout(timeout);
    if (pending === controller) pending = null;
  }
}

function invalidate(clearAccount = false) {
  pending?.abort();
  pending = null;
  validUntil = 0;
  if (clearAccount) publish(initial);
  void readStatus();
}

function refreshVisible() {
  if (!document.hidden) void readStatus();
}

// Keep the identity listener across route changes, even while there are no VIP consumers.
function watchBrowser() {
  if (watching) return;
  watching = true;
  window.addEventListener(VIP_STATUS_EVENT, () => invalidate());
  window.addEventListener("storage", event => {
    if (event.key === VIP_STATUS_EVENT) invalidate();
  });
  window.addEventListener("focus", refreshVisible);
  window.addEventListener("pageshow", refreshVisible);
  document.addEventListener("visibilitychange", refreshVisible);
  if (isSupabaseConfigured()) {
    createClient().auth.onAuthStateChange((event, session) => {
      const next = session?.user.id ?? null;
      const changed = next !== account && (account !== undefined || event !== "INITIAL_SESSION");
      account = next;
      if (changed) invalidate(true);
    });
  }
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  watchBrowser();
  void readStatus();
  return () => { listeners.delete(notify); };
}

function subscribeLive(notify: () => void) {
  const unsubscribe = subscribe(notify);
  if (++liveReaders === 1) {
    timer = window.setInterval(() => {
      if (snapshot.status?.signedIn || snapshot.error) refreshVisible();
    }, freshFor);
  }
  return () => {
    unsubscribe();
    if (--liveReaders === 0) window.clearInterval(timer);
  };
}

export function refreshVipStatus() {
  window.dispatchEvent(new Event(VIP_STATUS_EVENT));
  try { localStorage.setItem(VIP_STATUS_EVENT, crypto.randomUUID()); } catch { /* Storage can be unavailable. */ }
}

const getSnapshot = () => snapshot;
const getServerSnapshot = () => initial;

export function useVipStatus(autoRefresh = false) {
  return useSyncExternalStore(autoRefresh ? subscribeLive : subscribe, getSnapshot, getServerSnapshot);
}
