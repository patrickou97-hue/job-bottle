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

  if (origin === requestURL.origin) return true;
  const host = request.headers.get("host")?.trim();
  if (!host || !/^(?:[A-Za-z0-9.-]+|\[[A-Fa-f0-9:]+\])(?::\d{1,5})?$/.test(host)) return false;

  const hostOrigin = `${requestURL.protocol}//${host}`;
  try {
    return new URL(origin).origin === origin && new URL(hostOrigin).origin === origin;
  } catch {
    return false;
  }
}
