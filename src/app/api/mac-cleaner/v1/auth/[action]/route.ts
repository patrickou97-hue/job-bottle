import { createClient } from "@/lib/supabase/server";
import { authenticate, authorizationParams, errorResponse, exchangeOrRefresh, issueCode, jsonResponse, type AuthorizationExchangeStage, type AuthorizationWriteStage } from "@/lib/arcsweep/service";
import { ServiceError } from "@/lib/arcsweep/contract";
import { renderAuthorizationFailurePage, renderAuthorizationPage } from "@/lib/arcsweep/authorization-page";
import { checkSameOriginRequest, sameOriginRequestDiagnostics } from "@/lib/arcsweep/same-origin";
import { randomBytes } from "node:crypto";
export const runtime = "nodejs";
type Context = { params: Promise<{ action: string }> };
const CONSENT_FIELDS = ["client_id", "redirect_uri", "response_type", "code_challenge", "code_challenge_method", "state"] as const;
function authorizationLocale(request: Request): "zh-CN" | "en" {
  const preferred = request.headers.get("accept-language")?.split(",", 1)[0]?.trim().toLowerCase();
  return preferred?.startsWith("en") ? "en" : "zh-CN";
}
function exchangeFailureResponse(error: unknown, stage: AuthorizationExchangeStage) {
  const response = errorResponse(error);
  if (response.status < 500) return response;
  const diagnosticID = randomBytes(4).toString("hex").toUpperCase();
  const code = error instanceof ServiceError ? error.code : "analysis_unavailable";
  console.error("[ArcSweep auth] exchange failed", { diagnosticID, stage, code, status: response.status });
  const headers = new Headers(response.headers);
  headers.set("X-ArcSweep-Diagnostic-ID", diagnosticID);
  return new Response(response.body, { status: response.status, headers });
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
  let action = "";
  let state: string | undefined;
  let exchangeStage: AuthorizationExchangeStage = "read_grant_request";
  let failureStage: "route_dispatch" | "same_origin_check" | "parse_consent" | "read_arc_session" | AuthorizationWriteStage = "route_dispatch";
  let originCheckReason: string | undefined;
  let originDiagnostics: ReturnType<typeof sameOriginRequestDiagnostics> | undefined;
  try {
    action = (await context.params).action;
    if (action === "exchange" || action === "refresh") {
      return jsonResponse(await exchangeOrRefresh(request, action, stage => { exchangeStage = stage; }));
    }
    if (action === "logout") {
      const { db, sessionID } = await authenticate(request); const { error } = await db.from("arcsweep_sessions").delete().eq("id", sessionID);
      if (error) throw new ServiceError(503, "service_unavailable");
      return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
    }
    if (action !== "authorize") throw new ServiceError(404, "not_found");
    failureStage = "same_origin_check";
    const originCheck = checkSameOriginRequest(request);
    originCheckReason = originCheck.reason;
    originDiagnostics = sameOriginRequestDiagnostics(request);
    if (!originCheck.allowed || Number(request.headers.get("content-length") ?? 0) > 8192) throw new ServiceError(403, "forbidden");
    const { boundedText } = await import("@/lib/arcsweep/contract");
    failureStage = "parse_consent";
    const params = new URLSearchParams(await boundedText(request.body, 8192)); const { challenge, state: requestState } = authorizationParams(params);
    state = requestState;
    const decision = params.get("decision");
    if (decision === "deny") {
      const callback = new URL("arcsweep://oauth/callback");
      callback.searchParams.set("error", "access_denied");
      callback.searchParams.set("state", state);
      return Response.redirect(callback.toString(), 303);
    }
    if (decision !== "approve") throw new ServiceError(400, "invalid_request");
    failureStage = "read_arc_session";
    const supabase = await createClient(); const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new ServiceError(401, "authentication_required");
    return Response.redirect(await issueCode(user.id, challenge, requestState, stage => { failureStage = stage; }), 303);
  } catch (error) {
    if (action === "exchange" || action === "refresh") return exchangeFailureResponse(error, exchangeStage);
    if (action !== "authorize") return errorResponse(error);
    const diagnosticID = randomBytes(4).toString("hex").toUpperCase();
    const code = error instanceof ServiceError ? error.code : "service_unavailable";
    const status = error instanceof ServiceError ? error.status : 503;
    // Keep diagnostics useful without writing email, user ID, state, code,
    // callback URL, database error text, or credentials to production logs.
    console.error("[ArcSweep auth] consent failed", {
      diagnosticID,
      stage: failureStage,
      code,
      status,
      ...(failureStage === "same_origin_check" && originCheckReason
        ? { originCheck: originCheckReason, ...(originDiagnostics ?? {}) }
        : {}),
    });
    const response = new Response(renderAuthorizationFailurePage({
      locale: authorizationLocale(request), diagnosticID, errorCode: code, state,
    }), { status, headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-ArcSweep-Diagnostic-ID": diagnosticID,
    } });
    return response;
  }
}
