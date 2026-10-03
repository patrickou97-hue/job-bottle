/**
 * Resolve the fixed MiMo Token Plan endpoint. The API key is sent only to the
 * configured provider host; a malformed environment value must not redirect it
 * to an arbitrary HTTPS server.
 */
export function resolveMimoEndpoint(base: string): URL | null {
  let endpoint: URL;
  try {
    endpoint = new URL(base);
  } catch {
    return null;
  }

  if (endpoint.protocol !== "https:"
    || endpoint.hostname !== "token-plan-cn.xiaomimimo.com"
    || endpoint.username !== ""
    || endpoint.password !== ""
    || endpoint.port !== ""
    || endpoint.search !== ""
    || endpoint.hash !== "") {
    return null;
  }

  const path = endpoint.pathname.replace(/\/+$/, "");
  if (path === "/v1") {
    endpoint.pathname = "/v1/chat/completions";
    return endpoint;
  }
  if (path === "/v1/chat/completions") return endpoint;
  return null;
}
