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

export function introducedUnsupportedNumbers(value: string, evidence: string[]) {
  const available = evidence.join(" ").normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, "");
  return (value.match(/\d+(?:[.,]\d+)*/g) || []).some((number) => !available.includes(number.normalize("NFKC").replace(/\D/g, "")));
}
