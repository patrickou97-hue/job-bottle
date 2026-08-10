import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const streamModulePath = "../src/lib/star-interview-completion-stream." + "ts";
const {
  CompletionStreamCallerAbortError,
  CompletionStreamUpstreamError,
  createDurableCompletionStream,
  openCompletionSSE,
  runBeforeExposingCompletionStream,
} = await import(streamModulePath);
const validationModulePath = "../src/lib/star-interview-completion-validation." + "ts";
const { assertValidCompletionPayload } = await import(validationModulePath);
const reservationModulePath = "../src/lib/star-interview-completion-reservation." + "ts";
const { CompletionDispatchBlockedError } = await import(reservationModulePath);

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const testTimeouts = {
  firstContentTimeoutMs: 1_000,
  totalTimeoutMs: 5_000,
};

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
    ...testTimeouts,
    fetchImpl: async () => responseFrom(chunks),
  });
  const reader = stream.getReader();

  assert.equal(await readEvent(reader), chunks[0]);
  assert.equal(await readEvent(reader), chunks[1]);
  assert.equal(await readEvent(reader), chunks[2]);
  assert.equal((await reader.read()).done, true);
});

test("rejects an HTTP 200 stream that reaches DONE without answer content", async () => {
  await assert.rejects(
    openCompletionSSE({
      url: "https://upstream.example/chat/completions",
      apiKey: "test-key",
      body: { stream: true },
      ...testTimeouts,
      fetchImpl: async () => responseFrom([
        'data: {"choices":[{"delta":{"role":"assistant"}}]}\n\n',
        "data: [DONE]\n\n",
      ]),
    }),
    /without answer content/,
  );
});

test("rejects a whitespace-only delta even when the stream reaches DONE", async () => {
  await assert.rejects(
    openCompletionSSE({
      url: "https://upstream.example/chat/completions",
      apiKey: "test-key",
      body: { stream: true },
      ...testTimeouts,
      fetchImpl: async () => responseFrom([
        'data: {"choices":[{"delta":{"content":"   "}}]}\n\n',
        "data: [DONE]\n\n",
      ]),
    }),
    /without answer content/,
  );
});

test("pre-aborted requests do not persist intent or start fetch", async () => {
  const caller = new AbortController();
  caller.abort(new DOMException("client left", "AbortError"));
  let intentCalls = 0;
  let fetchCalls = 0;

  await assert.rejects(openCompletionSSE({
    url: "https://upstream.example/chat/completions",
    apiKey: "test-key",
    body: { stream: true },
    ...testTimeouts,
    signal: caller.signal,
    beforeDispatch: async () => { intentCalls += 1; },
    fetchImpl: async () => {
      fetchCalls += 1;
      return responseFrom([]);
    },
  }), (error: unknown) => error instanceof DOMException && error.name === "AbortError");

  assert.equal(intentCalls, 0);
  assert.equal(fetchCalls, 0);
});

test("cancellation during durable intent prevents fetch and dispatched marker", async () => {
  const caller = new AbortController();
  let fetchCalls = 0;
  let dispatchedCalls = 0;

  await assert.rejects(openCompletionSSE({
    url: "https://upstream.example/chat/completions",
    apiKey: "test-key",
    body: { stream: true },
    ...testTimeouts,
    signal: caller.signal,
    beforeDispatch: async () => {
      caller.abort(new DOMException("client left", "AbortError"));
    },
    afterDispatch: async () => { dispatchedCalls += 1; },
    fetchImpl: async () => {
      fetchCalls += 1;
      return responseFrom([]);
    },
  }), (error: unknown) => error instanceof DOMException && error.name === "AbortError");

  assert.equal(fetchCalls, 0);
  assert.equal(dispatchedCalls, 0);
});

test("blocked dispatch authority prevents fetch and dispatched marker", async () => {
  let fetchCalls = 0;
  let dispatchedCalls = 0;

  await assert.rejects(openCompletionSSE({
    url: "https://upstream.example/chat/completions",
    apiKey: "test-key",
    body: { stream: true },
    ...testTimeouts,
    beforeDispatch: async () => {
      throw new CompletionDispatchBlockedError();
    },
    afterDispatch: async () => { dispatchedCalls += 1; },
    fetchImpl: async () => {
      fetchCalls += 1;
      return responseFrom([]);
    },
  }), (error: unknown) => error instanceof CompletionDispatchBlockedError);

  assert.equal(fetchCalls, 0);
  assert.equal(dispatchedCalls, 0);
});

