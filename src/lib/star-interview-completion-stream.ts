export class CompletionStreamUpstreamError extends Error {
  status: number;

  constructor(status: number) {
    super(`Completion stream upstream ${status}`);
    this.status = status;
  }
}

export class CompletionStreamCallerAbortError extends Error {
  override name = "CompletionStreamCallerAbortError";
  reason?: unknown;

  constructor(reason?: unknown) {
    super("Completion stream was cancelled by the caller");
    this.reason = reason;
  }
}

type FetchLike = typeof fetch;

export async function openCompletionSSE(input: {
  url: string;
  apiKey: string;
  body: unknown;
  firstContentTimeoutMs: number;
  totalTimeoutMs: number;
  signal?: AbortSignal;
  fetchImpl?: FetchLike;
  beforeDispatch?: () => Promise<void>;
  onFetchStarted?: () => void;
  afterDispatch?: () => Promise<void>;
}): Promise<ReadableStream<Uint8Array>> {
  throwIfAborted(input.signal);
  await input.beforeDispatch?.();
  throwIfAborted(input.signal);

  const controller = new AbortController();
  const firstContentTimeout = setTimeout(
    () => controller.abort(new DOMException("First content timed out", "AbortError")),
    input.firstContentTimeoutMs,
  );
  const totalTimeout = setTimeout(
    () => controller.abort(new DOMException("Completion stream timed out", "AbortError")),
    input.totalTimeoutMs,
  );
  let fetchOutcome: "pending" | "success" | "upstream_error" | "transport_error" = "pending";
  let callerAbortWon = false;
  const abortFromCaller = () => {
    if (fetchOutcome === "pending" || fetchOutcome === "success") callerAbortWon = true;
    controller.abort(input.signal?.reason);
  };
  if (input.signal?.aborted) abortFromCaller();
  else input.signal?.addEventListener("abort", abortFromCaller, { once: true });
  const cleanup = () => {
    clearTimeout(firstContentTimeout);
    clearTimeout(totalTimeout);
    input.signal?.removeEventListener("abort", abortFromCaller);
  };
  const fetchImpl = input.fetchImpl ?? fetch;

  let response: Response;
  let responsePromise: Promise<Response> | null = null;
  try {
    responsePromise = fetchImpl(input.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify(input.body),
      cache: "no-store",
      signal: controller.signal,
    });
    // Persisting the dispatched marker can outlive a fast fetch rejection.
    // Attach both settlement handlers immediately, while still awaiting the
    // original promise below so callers receive the real failure.
    void responsePromise.then(
      (value) => { fetchOutcome = value.ok ? "success" : "upstream_error"; },
      () => { fetchOutcome = "transport_error"; },
    );
    input.onFetchStarted?.();
    await Promise.resolve();
    await input.afterDispatch?.();
    if (callerAbortWon) throw new CompletionStreamCallerAbortError(input.signal?.reason);
    response = await responsePromise;
  } catch (error) {
    const surfacedError = callerAbortWon && !(error instanceof CompletionStreamCallerAbortError)
      ? new CompletionStreamCallerAbortError(input.signal?.reason ?? error)
      : error;
    controller.abort(surfacedError);
    await responsePromise?.catch(() => undefined);
    cleanup();
    throw surfacedError;
  }

  if (!response.ok) {
    cleanup();
    await response.body?.cancel().catch(() => undefined);
    throw new CompletionStreamUpstreamError(response.status);
  }
  if (!response.body) {
    cleanup();
    throw new CompletionStreamUpstreamError(502);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  let didFinish = false;
  let sawContentDelta = false;
  const validated = new ReadableStream<Uint8Array>({
    async pull(output) {
      try {
        while (true) {
          const next = await reader.read();
          if (next.done) {
            cleanup();
            if (!didFinish) {
              output.error(new Error("completion stream closed before DONE"));
            } else {
              output.close();
            }
            return;
          }
          buffer += decoder.decode(next.value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const rawLine of lines) {
            const line = rawLine.replace(/\r$/, "");
            if (line.trim() === "data: [DONE]") {
              if (!sawContentDelta) {
                throw new Error("completion stream ended without answer content");
              }
              didFinish = true;
            } else if (hasCompletionContentDelta(line)) {
              sawContentDelta = true;
            }
            output.enqueue(encoder.encode(`${line}\n`));
          }
          if (lines.length > 0) return;
        }
      } catch (error) {
        cleanup();
        controller.abort(error);
        output.error(error);
      }
    },
    async cancel(reason) {
      cleanup();
      controller.abort(reason);
      await reader.cancel(reason).catch(() => undefined);
    },
  });

  // Do not let an HTTP 200 or an empty [DONE] response cross the billing
  // boundary. Prime through the first real answer delta, then clear the
  // time-to-first-content deadline so it cannot terminate a healthy long
  // stream after the charge has been committed.
  const primedReader = validated.getReader();
  const primedChunks: Uint8Array[] = [];
  try {
    while (!sawContentDelta) {
      const next = await primedReader.read();
      if (next.done) throw new Error("completion stream closed without answer content");
      primedChunks.push(next.value.slice());
    }
    clearTimeout(firstContentTimeout);
  } catch (error) {
    const surfacedError = callerAbortWon && !(error instanceof CompletionStreamCallerAbortError)
      ? new CompletionStreamCallerAbortError(input.signal?.reason ?? error)
      : error;
    await primedReader.cancel(surfacedError).catch(() => undefined);
    cleanup();
    throw surfacedError;
  }

  if (callerAbortWon) {
    const error = new CompletionStreamCallerAbortError(input.signal?.reason);
    await primedReader.cancel(error).catch(() => undefined);
    cleanup();
    throw error;
  }

  return new ReadableStream<Uint8Array>({
    async pull(output) {
      if (primedChunks.length > 0) {
        output.enqueue(primedChunks.shift()!);
        return;
      }
      try {
        const next = await primedReader.read();
        if (next.done) output.close();
        else output.enqueue(next.value);
      } catch (error) {
        output.error(error);
      }
    },
    async cancel(reason) {
      cleanup();
      controller.abort(reason);
      await primedReader.cancel(reason).catch(() => undefined);
    },
  });
}

