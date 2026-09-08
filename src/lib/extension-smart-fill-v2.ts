export type CompletenessReport = {
  requestedCount: number;
  returnedCount: number;
  missingKeys: string[];
  duplicateKeys: string[];
  unexpectedKeys: string[];
  complete: boolean;
};

export function analyzeOutcomeCompleteness(
  expectedKeys: string[],
  rows: Array<{ fieldKey?: unknown }>,
): CompletenessReport {
  const expected = new Set(expectedKeys);
  const seen = new Set<string>();
  const duplicateKeys = new Set<string>();
  const unexpectedKeys = new Set<string>();
  for (const row of rows) {
    const key = typeof row?.fieldKey === "string" ? row.fieldKey : "";
    if (!key || !expected.has(key)) {
      if (key) unexpectedKeys.add(key);
      continue;
    }
    if (seen.has(key)) duplicateKeys.add(key);
    else seen.add(key);
  }
  const missingKeys = expectedKeys.filter((key) => !seen.has(key));
  return {
    requestedCount: expectedKeys.length,
    returnedCount: seen.size,
    missingKeys,
    duplicateKeys: [...duplicateKeys],
    unexpectedKeys: [...unexpectedKeys],
    complete: missingKeys.length === 0 && duplicateKeys.size === 0 && unexpectedKeys.size === 0,
  };
}

export function splitRepairKeys(keys: string[], parseStatus: string) {
  if (parseStatus === "ok" || keys.length < 2) return [keys];
  const middle = Math.ceil(keys.length / 2);
  return [keys.slice(0, middle), keys.slice(middle)].filter((group) => group.length > 0);
}

export function extractPartialOutcomeRows(content: string, maxRows = 100): unknown[] {
  const source = content.trim().slice(0, 500_000);
  const propertyMatch = /"(?:outcomes|mappings)"\s*:/i.exec(source);
  const arrayStart = source.indexOf("[", propertyMatch ? propertyMatch.index + propertyMatch[0].length : 0);
  if (arrayStart < 0) return [];

  const rows: unknown[] = [];
  let objectStart = -1;
  let objectDepth = 0;
  let inString = false;
  let escaped = false;
  for (let index = arrayStart + 1; index < source.length && rows.length < maxRows; index += 1) {
    const character = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') {
      inString = true;
      continue;
    }
    if (character === "{") {
      if (objectDepth === 0) objectStart = index;
      objectDepth += 1;
      continue;
    }
    if (character !== "}" || objectDepth === 0) continue;
    objectDepth -= 1;
    if (objectDepth !== 0 || objectStart < 0) continue;
    const candidate = source.slice(objectStart, index + 1);
    try {
      rows.push(JSON.parse(candidate));
    } catch {
      // A single malformed row is ignored; later complete rows remain usable.
    }
    objectStart = -1;
  }
  return rows;
}

function normalizeFieldKey(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return `f${value}`;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  const match = trimmed.match(/^(?:f|field[_-]?)(\d+)$/i) || trimmed.match(/^(\d+)$/);
  return match ? `f${Number(match[1])}` : trimmed;
}

function normalizeEvidencePath(value: string) {
  return value.trim().replace(/^\$\.?/, "").replace(/^(?:resume\.)?content\./i, "").replace(/^resume\./i, "");
}

