const APPLICATION_TRACKING_QUERY_KEYS = new Set(["click_id", "clickid", "cid"]);

export function sanitizeApplicationUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return value;
    for (const key of Array.from(url.searchParams.keys())) {
      if (APPLICATION_TRACKING_QUERY_KEYS.has(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }
    return url.toString();
  } catch {
    return value;
  }
}
