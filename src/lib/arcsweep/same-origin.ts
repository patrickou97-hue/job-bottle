const PRODUCTION_HOSTS = new Set(["starjob.space", "www.starjob.space"]);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const PRODUCTION_ORIGIN = /^https:\/\/(starjob\.space|www\.starjob\.space)(?::443)?\/?$/i;
const PRODUCTION_HOST = /^(starjob\.space|www\.starjob\.space)(?::443)?$/i;

export type SameOriginCheck = { allowed: true; reason: "same_origin" | "local_alias" | "production_alias" }
  | { allowed: false; reason: "missing_origin" | "invalid_request_url" | "invalid_host" | "invalid_origin" | "untrusted_host" | "untrusted_origin" };

/**
 * Check form submissions against the browser's origin and the request's Host.
 * Next dev can canonicalize localhost/127.0.0.1 in request.url while the
 * browser correctly submits the origin it displayed; accepting the incoming
 * Host alias preserves that legitimate same-origin form without allowing a
 * different site to post across origins.
 */
export function checkSameOriginRequest(request: Request): SameOriginCheck {
  const rawOrigin = request.headers.get("origin");
  if (!rawOrigin) return { allowed: false, reason: "missing_origin" };
  const origin = rawOrigin.trim();

  let requestURL: URL;
  try {
    requestURL = new URL(request.url);
  } catch {
    return { allowed: false, reason: "invalid_request_url" };
  }

  const host = request.headers.get("host")?.trim();
  if (!host || !/^(?:[A-Za-z0-9.-]+|\[[A-Fa-f0-9:]+\])(?::\d{1,5})?$/.test(host)) {
    return { allowed: false, reason: "invalid_host" };
  }

  const hostOrigin = `${requestURL.protocol}//${host}`;
  let originURL: URL | undefined;
  let hostURL: URL | undefined;
  try { originURL = new URL(origin); } catch { /* production uses a strict allowlist below */ }
  try { hostURL = new URL(hostOrigin); } catch { /* production uses a strict allowlist below */ }

  // Keep localhost/127.0.0.1 aliases useful in development, but do not let a
  // spoofed Host header make an arbitrary Origin look same-origin.
  const localAlias = originURL?.protocol === "http:"
    && requestURL.protocol === "http:"
    && hostURL?.protocol === "http:"
    && originURL.port === requestURL.port
    && hostURL.port === requestURL.port
    && LOCAL_HOSTS.has(originURL.hostname.toLowerCase())
    && LOCAL_HOSTS.has(requestURL.hostname.toLowerCase())
    && LOCAL_HOSTS.has(hostURL.hostname.toLowerCase());
  if (localAlias) return { allowed: true, reason: "local_alias" };

  // Vercel may expose a deployment URL while forwarding the custom Host.
  // Avoid parsing Origin through that proxy URL: accept only the two explicit
  // HTTPS production origins, and only when the incoming Host is also one of
  // those exact domains. Optional slash/default :443 are equivalent forms.
  const originMatch = PRODUCTION_ORIGIN.exec(origin);
  if (!originMatch || requestURL.protocol !== "https:") return { allowed: false, reason: "untrusted_origin" };
  const hostMatch = PRODUCTION_HOST.exec(host);
  if (!hostMatch) return { allowed: false, reason: "untrusted_host" };
  const originHost = originMatch[1].toLowerCase();
  const requestHost = hostMatch[1].toLowerCase();
  if (!PRODUCTION_HOSTS.has(originHost) || !PRODUCTION_HOSTS.has(requestHost)) return { allowed: false, reason: "untrusted_host" };
  return { allowed: true, reason: originHost === requestHost ? "same_origin" : "production_alias" };
}

export function isSameOriginRequest(request: Request): boolean {
  return checkSameOriginRequest(request).allowed;
}
