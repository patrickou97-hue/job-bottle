import assert from "node:assert/strict";
import test from "node:test";

const modulePath = "../src/lib/mimo-model." + "ts";
const { CURRENT_MIMO_MODEL, CURRENT_MIMO_PRO_MODEL, resolveMimoModel } = await import(modulePath);

test("MiMo v2.5 Pro configuration is upgraded to the official v2.6 Pro id", () => {
  assert.equal(resolveMimoModel("mimo-v2.5-pro"), CURRENT_MIMO_PRO_MODEL);
  assert.equal(resolveMimoModel(" MIMO-V2.5-PRO "), CURRENT_MIMO_PRO_MODEL);
});

test("MiMo v2.5 base configuration is upgraded to the v2.6 base id", () => {
  assert.equal(resolveMimoModel("mimo-v2.5"), CURRENT_MIMO_MODEL);
  assert.equal(resolveMimoModel(" MIMO-V2.5 "), CURRENT_MIMO_MODEL);
});

test("current and non-Pro model identifiers are preserved", () => {
  assert.equal(resolveMimoModel("mimo-v2.6-pro"), "mimo-v2.6-pro");
  assert.equal(resolveMimoModel("mimo-v2.5-asr"), "mimo-v2.5-asr");
  assert.equal(resolveMimoModel(""), "");
});