test("persists intent before fetch and dispatched state immediately after fetch starts", async () => {
  const order: string[] = [];
  const stream = await openCompletionSSE({
    url: "https://upstream.example/chat/completions",
    apiKey: "test-key",
    body: { stream: true },
    ...testTimeouts,
    beforeDispatch: async () => { order.push("intent"); },
    onFetchStarted: () => { order.push("fetch-started"); },
    afterDispatch: async () => { order.push("dispatched"); },
    fetchImpl: async () => {
      order.push("fetch");
      return responseFrom([
        'data: {"choices":[{"delta":{"content":"ok"}}]}\n\n',
        "data: [DONE]\n\n",
      ]);
    },
  });
  await stream.cancel();
  assert.deepEqual(order, ["intent", "fetch", "fetch-started", "dispatched"]);
});

test("handles an immediate fetch rejection while the dispatched marker is pending", async () => {
  await assert.rejects(openCompletionSSE({
    url: "https://upstream.example/chat/completions",
    apiKey: "test-key",
    body: { stream: true },
    ...testTimeouts,
    afterDispatch: async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 20));
    },
    fetchImpl: () => Promise.reject(new Error("fast network failure")),
  }), /fast network failure/);
});

test("a settled upstream error wins over a later client abort", async () => {
  const caller = new AbortController();
  await assert.rejects(openCompletionSSE({
    url: "https://upstream.example/chat/completions",
    apiKey: "test-key",
    body: { stream: true },
    ...testTimeouts,
    signal: caller.signal,
    afterDispatch: async () => {
      caller.abort(new DOMException("late client exit", "AbortError"));
    },
    fetchImpl: async () => responseFrom(["busy"], 429),
  }), (error: unknown) => (
    error instanceof CompletionStreamUpstreamError
      && (error as { status?: unknown }).status === 429
  ));
});

test("clears the first-content deadline before forwarding a healthy long stream", async () => {
  const chunks = [
    'data: {"choices":[{"delta":{"content":"先"}}]}\n\n',
    'data: {"choices":[{"delta":{"content":"分类"}}]}\n\n',
    "data: [DONE]\n\n",
  ];
  const stream = await openCompletionSSE({
    url: "https://upstream.example/chat/completions",
    apiKey: "test-key",
    body: { stream: true },
    firstContentTimeoutMs: 10,
    totalTimeoutMs: 1_000,
    fetchImpl: async (_url: URL | RequestInfo, init?: RequestInit) => new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode(chunks[0]));
          const finish = setTimeout(() => {
            controller.enqueue(encoder.encode(chunks[1]));
            controller.enqueue(encoder.encode(chunks[2]));
            controller.close();
          }, 40);
          init?.signal?.addEventListener("abort", () => {
            clearTimeout(finish);
            controller.error(new DOMException("timed out", "AbortError"));
          }, { once: true });
        },
      }),
    ),
  });

  const reader = stream.getReader();
  let body = "";
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    body += decoder.decode(next.value);
  }
  assert.equal(body, chunks.join(""));
});

test("rejects empty or malformed non-stream completion payloads", () => {
  assert.throws(() => assertValidCompletionPayload(null), /invalid payload/);
  assert.throws(() => assertValidCompletionPayload({}), /invalid payload/);
  assert.throws(
    () => assertValidCompletionPayload({ choices: [{ message: { content: "  " } }] }),
    /empty answer/,
  );
  assert.doesNotThrow(() => assertValidCompletionPayload({
    choices: [{ message: { content: "{\"answer\":\"可以\"}" } }],
  }));
});

test("forwards cancellation to upstream", async () => {
  let cancelled = false;
  const upstream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(
        'data: {"choices":[{"delta":{"content":"已开始"}}]}\n\n',
      ));
    },
    pull() {},
    cancel() { cancelled = true; },
  });
  const stream = await openCompletionSSE({
    url: "https://upstream.example/chat/completions",
    apiKey: "test-key",
    body: { stream: true },
    ...testTimeouts,
    fetchImpl: async () => new Response(upstream),
  });
  await stream.cancel("client cancelled");
  assert.equal(cancelled, true);
});

test("aborts the upstream open when the client request is cancelled", async () => {
  const caller = new AbortController();
  const opening = openCompletionSSE({
    url: "https://upstream.example/chat/completions",
    apiKey: "test-key",
    body: { stream: true },
    ...testTimeouts,
    signal: caller.signal,
    fetchImpl: async (_url: URL | RequestInfo, init?: RequestInit) => (
      new Promise<Response>((_resolve, reject) => {
        const rejectAbort = () => {
          reject(new DOMException("cancelled", "AbortError"));
        };
        if (init?.signal?.aborted) {
          rejectAbort();
          return;
        }
        init?.signal?.addEventListener("abort", rejectAbort, { once: true });
      })
    ),
  });
  caller.abort(new DOMException("client left", "AbortError"));
  await assert.rejects(opening, (error: unknown) => (
    error instanceof DOMException && error.name === "AbortError"
  ));
});

