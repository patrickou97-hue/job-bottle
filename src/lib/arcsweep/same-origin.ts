const PRODUCTION_HOSTS = new Set(["starjob.space", "www.starjob.space"]);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Check form submissions against the browser's origin and the request's Host.
 * Next dev can canonicalize localhost/127.0.0.1 in request.url while the
 * browser correctly submits the origin it displayed; accepting the incoming
 * Host alias preserves that legitimate same-origin form without allowing a
 * different site to post across origins.
 */
export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  let requestURL: URL;
  try {
    requestURL = new URL(request.url);
  } catch {
    return false;
  }

  const host = request.headers.get("host")?.trim();
  if (!host || !/^(?:[A-Za-z0-9.-]+|\[[A-Fa-f0-9:]+\])(?::\d{1,5})?$/.test(host)) return false;

  const hostOrigin = `${requestURL.protocol}//${host}`;
  try {
    const originURL = new URL(origin);
    const hostURL = new URL(hostOrigin);
    if (originURL.origin !== origin) return false;

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
    if (localAlias) return true;

    // Vercel serves both the apex and www names for this project. The browser
    // can render the consent page on one alias while the platform forwards the
    // form POST to the other. Accept only this exact HTTPS host pair; arbitrary
    // cross-origin posts and preview domains remain rejected.
    return originURL.protocol === "https:"
      && requestURL.protocol === "https:"
      && hostURL.protocol === "https:"
      && !originURL.port
      && !requestURL.port
      && !hostURL.port
      && PRODUCTION_HOSTS.has(originURL.hostname.toLowerCase())
      && PRODUCTION_HOSTS.has(requestURL.hostname.toLowerCase())
      && PRODUCTION_HOSTS.has(hostURL.hostname.toLowerCase());
  } catch {
    return false;
  }
}