export async function runBeforeExposingCompletionStream<T>(
  upstream: ReadableStream<Uint8Array>,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    await upstream.cancel(error).catch(() => undefined);
    throw error;
  }
}

/**
 * Forward a completion live while retaining its exact SSE bytes for durable
 * replay. The final two line chunks (normally `data: [DONE]` and its blank
 * separator) are exposed only after the database commit succeeds.
 *
 * The route commits streaming charges before constructing this wrapper.
 * Cancellation and upstream errors therefore close the request as consumed;
 * they do not refund already-incurred model cost or permit the same key to run
 * upstream again. A failed state update is closed by the streaming lease.
 */
export function createDurableCompletionStream(input: {
  upstream: ReadableStream<Uint8Array>;
  maxBytes: number;
  complete: (responseBody: string) => Promise<void>;
  fail: (reason: string) => Promise<void>;
}) {
  const reader = input.upstream.getReader();
  const decoder = new TextDecoder();
  const pending: Uint8Array[] = [];
  let responseBody = "";
  let responseBytes = 0;
  let phase: "active" | "completing" | "completed" | "failing" | "failed" = "active";
  let settlement: Promise<void> | null = null;

  const record = (value: Uint8Array) => {
    responseBytes += value.byteLength;
    if (responseBytes > input.maxBytes) {
      throw new Error("completion stream exceeded persistence limit");
    }
    responseBody += decoder.decode(value, { stream: true });
    pending.push(value.slice());
  };

  const complete = async () => {
    if (phase === "completed") return;
    if (phase === "completing" && settlement) return settlement;
    phase = "completing";
    responseBody += decoder.decode();
    settlement = input.complete(responseBody);
    try {
      await settlement;
      phase = "completed";
    } catch (error) {
      phase = "active";
      settlement = null;
      throw error;
    }
  };

  const fail = async (reason: unknown) => {
    if (phase === "completed" || phase === "failed") return;
    if (phase === "completing" && settlement) {
      await settlement;
      return;
    }
    if (phase === "failing" && settlement) return settlement;
    phase = "failing";
    settlement = input.fail(formatFailureReason(reason));
    try {
      await settlement;
    } finally {
      phase = "failed";
    }
  };

  return new ReadableStream<Uint8Array>({
    async pull(output) {
      try {
        while (pending.length <= 2) {
          const next = await reader.read();
          if (!next.done) {
            record(next.value);
            continue;
          }

          await complete();
          for (const chunk of pending.splice(0)) output.enqueue(chunk);
          output.close();
          return;
        }
        output.enqueue(pending.shift()!);
      } catch (error) {
        await reader.cancel(error).catch(() => undefined);
        await fail(error).catch(() => undefined);
        output.error(error);
      }
    },
    async cancel(reason) {
      await reader.cancel(reason).catch(() => undefined);
      await fail(reason).catch(() => undefined);
    },
  });
}

function formatFailureReason(reason: unknown) {
  if (reason instanceof Error && reason.message) return reason.message.slice(0, 200);
  const text = typeof reason === "string" ? reason : "completion stream cancelled";
  return text.slice(0, 200);
}

function hasCompletionContentDelta(line: string) {
  const match = /^data:\s*(.+)$/.exec(line.trim());
  if (!match || match[1] === "[DONE]") return false;

  try {
    const payload: unknown = JSON.parse(match[1]);
    if (!isRecord(payload) || !Array.isArray(payload.choices)) return false;
    return payload.choices.some((choice) => {
      if (!isRecord(choice) || !isRecord(choice.delta)) return false;
      return typeof choice.delta.content === "string"
        && choice.delta.content.trim().length > 0;
    });
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function throwIfAborted(signal?: AbortSignal) {
  if (!signal?.aborted) return;
  if (signal.reason instanceof Error) throw signal.reason;
  throw new DOMException("Request aborted", "AbortError");
}
