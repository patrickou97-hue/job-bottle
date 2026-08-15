import assert from "node:assert/strict";
import test from "node:test";
import type { ResumeTranslationDraft } from "../src/lib/resume-translation";
const translationPlanModulePath = "../src/lib/resume-translation-plan." + "ts";
const {
  applyTranslationValues,
  createTranslationPlan,
  getTranslationOutputLimit,
} = await import(translationPlanModulePath);

const source: ResumeTranslationDraft = {
  title: "产品经理简历",
  targetRole: "战略分析、商业运营、数字化转型、增长策略、市场进入、竞争研究、用户洞察、产品规划与项目管理",
  jobTarget: "",
  basics: { name: "测试用户", englishName: "Test User", city: "上海", targetRole: "产品经理" },
  education: [],
  work: [{
    company: "示例公司",
    title: "产品实习生",
    location: "上海",
    startDate: "2025-01",
    endDate: "2025-06",
    current: false,
    bullets: ["负责用户研究、产品方案设计、跨部门协作、上线验收、数据复盘与持续迭代。"],
  }],
  projects: [],
  skills: [],
  campus: [],
  awards: [],
  certifications: [],
  languages: [],
  customSections: [],
};

test("合法英文译文可按语言膨胀而不会被误判为结构异常", () => {
  const plan = createTranslationPlan(source, "en-US");
  const values = new Map<string, string>();

  for (const chunk of plan.chunks) {
    for (const entry of chunk.entries) {
      if (entry.path.join(".") === "targetRole") {
        assert.equal(entry.maxLength, getTranslationOutputLimit(180));
        values.set(entry.key, "x".repeat(247));
      } else if (entry.path.join(".") === "work.0.bullets.0") {
        assert.equal(entry.maxLength, getTranslationOutputLimit(1_000));
        values.set(entry.key, "y".repeat(1_579));
      } else {
        values.set(entry.key, entry.value);
      }
    }
  }

  const translated = applyTranslationValues(plan, values);
  assert.equal(translated.targetRole.length, 247);
  assert.equal(translated.work[0].bullets[0].length, 1_579);
  assert.equal(translated.work.length, source.work.length);
  assert.equal(translated.work[0].bullets.length, source.work[0].bullets.length);
});

test("译文仍受四倍安全上限约束", () => {
  assert.equal(getTranslationOutputLimit(180), 720);
  assert.equal(getTranslationOutputLimit(1_000), 4_000);

  const plan = createTranslationPlan(source, "en-US");
  const values = new Map<string, string>();
  for (const chunk of plan.chunks) {
    for (const entry of chunk.entries) {
      values.set(entry.key, entry.path.join(".") === "targetRole" ? "x".repeat(721) : entry.value);
    }
  }

  assert.throws(() => applyTranslationValues(plan, values), /invalid translation/);
});
