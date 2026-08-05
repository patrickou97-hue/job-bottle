const APPLICATION_TRACKING_QUERY_KEYS = new Set(["click_id", "clickid", "cid"]);

export function sanitizeApplicationUrl(value: string) {
  try {
    // Excel exports can HTML-escape query separators (for example
    // `?scene=1&amp;click_id=...`). Decode them before removing tracking keys
    // so the same link receives the same deduplication fingerprint.
    const decodedValue = value.replaceAll("&amp;", "&").replaceAll("&#38;", "&");
    const url = new URL(decodedValue);
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
