type UnknownRecord = Record<string, unknown>;

export function assertValidCompletionPayload(payload: unknown): asserts payload is UnknownRecord {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) {
    throw new Error("completion upstream returned an invalid payload");
  }

  const hasAnswer = payload.choices.some((choice) => {
    if (!isRecord(choice) || !isRecord(choice.message)) return false;
    return typeof choice.message.content === "string"
      && choice.message.content.trim().length > 0;
  });

  if (!hasAnswer) {
    throw new Error("completion upstream returned an empty answer");
  }
}

export function hasCompletionContentDelta(line: string) {
  const match = /^data:\s*(.+)$/.exec(line.trim());
  if (!match || match[1] === "[DONE]") return false;

  try {
    const payload: unknown = JSON.parse(match[1]);
    if (!isRecord(payload) || !Array.isArray(payload.choices)) return false;
    return payload.choices.some((choice) => {
      if (!isRecord(choice) || !isRecord(choice.delta)) return false;
      return typeof choice.delta.content === "string"
        && choice.delta.content.length > 0;
    });
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
