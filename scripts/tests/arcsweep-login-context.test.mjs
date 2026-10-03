import test from "node:test";
import assert from "node:assert/strict";
import { isArcSweepAuthorizationReturn } from "../../src/lib/arcsweep/login-context.ts";

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
