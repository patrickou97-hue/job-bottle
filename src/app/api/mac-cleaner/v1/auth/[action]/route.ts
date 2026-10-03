import { createClient } from "@/lib/supabase/server";
import { authenticate, authorizationParams, errorResponse, exchangeOrRefresh, issueCode, jsonResponse } from "@/lib/arcsweep/service";
import { ServiceError } from "@/lib/arcsweep/contract";
import { renderAuthorizationPage } from "@/lib/arcsweep/authorization-page";
import { isSameOriginRequest } from "@/lib/arcsweep/same-origin";
export const runtime = "nodejs";
type Context = { params: Promise<{ action: string }> };
const CONSENT_FIELDS = ["client_id", "redirect_uri", "response_type", "code_challenge", "code_challenge_method", "state"] as const;
function authorizationLocale(request: Request): "zh-CN" | "en" {
  const preferred = request.headers.get("accept-language")?.split(",", 1)[0]?.trim().toLowerCase();
  return preferred?.startsWith("en") ? "en" : "zh-CN";
}
export async function GET(request: Request, context: Context) {
  try {
    if ((await context.params).action !== "authorize") throw new ServiceError(404, "not_found");
    const url = new URL(request.url); authorizationParams(url.searchParams);
    const supabase = await createClient(); const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      const login = new URL("/login", url.origin);
      login.searchParams.set("reason", "arcsweep-connect");
      login.searchParams.set("next", url.pathname + url.search);
      return Response.redirect(login, 303);
    }
    const params = Object.fromEntries(CONSENT_FIELDS.map(name => [name, url.searchParams.get(name) ?? ""]));
    return new Response(renderAuthorizationPage({
      locale: authorizationLocale(request),
      email: user.email ?? null,
      params,
    }), { headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request, context: Context) {
  try {
    const { action } = await context.params;
    if (action === "exchange" || action === "refresh") return jsonResponse(await exchangeOrRefresh(request, action));
    if (action === "logout") {
      const { db, sessionID } = await authenticate(request); const { error } = await db.from("arcsweep_sessions").delete().eq("id", sessionID);
      if (error) throw new ServiceError(503, "service_unavailable");
      return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
    }
    if (action !== "authorize") throw new ServiceError(404, "not_found");
    if (!isSameOriginRequest(request) || Number(request.headers.get("content-length") ?? 0) > 8192) throw new ServiceError(403, "forbidden");
    const { boundedText } = await import("@/lib/arcsweep/contract");
    const params = new URLSearchParams(await boundedText(request.body, 8192)); const { challenge, state } = authorizationParams(params);
    const decision = params.get("decision");
    if (decision === "deny") {
      const callback = new URL("arcsweep://oauth/callback");
      callback.searchParams.set("error", "access_denied");
      callback.searchParams.set("state", state);
      return Response.redirect(callback.toString(), 303);
    }
    if (decision !== "approve") throw new ServiceError(400, "invalid_request");
    const supabase = await createClient(); const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new ServiceError(401, "authentication_required");
    return Response.redirect(await issueCode(user.id, challenge, state), 303);
  } catch (error) { return errorResponse(error); }
}
