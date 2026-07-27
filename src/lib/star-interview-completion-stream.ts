export class CompletionStreamUpstreamError extends Error {
  status: number;

  constructor(status: number) {
    super(`Completion stream upstream ${status}`);
    this.status = status;
  }
}

type FetchLike = typeof fetch;

export async function openCompletionSSE(input: {
  url: string;
  apiKey: string;
  body: unknown;
  timeoutMs: number;
  fetchImpl?: FetchLike;
}): Promise<ReadableStream<Uint8Array>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs);
  const cleanup = () => clearTimeout(timeout);
  const fetchImpl = input.fetchImpl ?? fetch;

  let response: Response;
  try {
    response = await fetchImpl(input.url, {
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
  } catch (error) {
    cleanup();
    throw error;
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
  return new ReadableStream<Uint8Array>({
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
              didFinish = true;
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
