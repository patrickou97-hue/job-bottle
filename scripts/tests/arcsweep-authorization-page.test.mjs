import test from "node:test";
import assert from "node:assert/strict";
import { renderAuthorizationPage } from "../../src/lib/arcsweep/authorization-page.ts";

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
  assert.match(html, /rui&#64;example\.com|rui@example\.com/);
  assert.match(html, /只为启用云端 AI 复核/);
  assert.match(html, /不会扫描、调用 AI 或上传文件/);
  assert.match(html, /之后每次云端复核都由你主动发起/);
  assert.match(html, /文件内容和完整个人路径留在本机/);
  assert.match(html, /name="decision" value="approve"/);
  assert.match(html, /name="decision" value="deny"/);
  assert.match(html, /name="state" value="sssssssssssssssssssssssssssssssssssssssssss"/);
  assert.match(html, /\/brand\/arcsweep-icon-mark\.png/);
  assert.doesNotMatch(html, /<script\b/i);
});

test("English authorization page is localized and account values are HTML escaped", () => {
  const html = renderAuthorizationPage({ locale: "en", email: '<img src=x onerror="alert(1)">', params });
  assert.match(html, /lang="en"/);
  assert.match(html, /Connecting enables cloud AI review/);
  assert.match(html, /This step will not scan, call AI, or upload files/);
  assert.match(html, /Agree and connect/);
  assert.doesNotMatch(html, /<img src=x onerror=/i);
  assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
});
