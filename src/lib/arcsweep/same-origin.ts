const PRODUCTION_HOSTS = new Set(["starjob.space", "www.starjob.space"]);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

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
  const origin = request.headers.get("origin");
  if (!origin) return { allowed: false, reason: "missing_origin" };

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
  try {
    const originURL = new URL(origin);
    const hostURL = new URL(hostOrigin);
    if (originURL.origin !== origin) return { allowed: false, reason: "invalid_origin" };

    // Keep localhost/127.0.0.1 aliases useful in development, but do not let a
    // spoofed Host header make an arbitrary Origin look same-origin.
    const localAlias = originURL.protocol === "http:"
      && requestURL.protocol === "http:"
      && hostURL.protocol === "http:"
      && originURL.port === requestURL.port
      && hostURL.port === requestURL.port
      && LOCAL_HOSTS.has(originURL.hostname.toLowerCase())
      && LOCAL_HOSTS.has(requestURL.hostname.toLowerCase())
      && LOCAL_HOSTS.has(hostURL.hostname.toLowerCase());
    if (localAlias) return { allowed: true, reason: "local_alias" };

    // Vercel serves both the apex and www names for this project. The browser
    // form POST to the other. In serverless handlers request.url may contain an
    // internal deployment hostname, so trust only the browser Origin plus the
    // exact incoming custom Host pair. Never accept a Vercel preview or an
    // arbitrary Host header as a production alias.
    if (originURL.protocol !== "https:" || originURL.port || !PRODUCTION_HOSTS.has(originURL.hostname.toLowerCase())) {
      return { allowed: false, reason: "untrusted_origin" };
    }
    const productionHost = new URL(`https://${host}`);
    if (productionHost.port || !PRODUCTION_HOSTS.has(productionHost.hostname.toLowerCase())) {
      return { allowed: false, reason: "untrusted_host" };
    }
    return { allowed: true, reason: originURL.hostname.toLowerCase() === productionHost.hostname.toLowerCase() ? "same_origin" : "production_alias" };
  } catch {
    return { allowed: false, reason: "invalid_origin" };
  }
}

export function isSameOriginRequest(request: Request): boolean {
  return checkSameOriginRequest(request).allowed;
}
