import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveTencentReferralCodes,
  extractReferralCodeFromUrl,
  isSourceReferralCode,
} from "../../src/lib/referral-source.mjs";

test("只提取明确的推荐码、内推码和蚂蚁 code", () => {
  assert.deepEqual(
    extractReferralCodeFromUrl("https://jobs.mihoyo.com/m/?recommendationCode=MN72G&isRecommendation=true#/campus/position"),
    {
      code: "MN72G",
      parameter: "recommendationCode",
      sourceUrl: "https://jobs.mihoyo.com/m/?recommendationCode=MN72G&isRecommendation=true#/campus/position",
    },
  );
  assert.equal(extractReferralCodeFromUrl("https://campus.game.163.com/?referralCode=ryyQNNu")?.code, "ryyQNNu");
  assert.equal(
    extractReferralCodeFromUrl("https://hrrecommend.antgroup.com/job-list.html?code=RI2D8Qo_53mjwttzQKtL6z1ZIgy8ysp5ZdhFF3N6Hoo%3D")?.code,
    "RI2D8Qo_53mjwttzQKtL6z1ZIgy8ysp5ZdhFF3N6Hoo=",
  );
});

test("拒绝入口、路由和跟踪参数，避免把 spread 当内推码", () => {
  assert.equal(extractReferralCodeFromUrl("https://jobs.example.com/?spread=J7NS6YR"), null);
  assert.equal(extractReferralCodeFromUrl("https://jobs.example.com/?sourceToken=4de642484982a5686fb4467b93436646"), null);
  assert.equal(extractReferralCodeFromUrl("https://jobs.example.com/?code=not-allowed-here"), null);
  assert.equal(isSourceReferralCode("A2B3G4G"), true);
  assert.equal(isSourceReferralCode("RI2D8Qo_53mjwttzQKtL6z1ZIgy8ysp5ZdhFF3N6Hoo="), true);
  assert.equal(isSourceReferralCode("https://example.com"), false);
});

test("同一公司同一枚来源码合并，保留多个岗位的适用范围", () => {
  const rows = deriveTencentReferralCodes([
    {
      id: "job-early",
      company_name: "米哈游",
      batch_type: "27秋招提前批",
      job_titles: "软件研发类,设计类",
      apply_url: "https://jobs.mihoyo.com/m/?recommendationCode=MN72G&isRecommendation=true",
      updated_at: "2026-08-30T10:00:00.000Z",
    },
    {
      id: "job-formal",
      company_name: "米哈游",
      batch_type: "27秋招正式批",
      job_titles: "产品类,运营类",
      apply_url: "https://jobs.mihoyo.com/?recommendationCode=MN72G&isRecommendation=true",
      updated_at: "2026-08-31T10:00:00.000Z",
    },
    {
      id: "old-job",
      company_name: "错误批次",
      batch_type: "26秋招正式批",
      job_titles: "软件研发类",
      apply_url: "https://campus.game.163.com/?referralCode=abc123",
    },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].code, "MN72G");
  assert.equal(rows[0].job_id, null);
  assert.deepEqual(rows[0].source_job_ids, ["job-early", "job-formal"]);
  assert.match(rows[0].applicable_roles, /软件研发类/);
  assert.match(rows[0].applicable_roles, /产品类/);
});
