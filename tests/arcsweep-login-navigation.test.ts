import assert from "node:assert/strict";
import test from "node:test";

const modulePath = "../src/lib/arcsweep/login-context." + "ts";
const { navigateAfterLogin } = await import(modulePath);

function makeNavigation(calls: string[]) {
  return {
    assign: (path: string) => calls.push("assign:" + path),
    push: (path: string) => calls.push("push:" + path),
    refresh: () => calls.push("refresh"),
  };
}

test("Arc account login performs a document navigation to the preserved authorization request", () => {
  const calls: string[] = [];
  const next = "/api/mac-cleaner/v1/auth/authorize?client_id=arcsweep-macos&state=state-value";

  navigateAfterLogin(next, true, makeNavigation(calls));

  assert.deepEqual(calls, ["assign:" + next]);
});

test("regular login keeps the existing client-side navigation behavior", () => {
  const calls: string[] = [];

  navigateAfterLogin("/applications", false, makeNavigation(calls));

  assert.deepEqual(calls, ["push:/applications", "refresh"]);
});

test("return navigation sanitizes external targets for either login surface", () => {
  const calls: string[] = [];

  navigateAfterLogin("https://attacker.example", true, makeNavigation(calls));

  assert.deepEqual(calls, ["assign:/"]);
});