test("wraps a caller abort that wins after fetch starts", async () => {
  const caller = new AbortController();
  let notifyFetchStarted!: () => void;
  const fetchStarted = new Promise<void>((resolve) => { notifyFetchStarted = resolve; });
  const opening = openCompletionSSE({
    url: "https://upstream.example/chat/completions",
    apiKey: "test-key",
    body: { stream: true },
    ...testTimeouts,
    signal: caller.signal,
    onFetchStarted: notifyFetchStarted,
    fetchImpl: async (_url: URL | RequestInfo, init?: RequestInit) => (
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("cancelled", "AbortError"));
        }, { once: true });
      })
    ),
  });
  await fetchStarted;
  caller.abort(new DOMException("client left", "AbortError"));
  await assert.rejects(opening, (error: unknown) => (
    error instanceof CompletionStreamCallerAbortError
  ));
});

test("rejects upstream non-200 before exposing stream", async () => {
  await assert.rejects(
    openCompletionSSE({
      url: "https://upstream.example/chat/completions",
      apiKey: "test-key",
      body: { stream: true },
      ...testTimeouts,
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
        controller.enqueue(encoder.encode(
          'data: {"choices":[{"delta":{"content":"first"}}]}\n\n',
        ));
        return;
      }
      controller.error(new Error("stream disconnected"));
    },
  });
  const stream = await openCompletionSSE({
    url: "https://upstream.example/chat/completions",
    apiKey: "test-key",
    body: { stream: true },
    ...testTimeouts,
    fetchImpl: async () => new Response(upstream),
  });
  const reader = stream.getReader();
  assert.equal(
    await readEvent(reader),
    'data: {"choices":[{"delta":{"content":"first"}}]}\n\n',
  );
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

test("route reserves before upstream and commits a stream before exposing bytes", async () => {
  const route = await readFile(
    new URL("../src/app/api/star-interview/completion/route.ts", import.meta.url),
    "utf8",
  );
  const streamFunction = route.slice(route.indexOf("async function streamCompletion"));
  assert.match(streamFunction, /stream:\s*true/);
  assert.match(route, /createCompletionRequestHash/);
  assert.match(route, /reserveStarInterviewCompletion/);
  assert.match(route, /markStarInterviewCompletionDispatchIntent/);
  assert.match(route, /markStarInterviewCompletionDispatched/);
  const openIndex = streamFunction.indexOf("openCompletionSSE");
  const chargeIndex = streamFunction.indexOf("commitStarInterviewCompletionStream");
  const responseIndex = streamFunction.indexOf("return new Response");
  assert.ok(openIndex >= 0 && openIndex < chargeIndex);
  assert.ok(chargeIndex < responseIndex);
  assert.match(streamFunction, /createDurableCompletionStream/);
  assert.doesNotMatch(streamFunction, /chargeStarInterviewUsage/);
});

test("durable stream persists the exact SSE before exposing its final marker", async () => {
  const chunks = [
    'data: {"choices":[{"delta":{"content":"先"}}]}\n',
    "\n",
    'data: {"choices":[{"delta":{"content":"分类"}}]}\n',
    "\n",
    "data: [DONE]\n",
    "\n",
  ];
  let persisted = "";
  let completed = false;
  const upstream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  const durable = createDurableCompletionStream({
    upstream,
    maxBytes: 10_000,
    complete: async (body: string) => {
      persisted = body;
      completed = true;
    },
    fail: async () => assert.fail("successful stream must not fail"),
  });
  const reader = durable.getReader();
  let delivered = "";
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    const text = decoder.decode(next.value);
    if (text.includes("[DONE]")) assert.equal(completed, true);
    delivered += text;
  }
  assert.equal(persisted, chunks.join(""));
  assert.equal(delivered, chunks.join(""));
});

test("durable stream cancellation closes upstream and finalizes failure", async () => {
  let upstreamCancelled = false;
  let failed = false;
  const upstream = new ReadableStream<Uint8Array>({
    pull(controller) {
      controller.enqueue(encoder.encode("data: partial\n\n"));
    },
    cancel() { upstreamCancelled = true; },
  });
  const durable = createDurableCompletionStream({
    upstream,
    maxBytes: 10_000,
    complete: async () => assert.fail("cancelled stream must not complete"),
    fail: async () => { failed = true; },
  });
  const reader = durable.getReader();
  await reader.read();
  await reader.cancel("client left");
  assert.equal(upstreamCancelled, true);
  assert.equal(failed, true);
});

