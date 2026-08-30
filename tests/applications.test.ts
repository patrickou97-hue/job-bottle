import assert from "node:assert/strict";
import test from "node:test";

const applicationsModulePath = "../src/lib/applications." + "ts";
const { updateApplication } = await import(applicationsModulePath);

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
