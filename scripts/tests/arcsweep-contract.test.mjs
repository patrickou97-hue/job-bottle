import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { adviceRequestSchema, validateAdvice, boundedText } from "../../src/lib/arcsweep/contract.ts";
import { resolveMimoEndpoint } from "../../src/lib/arcsweep/mimo-endpoint.ts";
import { checkSameOriginRequest, isSameOriginRequest, sameOriginRequestDiagnostics } from "../../src/lib/arcsweep/same-origin.ts";
const id = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const request = () => ({ schema_version: 1, request_id: "req_" + "a".repeat(32), run_id: "synthetic-run", rules_version: "1", scope: { kind: "group_review", mode: "local_plus_uncertain", group_count: 1 }, groups: [{ group_id: id, display_name: "Example cache", category: "app_cache", bundle_id: "com.example.test", root_path_summary: "…/Caches", file_count: 3, total_bytes: 1024, local_rule_id: "verified-cache", local_risk: "Low", ownership_evidence: [] }] });
const advice = () => ({ advice: [{ group_id: id, decision: "KEEP", confidence: 0.8, explanation: "归属不明确，建议保留。", reason_codes: ["uncertain_owner"], concerns: [], appears_regeneratable: null }] });
test("ArcSweep accepts only the fixed metadata upload surface", () => {
  assert.equal(adviceRequestSchema.safeParse(request()).success, true);
  assert.equal(adviceRequestSchema.safeParse({ ...request(), contents: "private file" }).success, false);
  for (const text of ["/Users/alice/Documents/private.txt", "alice@example.com", "Bearer private-token", "/Volumes/Backup/private.txt", "~/Documents/private.txt", "api_key=123456789abcdef"]) {
    const input = request(); input.groups[0].display_name = text;
    assert.equal(adviceRequestSchema.safeParse(input).success, false);
  }
});
test("group count, identifiers and enums are checked before provider work", () => {
  const input = request(); input.groups.push(input.groups[0]); input.scope.group_count = 2;
  assert.equal(adviceRequestSchema.safeParse(input).success, false);
  assert.equal(adviceRequestSchema.safeParse({ ...request(), scope: { ...request().scope, group_count: 2 } }).success, false);
});
test("advice must cover the exact groups without gaining deletion authority", () => {
  const parsed = adviceRequestSchema.parse(request());
  assert.equal(validateAdvice(advice(), parsed)[0].source, "backend-ai");
  assert.throws(() => validateAdvice({ advice: [] }, parsed));
  assert.throws(() => validateAdvice({ advice: [advice().advice[0], advice().advice[0]] }, parsed));
  assert.throws(() => validateAdvice({ advice: [{ ...advice().advice[0], group_id: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb" }] }, parsed));
  assert.throws(() => validateAdvice({ advice: [{ ...advice().advice[0], delete_path: "/file" }] }, parsed));
  assert.throws(() => validateAdvice({ advice: [{ ...advice().advice[0], confidence: Infinity }] }, parsed));
});
test("body limits apply to streamed data, not only Content-Length", async () => {
  const make = () => new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode("0123456789")); controller.close(); } });
  await assert.rejects(() => boundedText(make(), 9), /body_too_large/);
  assert.equal(await boundedText(make(), 10), "0123456789");
});
test("ArcSweep service migration keeps database access server-only", () => {
  const migration = readFileSync(fileURLToPath(new URL("../../supabase/migrations/20261002011729_arcsweep_service.sql", import.meta.url)), "utf8");
  for (const table of ["arcsweep_auth_codes", "arcsweep_sessions", "arcsweep_budgets", "arcsweep_requests"]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(migration, /revoke all on public\.arcsweep_auth_codes,[\s\S]*?from anon, authenticated/);
  assert.match(migration, /to service_role/);
  assert.equal((migration.match(/security invoker set search_path = ''/g) ?? []).length, 4);
  assert.match(migration, /arcsweep_auth_codes_user_created_idx/);
  assert.match(migration, /arcsweep_sessions_user_id_idx/);
});
test("Arc account membership shares Auth identity but stays isolated behind service role", () => {
  const migration = readFileSync(fileURLToPath(new URL("../../supabase/migrations/20261004033312_arc_accounts.sql", import.meta.url)), "utf8");
  assert.match(migration, /create table public\.arc_accounts/);
  assert.match(migration, /references auth\.users\(id\) on delete cascade/);
  assert.match(migration, /alter table public\.arc_accounts enable row level security/);
  assert.match(migration, /revoke all on public\.arc_accounts from public, anon, authenticated/);
  assert.match(migration, /grant all on public\.arc_accounts to service_role/);
  const service = readFileSync(fileURLToPath(new URL("../../src/lib/arcsweep/service.ts", import.meta.url)), "utf8");
  assert.match(service, /from\("arc_accounts"\)\.upsert/);
  assert.match(service, /Joining the Arc product namespace happens only after explicit consent/);
  const profileMigration = readFileSync(fileURLToPath(new URL("../../supabase/migrations/20261004033715_arc_signup_profile_isolation.sql", import.meta.url)), "utf8");
  assert.match(profileMigration, /raw_user_meta_data->>'account_surface' = 'arc'/);
  assert.match(profileMigration, /return new;/);
});
test("Arc account consent and code exchange failures expose only safe diagnostic stages", () => {
  const route = readFileSync(fileURLToPath(new URL("../../src/app/api/mac-cleaner/v1/auth/[action]/route.ts", import.meta.url)), "utf8");
  assert.match(route, /"Referrer-Policy": "strict-origin"/);
  assert.match(route, /renderAuthorizationSuccessPage/);
  assert.match(route, /"Referrer-Policy": "no-referrer"/);
  assert.match(route, /const callbackURL = await issueCode/);
  assert.doesNotMatch(route, /Response\.redirect\(await issueCode/);
  assert.match(route, /originCheck: originCheckReason/);
  assert.match(route, /sameOriginRequestDiagnostics\(request\)/);
  assert.match(route, /exchange failed", \{ diagnosticID, stage, code, status: response\.status \}/);
  assert.match(route, /action === "exchange" \|\| action === "refresh"/);
  assert.match(route, /X-ArcSweep-Diagnostic-ID/);
  assert.doesNotMatch(route, /console\.error\([^\n]*(?:email|user\.id|state|token|response\.url)/i);

  const service = readFileSync(fileURLToPath(new URL("../../src/lib/arcsweep/service.ts", import.meta.url)), "utf8");
  for (const stage of ["arc_account_membership", "retire_previous_codes", "insert_authorization_code", "redeem_authorization_code"]) {
    assert.match(service, new RegExp(`onStage\\?\\.\\("${stage}"\\)`));
  }
  assert.match(service, /if \(!key \|\| !base\) throw new ServiceError\(503, "mimo_not_configured"\)/);
  assert.match(service, /if \(!endpoint\) throw new ServiceError\(503, "mimo_not_configured"\)/);
});
test("MiMo API credentials can only be sent to the fixed provider endpoint", () => {
  assert.equal(resolveMimoEndpoint("https://token-plan-cn.xiaomimimo.com/v1")?.href,
    "https://token-plan-cn.xiaomimimo.com/v1/chat/completions");
  assert.equal(resolveMimoEndpoint("https://token-plan-cn.xiaomimimo.com/v1/chat/completions")?.pathname,
    "/v1/chat/completions");
  for (const base of [
    "http://token-plan-cn.xiaomimimo.com/v1",
    "https://attacker.example/v1",
    "https://token-plan-cn.xiaomimimo.com.attacker.example/v1",
    "https://user@token-plan-cn.xiaomimimo.com/v1",
    "https://token-plan-cn.xiaomimimo.com/v1?key=secret",
    "https://token-plan-cn.xiaomimimo.com/v2",
  ]) assert.equal(resolveMimoEndpoint(base), null);
});
test("authorization forms accept the displayed same-origin host alias and reject cross-site posts", () => {
  assert.equal(isSameOriginRequest(new Request("http://localhost:3000/authorize", {
    headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" },
  })), true);
  assert.equal(isSameOriginRequest(new Request("https://www.starjob.space/authorize", {
    headers: { host: "www.starjob.space", origin: "https://www.starjob.space" },
  })), true);
  assert.equal(isSameOriginRequest(new Request("https://www.starjob.space/authorize", {
    headers: { host: "www.starjob.space", origin: "https://www.starjob.space/" },
  })), true);
  assert.equal(isSameOriginRequest(new Request("https://www.starjob.space/authorize", {
    headers: { host: "www.starjob.space", origin: "https://www.starjob.space:443/" },
  })), true);
  assert.equal(isSameOriginRequest(new Request("https://www.starjob.space/authorize", {
    headers: { host: "www.starjob.space", origin: "https://starjob.space" },
  })), true);
  assert.equal(isSameOriginRequest(new Request("https://starjob.space/authorize", {
    headers: { host: "starjob.space", origin: "https://www.starjob.space" },
  })), true);
  assert.deepEqual(checkSameOriginRequest(new Request("https://job-bottle-preview.vercel.app/authorize", {
    headers: { host: "www.starjob.space", origin: "https://starjob.space" },
  })), { allowed: true, reason: "production_alias" });
  assert.deepEqual(checkSameOriginRequest(new Request("http://job-bottle-preview.vercel.app/authorize", {
    headers: {
      host: "www.starjob.space",
      origin: "https://www.starjob.space",
      "x-forwarded-proto": "https",
    },
  })), { allowed: true, reason: "same_origin" });
  assert.deepEqual(checkSameOriginRequest(new Request("http://job-bottle-preview.vercel.app/authorize", {
    headers: {
      host: "www.starjob.space",
      origin: "https://www.starjob.space:443/",
      "x-forwarded-proto": "https",
    },
  })), { allowed: true, reason: "same_origin" });
  assert.deepEqual(checkSameOriginRequest(new Request("https://www.starjob.space/authorize", {
    headers: {
      host: "www.starjob.space",
      origin: "https://www.starjob.space",
      "x-forwarded-proto": "http",
    },
  })), { allowed: false, reason: "insecure_request" });
  assert.deepEqual(checkSameOriginRequest(new Request("http://job-bottle-preview.vercel.app/authorize", {
    headers: {
      host: "www.starjob.space",
      origin: "https://www.starjob.space",
      "x-forwarded-proto": "http",
    },
  })), { allowed: false, reason: "insecure_request" });
  assert.equal(isSameOriginRequest(new Request("https://www.starjob.space/authorize", {
    headers: { host: "www.starjob.space", origin: "https://attacker.example" },
  })), false);
  assert.equal(isSameOriginRequest(new Request("https://www.starjob.space/authorize", {
    headers: { host: "www.starjob.space", origin: "https://evil.starjob.space" },
  })), false);
  assert.equal(isSameOriginRequest(new Request("https://www.starjob.space/authorize", {
    headers: { host: "www.starjob.space", origin: "https://www.starjob.space/untrusted-path" },
  })), false);
  assert.equal(isSameOriginRequest(new Request("https://www.starjob.space/authorize", {
    headers: { host: "attacker.example", origin: "https://attacker.example" },
  })), false);
  assert.equal(isSameOriginRequest(new Request("http://www.starjob.space/authorize", {
    headers: { host: "www.starjob.space", origin: "http://starjob.space" },
  })), false);
  assert.deepEqual(checkSameOriginRequest(new Request("https://www.starjob.space/authorize", {
    headers: { host: "www.starjob.space" },
  })), { allowed: false, reason: "missing_origin" });
  assert.equal(isSameOriginRequest(new Request("https://www.starjob.space/authorize", {
    headers: { host: "attacker.example#fragment", origin: "https://attacker.example" },
  })), false);
  assert.equal(isSameOriginRequest(new Request("https://www.starjob.space/authorize", {
    headers: { host: "www.starjob.space" },
  })), false);
});
test("same-origin failure diagnostics classify headers without exposing their values", () => {
  const diagnostics = sameOriginRequestDiagnostics(new Request("http://job-bottle-preview.vercel.app/authorize", {
    headers: {
      host: "www.starjob.space",
      origin: "https://www.starjob.space/private?token=never-log-this",
      "x-forwarded-proto": "https",
    },
  }));
  assert.deepEqual(diagnostics, {
    originForm: "other_origin",
    requestURLProtocol: "http",
    forwardedProtocol: "https",
    requestHost: "trusted_production",
  });
  assert.equal(JSON.stringify(diagnostics).includes("never-log-this"), false);
});
