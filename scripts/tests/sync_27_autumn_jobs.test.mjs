import assert from "node:assert/strict";
import test from "node:test";
import {
  build27AutumnJobCandidates,
  deterministicSourceUuid,
  getJobMergeFingerprint,
  is27AutumnBatch,
  planJobChanges,
  sanitizeApplicationUrl,
} from "../lib/job-sync-utils.mjs";

const schema = {
  company: { k1: { k9: {} }, k30: "公司名称", k31: 1 },
  date: { k1: { k9: {} }, k30: "开启时间", k31: 1 },
  industry: {
    k9: { k3: [{ k1: "tech", k2: "科技" }] },
    k30: "所在行业",
    k31: 9,
  },
  batch: {
    k17: {
      k3: [
        { k1: "b27", k2: "27秋招正式批" },
        { k1: "b26", k2: "26秋招正式批" },
      ],
    },
    k30: "类型",
    k31: 17,
  },
  titles: {
    k9: { k3: [{ k1: "software", k2: "软件研发类" }] },
    k30: "招聘岗位",
    k31: 9,
  },
  locations: { k1: { k9: {} }, k30: "工作地点（超过8个城市标注为全国", k31: 1 },
  url: { k1: { k9: {} }, k30: "投递链接", k31: 1 },
  notes1: { k1: { k9: {} }, k30: "备注1", k31: 1 },
  notes2: { k1: { k9: {} }, k30: "备注2", k31: 1 },
};

function text(value, url) {
  return { k1: [{ k1: url ? "url" : "text", k2: value, ...(url ? { k3: url } : {}) }] };
}

function record(batchOption = "b27") {
  return {
    k1: {
      company: text("星辰科技"),
      date: text("8.5"),
      industry: { k9: ["tech"] },
      batch: { k17: [batchOption] },
      titles: { k9: ["software"] },
      locations: text("上海"),
      url: text("投递", "https://example.com/apply?click_id=abc"),
      notes1: text("网申"),
    },
  };
}

test("27秋招批次允许，26秋招批次拒绝", () => {
  assert.equal(is27AutumnBatch("27秋招正式批"), true);
  assert.equal(is27AutumnBatch("27秋招提前批"), true);
  assert.equal(is27AutumnBatch("26秋招正式批"), false);
});

test("解析时只生成27秋招候选并报告26秋招记录", () => {
  const result = build27AutumnJobCandidates({
    schema,
    records: new Map([
      ["r27", record("b27")],
      ["r26", record("b26")],
    ]),
  });
  assert.equal(result.candidates.length, 1);
  assert.equal(result.wrongSeasonRows.length, 1);
  assert.equal(result.candidates[0].payload.batch_type, "27秋招正式批");
  assert.equal(result.candidates[0].payload.apply_url, "https://example.com/apply");
});

test("腾讯记录ID映射为稳定UUID", () => {
  const first = deterministicSourceUuid("doc:tab:record");
  assert.equal(first, deterministicSourceUuid("doc:tab:record"));
  assert.match(first, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("历史手工导入的业务指纹会被跳过", () => {
  const candidate = build27AutumnJobCandidates({
    schema,
    records: new Map([["r27", record("b27")]]),
  }).candidates[0];
  const existing = { ...candidate.payload, id: "11111111-1111-4111-8111-111111111111" };
  const plan = planJobChanges([candidate], [existing]);
  assert.equal(plan.inserts.length, 0);
  assert.equal(plan.previousImports, 1);
});

test("历史记录的岗位或地点后来变化也不会被当成全新岗位", () => {
  const candidate = build27AutumnJobCandidates({
    schema,
    records: new Map([["r27", record("b27")]]),
  }).candidates[0];
  const existing = {
    ...candidate.payload,
    id: "22222222-2222-4222-8222-222222222222",
    job_titles: "产品类",
    locations: "北京",
  };
  const plan = planJobChanges([candidate], [existing]);
  assert.equal(plan.inserts.length, 0);
  assert.equal(plan.previousImports, 1);
});

test("同一来源记录不重复写入，内容变化时更新", () => {
  const candidate = build27AutumnJobCandidates({
    schema,
    records: new Map([["r27", record("b27")]]),
  }).candidates[0];
  const unchangedPlan = planJobChanges([candidate], [candidate.payload]);
  assert.equal(unchangedPlan.unchanged, 1);
  assert.equal(unchangedPlan.updates.length, 0);

  const changedExisting = { ...candidate.payload, notes: "旧备注" };
  const updatePlan = planJobChanges([candidate], [changedExisting]);
  assert.equal(updatePlan.updates.length, 1);
});

test("业务指纹和链接清洗保持稳定", () => {
  const base = {
    company_name: " 星辰科技 ",
    apply_url: "https://example.com/apply/?cid=tracking",
    job_titles: "软件研发类",
    locations: "上海",
    batch_type: "27秋招正式批",
  };
  const cleaned = { ...base, apply_url: sanitizeApplicationUrl(base.apply_url) };
  assert.equal(cleaned.apply_url, "https://example.com/apply/");
  assert.equal(getJobMergeFingerprint(cleaned), getJobMergeFingerprint({ ...cleaned }));
});

test("Excel空格、地点分隔符和HTML转义链接不产生重复岗位", () => {
  const fromExcel = {
    company_name: "星辰科技",
    apply_url: "https://example.com/apply?scene=1&amp;click_id=tracking",
    job_titles: "软件研发类, 产品类",
    locations: "北京，上海",
    batch_type: "27秋招正式批",
  };
  const fromLiveSheet = {
    ...fromExcel,
    apply_url: "https://example.com/apply?scene=1",
    job_titles: "产品类,软件研发类",
    locations: "上海 北京",
  };
  assert.equal(getJobMergeFingerprint(fromExcel), getJobMergeFingerprint(fromLiveSheet));
});
