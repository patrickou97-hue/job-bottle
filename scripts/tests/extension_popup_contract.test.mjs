import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [popup, fill, route, rateLimitHelper] = await Promise.all([
  readFile(new URL("../../browser-extension/starjob-resume-assistant/popup.js", import.meta.url), "utf8"),
  readFile(new URL("../../browser-extension/starjob-resume-assistant/fill.js", import.meta.url), "utf8"),
  readFile(new URL("../../src/app/api/resume/extension-autofill/route.ts", import.meta.url), "utf8"),
  readFile(new URL("../../src/lib/extension-autofill-rate-limit.ts", import.meta.url), "utf8"),
]);
const durableRateMigration = await readFile(
  new URL("../../supabase/migrations/20260810110000_extension_autofill_durable_rate_limit.sql", import.meta.url),
  "utf8",
);

test("扩展按 frameId 隔离智能字段映射", () => {
  assert.match(popup, /qualifyFrameFieldKey\(frameId, fieldIndex, field\.fieldKey\)/);
  assert.match(popup, /const prefix = `\$\{frameId\}::\$\{fieldIndex\}::`/);
  assert.match(popup, /sourceFieldKey:\s*field\.fieldKey/);
  assert.match(popup, /target:\s*\{ tabId, frameIds: \[frameId\] \}/);
  assert.match(popup, /mappingsByFrame\.get\(address\.frameId\)\[address\.rawFieldKey\]/);
  assert.match(popup, /failedFields \+= Object\.keys\(frameMappings\)\.length/);
});

test("单字段异常不会中断整页并会如实汇总", () => {
  assert.match(fill, /async function fillElementSafely/);
  assert.match(fill, /failed \+= 1/);
  assert.match(fill, /failed,/);
  assert.match(popup, /部分未完成/);
  assert.match(popup, /页面控件异常写入失败/);
});

test("新版批次共享操作额度且旧版请求保持兼容", () => {
  assert.match(popup, /const operationId = createOperationId\(\)/);
  assert.match(popup, /typeof crypto\.randomUUID === "function"/);
  assert.match(popup, /crypto\.getRandomValues\(new Uint8Array\(16\)\)/);
  assert.match(popup, /JSON\.stringify\(\{ resume, fields: batch, operationId \}\)/);
  assert.match(route, /operationId:\s*z\.string\(\)\.uuid\(\)\.optional\(\)/);
  assert.match(route, /await takeExtensionAutofillRateSlot\(tokenPayload\.sub, parsed\.data\.operationId\)/);
  assert.match(rateLimitHelper, /p_operation_id:\s*operationId \?\? randomUUID\(\)/);
  assert.match(route, /request\.signal\.addEventListener\("abort", abortForClientDisconnect/);
  assert.doesNotMatch(route, /__starjobExtensionAutofillRate|operations:\s*new Map/);
  assert.match(durableRateMigration, /pg_advisory_xact_lock/);
  assert.match(durableRateMigration, /extension_autofill_rate_batches/);
  assert.match(durableRateMigration, /batch_count between 1 and 15/);
  assert.match(durableRateMigration, /current_batch_count >= 15/);
  assert.match(durableRateMigration, /active_operation_count >= 5/);
  assert.match(durableRateMigration, /active_batch_count >= 15/);
  assert.match(durableRateMigration, /count\(distinct operation_id\)::integer, count\(\*\)::integer/);
  assert.match(durableRateMigration, /not operation_active and active_operation_count >= 5/);
  assert.match(durableRateMigration, /insert into public\.extension_autofill_rate_batches \(user_id, operation_id\)/);
  assert.match(durableRateMigration, /created_at < now\(\) - interval '10 minutes'/);
  assert.match(durableRateMigration, /operation\.updated_at < now\(\) - interval '7 days'/);
  assert.match(durableRateMigration, /delete from public\.extension_autofill_rate_operations as operation[\s\S]*and not exists/);
  assert.match(durableRateMigration, /batch 15[\s\S]*batch 16 observes 15 and fails/);
  assert.match(durableRateMigration, /grant execute on function public\.take_extension_autofill_rate_slot\(uuid, uuid\) to service_role/);
});

test("AI 智能填写完整处理 750 字段并在超限时先于模型调用停止", () => {
  assert.match(popup, /const AI_AUTOFILL_BATCH_SIZE = 50/);
  assert.match(popup, /const AI_AUTOFILL_MAX_FIELDS = 750/);
  assert.doesNotMatch(fill, /\.filter\(\(field\) => !field\.sensitive\)\s*\.slice\(0, 100\)/);
  assert.doesNotMatch(popup, /\)\)\.slice\(0, 100\)/);
  assert.match(popup, /fields\.length > AI_AUTOFILL_MAX_FIELDS/);
  assert.match(popup, /检测到 \$\{fields\.length\} 个安全字段，单页上限为 \$\{AI_AUTOFILL_MAX_FIELDS\} 个/);
  assert.match(popup, /本次未调用 AI，也没有改动页面/);
  assert.match(popup, /for \(let index = 0; index < fields\.length; index \+= AI_AUTOFILL_BATCH_SIZE\)/);
  assert.match(popup, /const payloads = await Promise\.all\(batches\.map/);

  const limitCheckIndex = popup.indexOf('fields.length > AI_AUTOFILL_MAX_FIELDS');
  const operationIdIndex = popup.indexOf('const operationId = createOperationId()');
  const modelCallIndex = popup.indexOf('const payload = await requestAiAutofillBatch({');
  const writeIndex = popup.indexOf('const aiFill = await executeMappedFillByFrame({');
  const allBatchesIndex = popup.indexOf('const payloads = await Promise.all');
  assert.ok(limitCheckIndex >= 0 && limitCheckIndex < operationIdIndex, "750 字段检查必须早于创建模型操作");
  assert.ok(limitCheckIndex < modelCallIndex, "750 字段检查必须早于模型调用");
  assert.ok(allBatchesIndex >= 0 && allBatchesIndex < writeIndex, "必须等待全部模型批次成功后才写入页面");
});

test("常见网申字段按实习范围和安全边界处理", () => {
  assert.match(fill, /key: "basics\.age"[\s\S]*localExact: true/);
  assert.match(fill, /key: "basics\.gender"/);
  assert.match(fill, /key: "basics\.nationality"/);
  assert.match(fill, /key: "basics\.preferredLocations"/);
  assert.match(fill, /key: "project\.url"/);
  assert.match(fill, /item\?\.experienceType === "internship"/);
  assert.match(fill, /key: "work\.none"[\s\S]*employmentWork\.length === 0/);
  assert.match(fill, /element\.multiple/);
  assert.match(fill, /recordScope: field\.recordScope \|\| null/);
  assert.match(fill, /"file"\]\.includes\(element\.type\)/);
  assert.doesNotMatch(fill, /manualOnlyTerms/);
  assert.match(popup, /"年龄", "周岁", "age"/);
  assert.match(popup, /preferredLocations/);
  assert.match(popup, /experienceType/);
  assert.match(popup, /url: text\(item\.url/);
  assert.match(route, /recordScope: z\.enum\(\["internship", "employment"\]\)/);
  assert.match(route, /getSectionEntries\(resume, section, field\.recordScope\)/);
  assert.match(route, /function deriveAgeValue/);
  assert.match(route, /recordScope=internship/);
});
