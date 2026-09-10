import assert from "node:assert/strict";
import test from "node:test";

import {
  getAutofillRecordRoot,
  hasAutofillRecordNarrativeAnchor,
  isAutofillFieldValueSemanticallyCompatible,
  isAutofillRecordNarrativeMappingCompatible,
  isAutofillUrlLike,
} from "../../src/lib/extension-autofill-field-compat.ts";

const compatible = (value, deterministicKey, descriptor = "", hasDatePart = false) => (
  isAutofillFieldValueSemanticallyCompatible({ value, deterministicKey, descriptor, hasDatePart })
);

test("结构化字段拒绝跨类型值", () => {
  assert.equal(compatible("2027-08", "education.school", "学校名称"), false);
  assert.equal(compatible("2027.08", "education.school", "学校名称 起止时间 2027 秋招"), false);
  assert.equal(compatible("西南财经大学", "education.school", "学校名称"), true);
  assert.equal(compatible("京东集团", "work.startDate", "开始时间"), false);
  assert.equal(compatible("2026-05", "work.startDate", "开始时间"), true);
  assert.equal(compatible("京东集团", "work.company", "公司类型"), false);
  assert.equal(compatible("京东集团", "work.company", "公司名称"), true);
});

test("作品链接只接受链接，不接受课程或技能列表", () => {
  assert.equal(compatible("计量经济学；Stata；SQL；Java", "basics.website", "作品链接"), false);
  assert.equal(compatible("portfolio.example.com", "basics.website", "作品链接"), true);
  assert.equal(isAutofillUrlLike("https://github.com/example/project"), true);
});

test("手机号与邮箱保留格式边界", () => {
  assert.equal(compatible("+86 18523103352", "basics.phone", "手机号"), true);
  assert.equal(compatible("18523103352", "basics.phone", "国家/地区 +86"), false);
  assert.equal(compatible("西南财经大学", "basics.phone", "手机号"), false);
  assert.equal(compatible("ray@example.com", "basics.email", "邮箱"), true);
  assert.equal(compatible("2027-08", "basics.email", "邮箱"), false);
});

test("重复经历叙述只接受同一条记录的证据和内容锚点", () => {
  const ciccFacts = ["参与债券募集说明书与受托管理事务报告撰写，使用 Wind 完成区域债券市场分析"];
  const jdDescription = "围绕 GMV、LTV 和优惠券渠道评估业务增长，并使用 SQL 清洗用户数据";
  const ciccDescription = "使用 Wind 分析区域债券市场，并参与债券募集说明书和受托管理事务报告撰写";

  assert.equal(getAutofillRecordRoot("work[1].bullets[0]"), "work[1]");
  assert.equal(hasAutofillRecordNarrativeAnchor(ciccDescription, ciccFacts), true);
  assert.equal(hasAutofillRecordNarrativeAnchor(jdDescription, ciccFacts), false);
  assert.equal(isAutofillRecordNarrativeMappingCompatible({
    deterministicKey: "work.description",
    resumePath: "work[1].description",
    evidence: ["work[0].bullets[0]"],
    value: jdDescription,
    scopedFacts: ciccFacts,
  }), false);
  assert.equal(isAutofillRecordNarrativeMappingCompatible({
    deterministicKey: "work.description",
    resumePath: "work[1].description",
    evidence: ["work[1].bullets[0]"],
    value: ciccDescription,
    scopedFacts: ciccFacts,
  }), true);
});