test("route maps the compatible client token field to DeepSeek max tokens", async () => {
  const route = await readFile(
    new URL("../src/app/api/star-interview/completion/route.ts", import.meta.url),
    "utf8",
  );

  assert.match(route, /max_tokens:\s*z\.number/);
  assert.match(route, /z\.enum\(\["mimo-v2\.5", "deepseek-v4-flash"\]\)/);
  assert.equal(
    (route.match(/thinking:\s*\{\s*type:\s*"disabled"\s*\}/g) ?? []).length,
    2,
  );
  assert.equal(
    (route.match(/max_tokens:\s*(?:parsed\.data|input)\.max_tokens/g) ?? []).length,
    2,
  );
  assert.doesNotMatch(route, /max_completion_tokens/);
  assert.equal((route.match(/model:\s*config\.model/g) ?? []).length, 2);
});

test("keeps DeepSeek completion and MiMo ASR credentials independent", async () => {
  const server = await readFile(
    new URL("../src/lib/star-interview-server.ts", import.meta.url),
    "utf8",
  );
  const completionRoute = await readFile(
    new URL("../src/app/api/star-interview/completion/route.ts", import.meta.url),
    "utf8",
  );
  const asrRoute = await readFile(
    new URL("../src/app/api/star-interview/asr/route.ts", import.meta.url),
    "utf8",
  );
  const llmConfiguration = server.slice(
    server.indexOf("export function getStarInterviewLLMConfiguration"),
    server.indexOf("export function getStarInterviewASRConfiguration"),
  );
  const asrConfiguration = server.slice(
    server.indexOf("export function getStarInterviewASRConfiguration"),
    server.indexOf("export function getChatCompletionsUrl"),
  );

  assert.match(llmConfiguration, /DEEPSEEK_API_KEY/);
  assert.match(llmConfiguration, /DEEPSEEK_BASE_URL/);
  assert.match(llmConfiguration, /DEEPSEEK_MODEL/);
  assert.match(llmConfiguration, /deepseek-v4-flash/);
  assert.doesNotMatch(llmConfiguration, /MIMO_/);
  assert.match(asrConfiguration, /MIMO_API_KEY/);
  assert.match(asrConfiguration, /MIMO_ASR_BASE_URL/);
  assert.match(asrConfiguration, /MIMO_ASR_MODEL/);
  assert.match(asrConfiguration, /mimo-v2\.5-asr/);
  assert.doesNotMatch(asrConfiguration, /DEEPSEEK_/);
  assert.match(completionRoute, /getStarInterviewLLMConfiguration/);
  assert.doesNotMatch(completionRoute, /getStarInterviewASRConfiguration/);
  assert.match(asrRoute, /getStarInterviewASRConfiguration/);
  assert.doesNotMatch(asrRoute, /getStarInterviewLLMConfiguration|DEEPSEEK_/);
});

test("completion keeps separate first-content, total-stream, and platform deadlines", async () => {
  const route = await readFile(
    new URL("../src/app/api/star-interview/completion/route.ts", import.meta.url),
    "utf8",
  );

  assert.match(route, /export const maxDuration = 240/);
  assert.match(route, /timeoutMs:\s*150_000/);
  const streamFunction = route.slice(route.indexOf("async function streamCompletion"));
  assert.match(streamFunction, /firstContentTimeoutMs:\s*55_000/);
  assert.match(streamFunction, /totalTimeoutMs:\s*150_000/);
  assert.match(route, /max_tokens:\s*z\.number\(\)\.int\(\)\.min\(1\)\.max\(3_500\)/);
});

test("post-dispatch client cancellation is finalized without a refund", async () => {
  const route = await readFile(
    new URL("../src/app/api/star-interview/completion/route.ts", import.meta.url),
    "utf8",
  );
  const billing = await readFile(
    new URL("../src/lib/star-interview-billing.ts", import.meta.url),
    "utf8",
  );

  assert.match(route, /upstreamFetchStarted\s*&&\s*isCallerAbortError\(error\)/);
  assert.match(route, /refund:\s*!\(upstreamFetchStarted\s*&&\s*isCallerAbortError\(error\)\)/);
  assert.match(route, /error instanceof StarInterviewCallerAbortError/);
  assert.match(billing, /p_refund:\s*input\.refund\s*!==\s*false/);
});

test("both completion fetch helpers attach a same-tick rejection handler", async () => {
  const [server, stream] = await Promise.all([
    readFile(new URL("../src/lib/star-interview-server.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/star-interview-completion-stream.ts", import.meta.url), "utf8"),
  ]);
  assert.match(server, /void responsePromise\.then\([\s\S]*?"transport_error"/);
  assert.match(stream, /void responsePromise\.then\([\s\S]*?"transport_error"/);
});
