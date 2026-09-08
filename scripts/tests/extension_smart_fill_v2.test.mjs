import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeOutcomeCompleteness,
  extractPartialOutcomeRows,
  introducedUnsupportedNumbers,
  normalizeModelOutcomeCandidate,
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

test("截断 JSON 会保留已经闭合的字段结果", () => {
  const rows = extractPartialOutcomeRows('{"outcomes":[{"fieldKey":"f0","value":"A"},{"fieldKey":"f1","value":"B"},{"fieldKey":"f2","value":"未闭合"');
  assert.deepEqual(rows, [
    { fieldKey: "f0", value: "A" },
    { fieldKey: "f1", value: "B" },
  ]);
});

test("常见模型格式偏差会在安全校验前被规范化", () => {
  assert.deepEqual(normalizeModelOutcomeCandidate({
    field_key: "field_2",
    status: "filled",
    action: "input",
    value: 2026,
    confidence: "86%",
    evidence: "resume.content.work[0].company",
    basis: "resume_fact",
  }), {
    field_key: "field_2",
    fieldKey: "f2",
    status: "answered",
    action: "fill",
    value: "2026",
    confidence: 0.86,
    evidence: ["work[0].company"],
    basis: "exact_fact",
  });
  assert.deepEqual(normalizeModelOutcomeCandidate({ fieldKey: 3, status: "manual_review", value: "不要写入" }), {
    fieldKey: "f3",
    status: "manual",
    action: "manual",
    value: null,
  });
  assert.deepEqual(normalizeModelOutcomeCandidate({
    fieldKey: "F4",
    basis: "generated",
    value: "有事实依据的回答",
    source: { type: "unexpected", path: "content.projects[0].bullets[0]" },
  }), {
    fieldKey: "f4",
    basis: "grounded_generation",
    confidence: 0.72,
    value: "有事实依据的回答",
    source: { type: "resume", path: "projects[0].bullets[0]" },
    evidence: ["projects[0].bullets[0]"],
  });
});

test("生成答案允许改写，但拒绝证据中不存在的新数字", () => {
  const evidence = ["负责 3 个渠道的周度分析", "转化率从 12.5% 提升至 15%"];
  assert.equal(introducedUnsupportedNumbers("我持续分析 3 个渠道，并推动转化率提升至 15%。", evidence), false);
  assert.equal(introducedUnsupportedNumbers("我管理 8 人团队，并推动转化率提升至 30%。", evidence), true);
});
