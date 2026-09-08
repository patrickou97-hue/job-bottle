import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeOutcomeCompleteness,
  introducedUnsupportedNumbers,
  splitRepairKeys,
} from "../../src/lib/extension-smart-fill-v2.ts";

test("Smart Fill V2 把遗漏、重复和未知字段视为不完整", () => {
  const report = analyzeOutcomeCompleteness(
    ["f0", "f1", "f2"],
    [{ fieldKey: "f0" }, { fieldKey: "f0" }, { fieldKey: "f2" }, { fieldKey: "extra" }],
  );
  assert.equal(report.complete, false);
  assert.deepEqual(report.missingKeys, ["f1"]);
  assert.deepEqual(report.duplicateKeys, ["f0"]);
  assert.deepEqual(report.unexpectedKeys, ["extra"]);
});

test("截断或无效 JSON 的修复批次会缩小，普通遗漏只补缺失字段", () => {
  assert.deepEqual(splitRepairKeys(["f0", "f1", "f2", "f3"], "truncated"), [["f0", "f1"], ["f2", "f3"]]);
  assert.deepEqual(splitRepairKeys(["f3", "f8"], "invalid_json"), [["f3"], ["f8"]]);
  assert.deepEqual(splitRepairKeys(["f8"], "ok"), [["f8"]]);
});

test("生成答案允许改写，但拒绝证据中不存在的新数字", () => {
  const evidence = ["负责 3 个渠道的周度分析", "转化率从 12.5% 提升至 15%"];
  assert.equal(introducedUnsupportedNumbers("我持续分析 3 个渠道，并推动转化率提升至 15%。", evidence), false);
  assert.equal(introducedUnsupportedNumbers("我管理 8 人团队，并推动转化率提升至 30%。", evidence), true);
});
