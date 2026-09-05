import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const applicationsModulePath = "../src/lib/applications." + "ts";
const { getApplicationDisplayPosition, normalizeAppliedPosition, updateApplication } = await import(applicationsModulePath);

function createSupabaseStub(responses: Array<{ data: unknown; error: unknown }>) {
  const updates: unknown[] = [];
  const builder = {
    update(values: unknown) {
      updates.push(values);
      return builder;
    },
    eq() {
      return builder;
    },
    select() {
      return builder;
    },
    abortSignal() {
      return builder;
    },
    single() {
      return Promise.resolve(responses.shift() ?? { data: null, error: null });
    },
  };
  return {
    updates,
    supabase: { from: () => builder },
  };
}

test("continues saving workflow fields when only applied_position is missing remotely", async () => {
  const { updates, supabase } = createSupabaseStub([
    {
      data: null,
      error: {
        code: "PGRST204",
        message: "Could not find the 'applied_position' column of 'user_applications' in the schema cache",
      },
    },
    {
      data: { id: "application-1", status: "applied", progress_note: null },
      error: null,
    },
  ]);

  const result = await updateApplication(supabase as never, "application-1", {
    status: "applied",
    applied_position: "产品经理（北京）",
    workflow_node_id: "default-applied",
  });

  assert.deepEqual(updates, [
    {
      status: "applied",
      applied_position: "产品经理（北京）",
      workflow_node_id: "default-applied",
    },
    {
      status: "applied",
      workflow_node_id: "default-applied",
    },
  ]);
  assert.deepEqual(result.omittedApplicationColumns, ["applied_position"]);
});

test("does not claim an applied position was saved when it is the only unsupported field", async () => {
  const { updates, supabase } = createSupabaseStub([
    {
      data: null,
      error: {
        code: "PGRST204",
        message: "Could not find the 'applied_position' column of 'user_applications' in the schema cache",
      },
    },
  ]);

  await assert.rejects(
    updateApplication(supabase as never, "application-1", { applied_position: "产品经理（北京）" }),
    /migration/,
  );
  assert.equal(updates.length, 1);
});

test("shows only the user's explicit applied position in application management", () => {
  const application = {
    applied_position: "  产品经理（北京）  ",
    job: {
      job_titles: "软件研发类、市场类",
      job_categories: ["软件研发类", "市场类"],
    },
  };

  assert.equal(getApplicationDisplayPosition(application as never), "产品经理（北京）");
  assert.equal(getApplicationDisplayPosition({ ...application, applied_position: null } as never), "");
  assert.equal(normalizeAppliedPosition("   "), null);
});

test("all public apply entry points collect and persist the actual applied position", () => {
  const confirmSource = readFileSync(new URL("../src/components/jobs/ApplyReturnConfirm.tsx", import.meta.url), "utf8");
  assert.match(confirmSource, /MotionDialog/);
  assert.match(confirmSource, /实际投递岗位（可选）/);
  assert.match(confirmSource, /onApplied\(appliedPosition\)/);

  for (const relativePath of [
    "../src/components/jobs/HomeClient.tsx",
    "../src/components/jobs/JobDetailActions.tsx",
    "../src/components/galaxy/GalaxyJobsClient.tsx",
  ]) {
    const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
    assert.match(source, /normalizeAppliedPosition\(appliedPosition\)/);
    assert.match(source, /applied_position: normalizedAppliedPosition/);
    assert.match(source, /onApplied=\{\(appliedPosition\)/);
  }
});

test("auto-saves the actual applied position after typing and flushes on blur", () => {
  const source = readFileSync(new URL("../src/components/applications/ProgressDrawer.tsx", import.meta.url), "utf8");

  assert.match(source, /appliedPositionSaveTimerRef/);
  assert.match(source, /void saveAppliedPosition\(appliedPosition\)/);
  assert.match(source, /}, 700\)/);
  assert.match(source, /onBlur=\{\(\) => void handleAppliedPositionBlur\(\)\}/);
  assert.match(source, /输入后自动保存/);
  assert.match(source, /applied_position: cleanOptional\(nextPosition\)/);
});

test("defaults the application list to the most recently updated records", () => {
  const source = readFileSync(new URL("../src/components/applications/MyApplicationsClient.tsx", import.meta.url), "utf8");

  assert.match(source, /useState<ApplicationSort>\("recent"\)/);
  assert.match(source, /setSort\("recent"\)/);
  assert.match(source, /sort !== "recent"/);
  assert.match(source, /if \(sort === "recent"\) return new Date\(b\.updated_at\)\.getTime\(\) - new Date\(a\.updated_at\)\.getTime\(\)/);
  assert.match(source, /<option value="recent">最近更新优先（默认）<\/option>/);
});
