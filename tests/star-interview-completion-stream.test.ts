import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const streamModulePath = "../src/lib/star-interview-completion-stream." + "ts";
const {
  CompletionStreamUpstreamError,
  openCompletionSSE,
  runBeforeExposingCompletionStream,
} = await import(streamModulePath);

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function responseFrom(chunks: string[], status = 200) {
  return new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  }), { status });
}

async function readEvent(
  reader: ReadableStreamDefaultReader<Uint8Array>,
) {
  let value = "";
  while (!value.endsWith("\n\n")) {
    const next = await reader.read();
    if (next.done) break;
    value += decoder.decode(next.value);
  }
  return value;
}

test("proxies first delta, multiple deltas, and DONE without buffering", async () => {
  const chunks = [
    'data: {"choices":[{"delta":{"content":"先"}}]}\n\n',
    'data: {"choices":[{"delta":{"content":"分类"}}]}\n\n',
    "data: [DONE]\n\n",
  ];
  const stream = await openCompletionSSE({
    url: "https://upstream.example/chat/completions",
    apiKey: "test-key",
    body: { stream: true },
    timeoutMs: 1_000,
    fetchImpl: async () => responseFrom(chunks),
  });
  const reader = stream.getReader();

  assert.equal(await readEvent(reader), chunks[0]);
  assert.equal(await readEvent(reader), chunks[1]);
  assert.equal(await readEvent(reader), chunks[2]);
  assert.equal((await reader.read()).done, true);
});

test("forwards cancellation to upstream", async () => {
  let cancelled = false;
  const upstream = new ReadableStream<Uint8Array>({
    pull() {},
    cancel() { cancelled = true; },
  });
  const stream = await openCompletionSSE({
    url: "https://upstream.example/chat/completions",
    apiKey: "test-key",
    body: { stream: true },
    timeoutMs: 1_000,
    fetchImpl: async () => new Response(upstream),
  });
  await stream.cancel("client cancelled");
  assert.equal(cancelled, true);
});

test("rejects upstream non-200 before exposing stream", async () => {
  await assert.rejects(
    openCompletionSSE({
      url: "https://upstream.example/chat/completions",
      apiKey: "test-key",
      body: { stream: true },
      timeoutMs: 1_000,
      fetchImpl: async () => responseFrom(["busy"], 429),
    }),
    (error: unknown) => (
      error instanceof CompletionStreamUpstreamError
        && (error as { status?: unknown }).status === 429
    ),
  );
});

test("surfaces disconnect after already delivered delta", async () => {
  let delivered = false;
  const upstream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (!delivered) {
        delivered = true;
        controller.enqueue(encoder.encode("data: first\n\n"));
        return;
      }
      controller.error(new Error("stream disconnected"));
    },
  });
  const stream = await openCompletionSSE({
    url: "https://upstream.example/chat/completions",
    apiKey: "test-key",
    body: { stream: true },
    timeoutMs: 1_000,
    fetchImpl: async () => new Response(upstream),
  });
  const reader = stream.getReader();
  assert.equal(await readEvent(reader), "data: first\n\n");
  await assert.rejects(reader.read(), /stream disconnected/);
});

test("cancels opened upstream when pre-exposure charge throws", async () => {
  let cancelled = false;
  const upstream = new ReadableStream<Uint8Array>({
    cancel() { cancelled = true; },
  });

  await assert.rejects(
    runBeforeExposingCompletionStream(upstream, async () => {
      throw new Error("billing RPC failed");
    }),
    /billing RPC failed/,
  );
  assert.equal(cancelled, true);
});

test("route charges once after upstream 200 and before exposing bytes", async () => {
  const route = await readFile(
    new URL("../src/app/api/star-interview/completion/route.ts", import.meta.url),
    "utf8",
  );
  const streamFunction = route.slice(route.indexOf("async function streamCompletion"));
  assert.match(streamFunction, /stream:\s*true/);
  assert.match(streamFunction, /meterKey:\s*input\.meterKey/);
  const openIndex = streamFunction.indexOf("openCompletionSSE");
  const chargeIndex = streamFunction.indexOf("chargeStarInterviewUsage");
  const responseIndex = streamFunction.indexOf("return new Response");
  assert.ok(openIndex >= 0 && openIndex < chargeIndex);
  assert.ok(chargeIndex < responseIndex);
  assert.match(streamFunction, /runBeforeExposingCompletionStream/);
});
