const PENDING_DROP_KEY = "job_bottle_pending_drop_ids";

function readPendingDropIds(): string[] {
  try {
    const raw = localStorage.getItem(PENDING_DROP_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export function queueBottleDrop(applicationId: string) {
  try {
    const ids = readPendingDropIds();
    localStorage.setItem(
      PENDING_DROP_KEY,
      JSON.stringify([applicationId, ...ids.filter((id) => id !== applicationId)].slice(0, 12)),
    );
  } catch {
    /* localStorage may be unavailable in private browsing. */
  }
}

export function peekBottleDrop(applicationIds: string[]) {
  try {
    const ids = readPendingDropIds();
    return ids.find((id) => applicationIds.includes(id)) ?? null;
  } catch {
    return null;
  }
}

export function dismissBottleDrop(applicationId: string) {
  try {
    const ids = readPendingDropIds();
    localStorage.setItem(
      PENDING_DROP_KEY,
      JSON.stringify(ids.filter((id) => id !== applicationId)),
    );
  } catch {
    /* localStorage may be unavailable in private browsing. */
  }
}
