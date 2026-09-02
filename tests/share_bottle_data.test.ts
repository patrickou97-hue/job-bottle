import assert from "node:assert/strict";
import test from "node:test";
import type { ApplicationStatus, ApplicationWithJob } from "../src/lib/types";
const shareBottleDataModulePath = "../src/components/applications/shareBottleData." + "ts";
const { buildSharePosterModel } = await import(shareBottleDataModulePath);

function application(id: string, companyName: string, status: ApplicationStatus): ApplicationWithJob {
  return {
    id,
    user_id: "user-1",
    job_id: id,
    status,
    progress_note: null,
    applied_at: null,
    updated_at: "2026-09-02T00:00:00.000Z",
    job: { company_name: companyName } as ApplicationWithJob["job"],
  };
}

test("分享海报按企业合并重复投递并保留最强进度", () => {
  const model = buildSharePosterModel([
    application("1", "星河科技", "opened"),
    application("2", "星河科技", "first_round"),
    application("3", "远方咨询", "offer"),
  ]);

  assert.equal(model.totalApplications, 3);
  assert.equal(model.totalCompanies, 2);
  assert.equal(model.companies[0]?.applicationCount, 2);
  assert.equal(model.companies[0]?.status, "first_round");
  assert.equal(model.companies[1]?.status, "offer");
});

test("企业过多时按照海报展示上限折叠剩余企业", () => {
  const applications = Array.from({ length: 13 }, (_, index) => application(String(index), `企业 ${index}`, "applied"));
  const model = buildSharePosterModel(applications);

  assert.equal(model.companyLimit, 10);
  assert.equal(model.companies.length, 10);
  assert.equal(model.overflowCompanyCount, 3);
});
