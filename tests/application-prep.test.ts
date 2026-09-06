import assert from "node:assert/strict";
import test from "node:test";

const resumeModulePath = "../src/lib/resume." + "ts";
const prepModulePath = "../src/lib/application-prep." + "ts";
const { createEmptyResume, createSampleResume } = await import(resumeModulePath);
const { getApplicationPrepSummary } = await import(prepModulePath);

test("网申准备度只统计现有简历中的安全常见字段", () => {
  const resume = createEmptyResume();
  const summary = getApplicationPrepSummary(resume);

  assert.equal(summary.totalCount, 9);
  assert.equal(summary.requiredTotalCount, 3);
  assert.equal(summary.filledCount, 0);
  assert.equal(summary.hasMinimumProfile, false);
  assert.equal(summary.percent, 0);
});

test("目标岗位支持复用简历版本字段且不阻断网申", () => {
  const resume = createEmptyResume();
  resume.targetRole = "数据分析实习生";
  const summary = getApplicationPrepSummary(resume);

  assert.equal(summary.fields.find((field: { key: string; filled: boolean }) => field.key === "targetRole")?.filled, true);
  assert.equal(summary.hasMinimumProfile, false);
});

test("示例简历会显示可用的经历准备度", () => {
  const summary = getApplicationPrepSummary(createSampleResume());

  assert.equal(summary.hasMinimumProfile, true);
  assert.equal(summary.sectionCounts.education, 1);
  assert.equal(summary.sectionCounts.experience, 1);
  assert.equal(summary.sectionCounts.projects, 1);
  assert.equal(summary.sectionCounts.skills, 1);
});
