import test from "node:test";
import assert from "node:assert/strict";
import { renderAuthorizationFailurePage, renderAuthorizationPage, renderAuthorizationSuccessPage } from "../../src/lib/arcsweep/authorization-page.ts";

const params = {
  client_id: "arcsweep-macos",
  redirect_uri: "arcsweep://oauth/callback",
  response_type: "code",
  code_challenge: "c".repeat(43),
  code_challenge_method: "S256",
  state: "s".repeat(43),
};

test("Chinese authorization page explains the actual opt-in boundary and provides approve and cancel actions", () => {
  const html = renderAuthorizationPage({ locale: "zh-CN", email: "rui@example.com", params });
  assert.match(html, /lang="zh-CN"/);
  assert.match(html, /ArcSweep · Arc 账号/);
  assert.match(html, /连接你的 Arc 账号/);
  assert.doesNotMatch(html, /拾星|StarJob/i);
  assert.match(html, /rui&#64;example\.com|rui@example\.com/);
  assert.match(html, /只为启用云端 AI 复核/);
  assert.match(html, /不会扫描、调用 AI 或上传文件/);
  assert.match(html, /之后每次云端复核都由你主动发起/);
  assert.match(html, /文件内容和完整个人路径留在本机/);
  assert.match(html, /name="decision" value="approve"/);
  assert.match(html, /name="decision" value="deny"/);
  assert.match(html, /class="skip-link" href="#main-content">跳转到主要内容/);
  assert.match(html, /<main id="main-content">/);
  assert.match(html, /aria-label="确认 ArcSweep 账号连接"/);
  assert.match(html, /text-wrap:balance/);
  assert.match(html, /name="state" value="sssssssssssssssssssssssssssssssssssssssssss"/);
  assert.match(html, /\/brand\/arcsweep-icon-mark\.png/);
  assert.doesNotMatch(html, /<script\b/i);
});

test("English authorization page is localized and account values are HTML escaped", () => {
  const html = renderAuthorizationPage({ locale: "en", email: '<img src=x onerror="alert(1)">', params });
  assert.match(html, /lang="en"/);
  assert.match(html, /ArcSweep · Arc Account/);
  assert.match(html, /your Arc account/i);
  assert.doesNotMatch(html, /StarJob/i);
  assert.match(html, /Connecting enables cloud AI review/);
  assert.match(html, /This step will not scan, call AI, or upload files/);
  assert.match(html, /Agree and connect/);
  assert.match(html, /class="skip-link" href="#main-content">Skip to main content/);
  assert.doesNotMatch(html, /<img src=x onerror=/i);
  assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
});

test("temporary consent failure returns its bounded diagnostic reference to ArcSweep", () => {
  const html = renderAuthorizationFailurePage({
    locale: "zh-CN",
    diagnosticID: "A1B2C3D4",
    errorCode: "service_unavailable",
    state: "s".repeat(43),
  });
  assert.match(html, /诊断编号|Support reference/);
  assert.match(html, /href="arcsweep:\/\/oauth\/callback\?error=temporarily_unavailable&amp;state=s{43}&amp;diagnostic_id=A1B2C3D4"/);

  const invalid = renderAuthorizationFailurePage({
    locale: "en",
    diagnosticID: "unsafe-text",
    errorCode: "service_unavailable",
    state: "s".repeat(43),
  });
  assert.doesNotMatch(invalid, /diagnostic_id=/);
});

test("authorization success waits for an explicit Safari app-open link and keeps callback data scoped", () => {
  const callbackURL = `arcsweep://oauth/callback?code=${"c".repeat(43)}&state=${"s".repeat(43)}`;
  const html = renderAuthorizationSuccessPage({ locale: "zh-CN", callbackURL });
  assert.match(html, /lang="zh-CN"/);
  assert.match(html, /授权已确认/);
  assert.match(html, /如果 Safari 询问是否打开应用，请允许/);
  assert.match(html, /href="arcsweep:\/\/oauth\/callback\?code=c{43}&amp;state=s{43}"/);
  assert.match(html, /rel="noreferrer"/);
  assert.match(html, /name="referrer" content="no-referrer"/);
  assert.doesNotMatch(html, /<script\b/i);

  for (const invalid of [
    "https://attacker.example/callback?code=" + "c".repeat(43) + "&state=" + "s".repeat(43),
    "arcsweep://attacker/callback?code=" + "c".repeat(43) + "&state=" + "s".repeat(43),
    "arcsweep://oauth/callback?code=short&state=" + "s".repeat(43),
    "arcsweep://oauth/callback?code=" + "c".repeat(43) + "&state=" + "s".repeat(43) + "&next=https://attacker.example",
  ]) assert.throws(() => renderAuthorizationSuccessPage({ locale: "en", callbackURL: invalid }));
});
