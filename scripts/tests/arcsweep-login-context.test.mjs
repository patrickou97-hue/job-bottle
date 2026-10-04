import test from "node:test";
import assert from "node:assert/strict";
import { isArcSweepAuthorizationReturn, safeLocalReturnPath } from "../../src/lib/arcsweep/login-context.ts";

const validReturn = "/api/mac-cleaner/v1/auth/authorize?client_id=arcsweep-macos&redirect_uri=arcsweep%3A%2F%2Foauth%2Fcallback&response_type=code&code_challenge="
  + "c".repeat(43)
  + "&code_challenge_method=S256&state="
  + "s".repeat(43);

test("recognizes a same-site ArcSweep PKCE authorization return for login context", () => {
  assert.equal(isArcSweepAuthorizationReturn(validReturn), true);
});

test("does not show ArcSweep context for other, malformed, or external return paths", () => {
  assert.equal(isArcSweepAuthorizationReturn(null), false);
  assert.equal(isArcSweepAuthorizationReturn("/login"), false);
  assert.equal(isArcSweepAuthorizationReturn("//outside.example/api/mac-cleaner/v1/auth/authorize"), false);
  assert.equal(isArcSweepAuthorizationReturn("https://outside.example/api/mac-cleaner/v1/auth/authorize"), false);
  assert.equal(isArcSweepAuthorizationReturn(validReturn.replace("response_type=code", "response_type=token")), false);
});

test("login return navigation preserves the nested PKCE path and rejects external or ambiguous paths", () => {
  assert.equal(safeLocalReturnPath(validReturn), validReturn);
  assert.equal(safeLocalReturnPath("/resume/download?token=local"), "/resume/download?token=local");

  for (const unsafe of [
    null,
    "https://outside.example/path",
    "//outside.example/path",
    "/\\\\outside.example/path",
    "/%2f%2foutside.example/path",
    "/%5c%5coutside.example/path",
    "/path\nLocation: https://outside.example",
  ]) {
    assert.equal(safeLocalReturnPath(unsafe), "/", `expected ${String(unsafe)} to fail closed`);
  }
});
