import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const source = await readFile(
  new URL("src/components/admin/AdminBillingClient.tsx", root),
  "utf8",
);

test("余额发放在首次确认时按标准化请求固定操作编号", () => {
  assert.match(source, /pendingOperationKeysRef = useRef\(new Map<string, PendingGrantOperation>\(\)\)/);
  assert.match(source, /recipient: mode === "batch" \? "all" : selectedUser!\.id/);
  assert.match(source, /amountFen: Math\.round\(amount \* 100\)/);
  assert.match(source, /reason: reason\.trim\(\)/);
  assert.match(source, /const operationFingerprint = JSON\.stringify\(normalizedGrant\)/);
  assert.ok(
    source.indexOf("getOrCreatePendingGrantOperation(")
      < source.indexOf("if (!confirming)"),
    "operation key must be fixed before the second-click confirmation boundary",
  );
  assert.equal((source.match(/globalThis\.crypto\.randomUUID\(\)/g) ?? []).length, 1);
  assert.doesNotMatch(source, /idempotencyKey:\s*crypto\.randomUUID\(\)/);
});

test("失败或响应不完整保留操作编号，只有确认成功后才释放", () => {
  assert.match(source, /if \(!response\.ok\)[\s\S]*?沿用同一操作编号/);
  assert.match(source, /if \(!isConfirmedGrantResponse\(payload\)\)[\s\S]*?沿用同一操作编号/);
  assert.ok(
    source.indexOf("await clearPendingGrantOperation(pendingOperation")
      > source.indexOf("if (!isConfirmedGrantResponse(payload))"),
    "operation key must only be released after a confirmed response",
  );
  assert.match(source, /memory\.get\(operation\.fingerprint\)\?\.idempotencyKey === operation\.idempotencyKey/);
  assert.match(source, /persisted\?\.idempotencyKey === operation\.idempotencyKey[\s\S]*?removePersistedGrantOperation/);
});

test("同一时刻只允许一个余额发放请求", () => {
  assert.match(source, /if \(submitInFlightRef\.current\) return;/);
  assert.match(source, /submitInFlightRef\.current = true;[\s\S]*?await fetch\("\/api\/admin\/star-interview-balance"/);
  assert.match(source, /finally \{[\s\S]*?submitInFlightRef\.current = false;/);
});

test("未确认的操作编号以摘要索引跨刷新和标签页保留 24 小时", () => {
  assert.match(source, /OPERATION_KEY_TTL_MS = 24 \* 60 \* 60 \* 1_000/);
  assert.match(source, /crypto\.subtle\.digest\(\s*"SHA-256"/);
  assert.match(source, /OPERATION_KEY_STORAGE_PREFIX\}\$\{digest\}/);
  assert.match(source, /window\.localStorage/);
  assert.match(source, /navigator\.locks\.request/);
  assert.match(source, /JSON\.stringify\(\{\s*idempotencyKey: operation\.idempotencyKey,\s*expiresAt: operation\.expiresAt,\s*\}\)/);
  assert.doesNotMatch(source, /storage\.setItem\([^\n]+fingerprint/);
});

test("SSR、旧浏览器或存储异常会安全退回内存操作编号", () => {
  assert.match(source, /typeof window === "undefined"/);
  assert.match(source, /typeof navigator === "undefined"/);
  assert.match(source, /typeof globalThis\.crypto\?\.subtle === "undefined"/);
  assert.match(source, /catch \{\s*return false;\s*\}/);
  assert.match(source, /return storageKey\s*\? withOperationStorageLock\(storageKey, resolveOperation\)\s*:\s*resolveOperation\(\)/);
});
