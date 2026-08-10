import assert from "node:assert/strict";
import test from "node:test";
const requestKeyModulePath = "../src/lib/star-interview-request-key." + "ts";
const {
  createCompletionBillingKey,
  createCompletionRequestHash,
} = await import(requestKeyModulePath);

const baseRequest = {
  meterKey: "00000000-0000-4000-8000-000000000001",
  clientModel: "mimo-v2.5" as const,
  messages: [
    { role: "system" as const, content: "只回答候选人的真实经历。" },
    { role: "user" as const, content: "请回答为什么选择这个岗位。" },
  ],
  temperature: 0.2,
  maxTokens: 800,
  stream: false,
};

test("exact completion retries keep the same bounded billing key", () => {
  assert.equal(
    createCompletionBillingKey(baseRequest),
    createCompletionBillingKey({ ...baseRequest, messages: [...baseRequest.messages] }),
  );
});

test("changing completion content cannot reuse the original billing key", () => {
  const original = createCompletionBillingKey(baseRequest);
  assert.notEqual(
    original,
    createCompletionBillingKey({
      ...baseRequest,
      messages: [
        baseRequest.messages[0],
        { role: "user", content: "请生成另一道问题的完整答案。" },
      ],
    }),
  );
  assert.notEqual(
    original,
    createCompletionBillingKey({ ...baseRequest, temperature: 0.8 }),
  );
  assert.notEqual(
    original,
    createCompletionBillingKey({ ...baseRequest, maxTokens: 1_200 }),
  );
  assert.notEqual(
    original,
    createCompletionBillingKey({ ...baseRequest, stream: true }),
  );
  assert.notEqual(
    original,
    createCompletionBillingKey({ ...baseRequest, clientModel: "deepseek-v4-flash" }),
  );
});

test("bounded completion billing keys fit the database meter limit", () => {
  const key = createCompletionBillingKey(baseRequest);
  assert.match(key, /^v2:[0-9a-f-]{36}:[0-9a-f]{32}$/);
  assert.ok(key.length <= 120);
});

test("durable completion hashes bind the full response mode", () => {
  const jsonHash = createCompletionRequestHash(baseRequest);
  const streamHash = createCompletionRequestHash({ ...baseRequest, stream: true });
  assert.match(jsonHash, /^[0-9a-f]{64}$/);
  assert.match(streamHash, /^[0-9a-f]{64}$/);
  assert.notEqual(jsonHash, streamHash);
});

test("durable hashes distinguish omitted and explicit null provider fields", () => {
  assert.notEqual(
    createCompletionRequestHash({ ...baseRequest, temperature: undefined }),
    createCompletionRequestHash({ ...baseRequest, temperature: null }),
  );
  assert.notEqual(
    createCompletionRequestHash({ ...baseRequest, maxTokens: undefined }),
    createCompletionRequestHash({ ...baseRequest, maxTokens: null }),
  );
});
