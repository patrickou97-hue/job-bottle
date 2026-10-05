const PRODUCTION_HOSTS = new Set(["starjob.space", "www.starjob.space"]);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const PRODUCTION_HOST = /^(starjob\.space|www\.starjob\.space)(?::443)?$/i;

export type SameOriginCheck = { allowed: true; reason: "same_origin" | "local_alias" | "production_alias" }
  | { allowed: false; reason: "missing_origin" | "invalid_request_url" | "invalid_host" | "invalid_origin" | "insecure_request" | "untrusted_host" | "untrusted_origin" };

export type SameOriginRequestDiagnostics = {
  originForm: "missing" | "opaque" | "malformed" | "trusted_https_root" | "trusted_https_non_root" | "trusted_https_non_default_port" | "trusted_http" | "untrusted_host" | "other_origin";
  requestURLProtocol: "http" | "https" | "other" | "invalid";
  forwardedProtocol: "http" | "https" | "missing" | "other";
  requestHost: "missing" | "trusted_production" | "other" | "invalid";
};

/** Return only coarse, non-sensitive header classifications for server logs. */
export function sameOriginRequestDiagnostics(request: Request): SameOriginRequestDiagnostics {
  const rawOrigin = request.headers.get("origin")?.trim();
  let originForm: SameOriginRequestDiagnostics["originForm"] = "missing";
  if (rawOrigin === "null") {
    originForm = "opaque";
  } else if (rawOrigin) {
    try {
      const originURL = new URL(rawOrigin);
      const isProductionHost = PRODUCTION_HOSTS.has(originURL.hostname.toLowerCase());
      if (!isProductionHost) originForm = "untrusted_host";
      else if (originURL.protocol !== "https:") originForm = "trusted_http";
      else if (originURL.username || originURL.password || originURL.search || originURL.hash) originForm = "other_origin";
      else if (originURL.port) originForm = "trusted_https_non_default_port";
      else if (originURL.pathname !== "/") originForm = "trusted_https_non_root";
      else originForm = "trusted_https_root";
    } catch {
      originForm = "malformed";
    }
  }

  let requestURLProtocol: SameOriginRequestDiagnostics["requestURLProtocol"] = "invalid";
  try {
    const protocol = new URL(request.url).protocol;
    requestURLProtocol = protocol === "http:" ? "http" : protocol === "https:" ? "https" : "other";
  } catch { /* retain the invalid classification */ }

  const rawForwardedProtocol = request.headers.get("x-forwarded-proto")?.trim().toLowerCase();
  const forwardedProtocol: SameOriginRequestDiagnostics["forwardedProtocol"] = rawForwardedProtocol === "https"
    ? "https"
    : rawForwardedProtocol === "http" ? "http" : rawForwardedProtocol ? "other" : "missing";

  const rawHost = request.headers.get("host")?.trim();
  const requestHost: SameOriginRequestDiagnostics["requestHost"] = !rawHost
    ? "missing"
    : !/^(?:[A-Za-z0-9.-]+|\[[A-Fa-f0-9:]+\])(?::\d{1,5})?$/.test(rawHost)
      ? "invalid"
      : PRODUCTION_HOST.test(rawHost) ? "trusted_production" : "other";

  return { originForm, requestURLProtocol, forwardedProtocol, requestHost };
}

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
  // Validate the browser Origin independently from that proxy URL. URL parsing
  // canonicalizes host casing and the default :443 port; require the origin to
  // be HTTPS, allowlisted, credential-free, and contain no path beyond `/`.
  if (!originURL
    || originURL.protocol !== "https:"
    || !PRODUCTION_HOSTS.has(originURL.hostname.toLowerCase())
    || originURL.username
    || originURL.password
    || originURL.pathname !== "/"
    || originURL.search
    || originURL.hash
    || originURL.port) return { allowed: false, reason: "untrusted_origin" };
  const hostMatch = PRODUCTION_HOST.exec(host);
  if (!hostMatch) return { allowed: false, reason: "untrusted_host" };
  const forwardedProto = request.headers.get("x-forwarded-proto")?.trim().toLowerCase();
  const requestIsHTTPS = forwardedProto ? forwardedProto === "https" : requestURL.protocol === "https:";
  if (!requestIsHTTPS) return { allowed: false, reason: "insecure_request" };
  const originHost = originURL.hostname.toLowerCase();
  const requestHost = hostMatch[1].toLowerCase();
  if (!PRODUCTION_HOSTS.has(originHost) || !PRODUCTION_HOSTS.has(requestHost)) return { allowed: false, reason: "untrusted_host" };
  return { allowed: true, reason: originHost === requestHost ? "same_origin" : "production_alias" };
}

export function isSameOriginRequest(request: Request): boolean {
  return checkSameOriginRequest(request).allowed;
}