export function normalizeModelOutcomeCandidate(row: unknown): unknown {
  if (!row || typeof row !== "object" || Array.isArray(row)) return row;
  const candidate = { ...(row as Record<string, unknown>) };
  candidate.fieldKey = normalizeFieldKey(candidate.fieldKey ?? candidate.field_key ?? candidate.key);

  for (const key of ["value", "displayValue"] as const) {
    const value = candidate[key];
    if (typeof value === "number" || typeof value === "boolean") candidate[key] = String(value);
    else if (Array.isArray(value) && value.every((item) => ["string", "number", "boolean"].includes(typeof item))) {
      candidate[key] = value.map(String).join("、");
    } else if (value !== null && value !== undefined && typeof value !== "string") candidate[key] = null;
  }
  if (typeof candidate.confidence === "string") {
    const parsed = Number(candidate.confidence.trim().replace(/%$/, ""));
    if (Number.isFinite(parsed)) candidate.confidence = parsed > 1 && parsed <= 100 ? parsed / 100 : parsed;
  }
  if (typeof candidate.confidence === "number" && candidate.confidence > 1 && candidate.confidence <= 100) candidate.confidence /= 100;
  if (typeof candidate.confidence === "number" && (candidate.confidence < 0 || candidate.confidence > 1)) delete candidate.confidence;
  if (typeof candidate.evidence === "string" && candidate.evidence.trim()) candidate.evidence = [normalizeEvidencePath(candidate.evidence)];
  else if (Array.isArray(candidate.evidence)) candidate.evidence = candidate.evidence.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map(normalizeEvidencePath);
  else if (candidate.evidence !== undefined) delete candidate.evidence;
  if (typeof candidate.source === "string" && candidate.source.trim()) {
    const sourcePath = normalizeEvidencePath(candidate.source);
    candidate.source = { type: "resume", path: sourcePath };
    if (!candidate.evidence) candidate.evidence = [sourcePath];
  } else if (candidate.source && typeof candidate.source === "object" && !Array.isArray(candidate.source)) {
    const rawSource = candidate.source as Record<string, unknown>;
    const sourcePath = typeof rawSource.path === "string" ? normalizeEvidencePath(rawSource.path) : null;
    const sourceType = ["resume", "derived", "application_context"].includes(String(rawSource.type)) ? rawSource.type : "resume";
    candidate.source = { type: sourceType, path: sourcePath };
    if (!candidate.evidence && sourcePath) candidate.evidence = [sourcePath];
  }

  const statusAliases: Record<string, string> = {
    answer: "answered", answered: "answered", fill: "answered", filled: "answered", success: "answered",
    manual: "manual", review: "manual", manual_review: "manual", needs_review: "manual", "人工确认": "manual", "需人工确认": "manual", "无法填写": "manual",
    skip: "skip", skipped: "skip", ignored: "skip", "跳过": "skip", "不填写": "skip",
  };
  const actionAliases: Record<string, string> = {
    answer: "fill", input: "fill", write: "fill", filled: "fill",
    choose: "select", choice: "select", checkbox: "check",
    review: "manual", manual_review: "manual", skipped: "skip", ignored: "skip",
  };
  if (typeof candidate.status === "string") candidate.status = statusAliases[candidate.status.trim().toLowerCase()] || candidate.status;
  if (typeof candidate.action === "string") candidate.action = actionAliases[candidate.action.trim().toLowerCase()] || candidate.action;
  if (candidate.status !== undefined && !["answered", "manual", "skip"].includes(String(candidate.status))) delete candidate.status;
  if (candidate.action !== undefined && !["fill", "select", "check", "generate", "manual", "skip"].includes(String(candidate.action))) delete candidate.action;

  const basisAliases: Record<string, string> = {
    fact: "exact_fact", resume_fact: "exact_fact", exact: "exact_fact",
    normalized: "normalized_fact", inference: "semantic_inference",
    generated: "grounded_generation", generation: "grounded_generation", preference: "user_preference",
  };
  if (typeof candidate.basis === "string") candidate.basis = basisAliases[candidate.basis.trim().toLowerCase()] || candidate.basis;
  if (candidate.basis !== null && candidate.basis !== undefined && !["resume", "exact_fact", "normalized_fact", "derived", "semantic_inference", "grounded_generation", "user_preference"].includes(String(candidate.basis))) delete candidate.basis;
  if ((candidate.confidence === null || candidate.confidence === undefined) && candidate.basis) candidate.confidence = 0.72;
  if (candidate.intent !== undefined && !["identity", "contact", "education", "experience", "project", "skill", "preference", "eligibility", "motivation", "self_summary", "open_question", "sensitive", "unknown"].includes(String(candidate.intent))) candidate.intent = "unknown";
  if (typeof candidate.needsReview === "string") candidate.needsReview = candidate.needsReview.trim().toLowerCase() === "true";
  if (typeof candidate.optionMatch === "string" && candidate.optionMatch.trim()) {
    candidate.optionMatch = { strategy: "normalized", targetText: candidate.optionMatch.trim() };
  } else if (candidate.optionMatch !== null && candidate.optionMatch !== undefined && (typeof candidate.optionMatch !== "object" || Array.isArray(candidate.optionMatch))) {
    delete candidate.optionMatch;
  }
  if (candidate.source !== null && candidate.source !== undefined && (typeof candidate.source !== "object" || Array.isArray(candidate.source))) delete candidate.source;

  if (["manual", "skip"].includes(String(candidate.status))) {
    candidate.action = candidate.status;
    candidate.value = null;
  }
  return candidate;
}

export function introducedUnsupportedNumbers(value: string, evidence: string[]) {
  const available = evidence.join(" ").normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, "");
  return (value.match(/\d+(?:[.,]\d+)*/g) || []).some((number) => !available.includes(number.normalize("NFKC").replace(/\D/g, "")));
}
