import assert from "node:assert/strict";
import test from "node:test";
const workflowModulePath = "../src/lib/application-workflow." + "ts";
const {
  cloneDefaultApplicationWorkflow,
  getApplicationWorkflow,
  getApplicationWorkflowNode,
  normalizeApplicationWorkflow,
  validateApplicationWorkflow,
} = await import(workflowModulePath);

test("keeps each company's workflow independent", () => {
  const custom = [
    { id: "screen", label: "简历筛选", status: "applied", isCustom: true },
    { id: "partner", label: "合伙人面", status: "final_round", isCustom: true },
  ];
  assert.deepEqual(getApplicationWorkflow({ workflow_nodes: custom }), custom);
  assert.deepEqual(getApplicationWorkflow({ workflow_nodes: null }), cloneDefaultApplicationWorkflow());
});

test("normalizes valid custom workflow nodes", () => {
  const nodes = normalizeApplicationWorkflow([
    { id: "start", label: "待投递", status: "opened", isCustom: true },
    { id: "hr", label: "HR 面", status: "final_round", isCustom: true },
  ]);
  assert.equal(nodes.length, 2);
  assert.equal(nodes[1]?.label, "HR 面");
  assert.equal(nodes[1]?.isCustom, true);
});

test("falls back to the default workflow when stored nodes are invalid", () => {
  const nodes = normalizeApplicationWorkflow([{ id: "only", label: "仅一个", status: "opened" }]);
  assert.deepEqual(nodes, cloneDefaultApplicationWorkflow());
});

test("resolves an application to its exact custom node before canonical status", () => {
  const nodes = normalizeApplicationWorkflow([
    { id: "first", label: "业务一面", status: "first_round", isCustom: true },
    { id: "case", label: "案例面", status: "first_round", isCustom: true },
  ]);
  const node = getApplicationWorkflowNode({
    status: "first_round",
    workflow_node_id: "case",
    custom_stage_label: "案例面",
  }, nodes);
  assert.equal(node?.id, "case");
});

test("rejects duplicate labels and accepts a complete workflow", () => {
  const duplicate = [
    { id: "a", label: "面试", status: "first_round", isCustom: true },
    { id: "b", label: "面试", status: "second_round", isCustom: true },
  ] as const;
  assert.match(validateApplicationWorkflow([...duplicate]), /不能重复/);
  assert.equal(validateApplicationWorkflow(cloneDefaultApplicationWorkflow()), "");
});
