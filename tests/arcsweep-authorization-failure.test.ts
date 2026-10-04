import assert from "node:assert/strict";
import test from "node:test";

const modulePath = "../src/lib/arcsweep/authorization-page." + "ts";
const { renderAuthorizationFailurePage } = await import(modulePath);

test("authorization failure page gives a safe callback and diagnostic reference", () => {
  const html = renderAuthorizationFailurePage({
    locale: "zh-CN",
    diagnosticID: "AB12CD34",
    errorCode: "service_unavailable",
    state: "a".repeat(43),
  });

  assert.match(html, /暂时无法完成 Arc 账号连接/);
  assert.match(html, /诊断编号<code>AB12CD34<\/code>/);
  assert.match(html, /arcsweep:\/\/oauth\/callback\?error=temporarily_unavailable&amp;state=/);
  assert.match(html, /本机扫描和文件未受影响/);
  assert.doesNotMatch(html, /MIMO_API_KEY|SUPABASE_SERVICE_ROLE_KEY|Bearer /);
});

test("authorization failure page escapes untrusted state and only links validated state", () => {
  const html = renderAuthorizationFailurePage({
    locale: "en",
    diagnosticID: "<script>",
    errorCode: "service_unavailable",
    state: "bad&state",
  });

  assert.match(html, /ArcSweep connection could not be completed/);
  assert.match(html, /UNKNOWN/);
  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /href="arcsweep:/);
  assert.match(html, /You can close this page and return to ArcSweep/);
});

test("expired browser sessions return a login-required callback instead of a server error", () => {
  const html = renderAuthorizationFailurePage({
    locale: "zh-CN",
    diagnosticID: "AB12CD34",
    errorCode: "authentication_required",
    state: "a".repeat(43),
  });

  assert.match(html, /登录状态已失效/);
  assert.match(html, /error=login_required/);
});
