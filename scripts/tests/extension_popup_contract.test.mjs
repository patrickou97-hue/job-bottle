import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [popup, popupHtml, popupCss, fill, route, rateLimitHelper, syncBridge, fieldCompat] = await Promise.all([
  readFile(new URL("../../browser-extension/starjob-resume-assistant/popup.js", import.meta.url), "utf8"),
  readFile(new URL("../../browser-extension/starjob-resume-assistant/popup.html", import.meta.url), "utf8"),
  readFile(new URL("../../browser-extension/starjob-resume-assistant/popup.css", import.meta.url), "utf8"),
  readFile(new URL("../../browser-extension/starjob-resume-assistant/fill.js", import.meta.url), "utf8"),
  readFile(new URL("../../src/app/api/resume/extension-autofill/route.ts", import.meta.url), "utf8"),
  readFile(new URL("../../src/lib/extension-autofill-rate-limit.ts", import.meta.url), "utf8"),
  readFile(new URL("../../browser-extension/starjob-resume-assistant/sync-bridge.js", import.meta.url), "utf8"),
  readFile(new URL("../../src/lib/extension-autofill-field-compat.ts", import.meta.url), "utf8"),
]);

test("真实 popup 与 Chrome 演示共享同一套面板结构和安全文案", () => {
  assert.match(popupHtml, /assets\/icon48\.png/);
  assert.match(popupHtml, /拾星网申助手/);
  assert.match(popupHtml, /安全模式/);
  assert.match(popupHtml, /id="pageContext"/);
  assert.match(popupHtml, /当前网申页/);
  assert.match(popupHtml, /只填空白项/);
  assert.match(popupHtml, /覆盖已有内容/);
  assert.match(popupHtml, /AI 智能填写/);
  assert.match(popupHtml, /id="prepMeta"/);
  assert.match(popupHtml, /不会填写验证码、密码或敏感声明/);
  assert.match(popupCss, /background: #f1f3f4/);
  assert.match(popupCss, /border-radius: 12px/);
  assert.match(popupCss, /#e8f0fe/);
  assert.match(popupCss, /\.button\s*\{[\s\S]*font-size: 12px/);
  assert.match(popupCss, /\.mode-group label\s*\{[\s\S]*font-size: 9px/);
  assert.match(popup, /renderPageContext/);
  assert.match(popup, /formatApplicationPrep/);
  assert.match(popup, /仍可正常填写/);
  assert.match(popup, /当前选中的/);
  assert.match(popup, /selectedResume\?\.title/);
});

test("网申助手同步时保留网页端选中的当前简历", () => {
  assert.match(syncBridge, /requestedActiveResumeId/);
  assert.match(syncBridge, /message\.activeResumeId/);
  assert.match(syncBridge, /activeResumeId,/);
});
const durableRateMigration = await readFile(
  new URL("../../supabase/migrations/20260810110000_extension_autofill_durable_rate_limit.sql", import.meta.url),
  "utf8",
);
const raisedBatchLimitMigration = await readFile(
  new URL("../../supabase/migrations/20260908160000_raise_extension_autofill_batch_limit.sql", import.meta.url),
  "utf8",
);
const rollingBatchWindowMigration = await readFile(
  new URL("../../supabase/migrations/20260908180000_raise_extension_autofill_rolling_batch_window.sql", import.meta.url),
  "utf8",
);

test("扩展按 frameId 隔离智能字段映射", () => {
  assert.match(popup, /qualifyFrameFieldKey\(frameId, fieldIndex, field\.fieldKey\)/);
  assert.match(popup, /const prefix = `\$\{frameId\}::\$\{fieldIndex\}::`/);
  assert.match(popup, /sourceFieldKey:\s*field\.fieldKey/);
  assert.match(popup, /target:\s*\{ tabId, frameIds: \[frameId\] \}/);
  assert.match(popup, /mappingsByFrame\.get\(entry\.frameId\)\[entry\.rawFieldKey\]/);
  assert.match(popup, /failedFields \+= Object\.keys\(frameMappings\)\.length/);
  assert.match(popup, /const freshResults = await scanStableForm\(tabId, taskSignal, scanAttempts\)/);
  assert.match(popup, /reboundFieldCount/);
  assert.match(popup, /rebindFailedFields/);
});

test("单字段异常不会中断整页并会如实汇总", () => {
  assert.match(fill, /async function fillElementSafely/);
  assert.match(fill, /failed \+= 1/);
  assert.match(fill, /if \(!verified\) failed \+= 1/);
  assert.match(fill, /failed,/);
  assert.match(popup, /部分未完成/);
  assert.match(popup, /页面控件异常写入失败/);
});

test("服务端和扩展统一接受阈值，硬事实优先取简历且叙述字段允许 AI 改写", () => {
  assert.match(popup, /const AI_AUTOFILL_MIN_CONFIDENCE = 0\.68/);
  assert.match(fill, /const AI_AUTOFILL_MIN_CONFIDENCE = 0\.68/);
  assert.match(popup, /Number\(mapping\.confidence\) >= AI_AUTOFILL_MIN_CONFIDENCE/);
  assert.match(fill, /Number\(mapping\.confidence\) >= AI_AUTOFILL_MIN_CONFIDENCE/);
  assert.match(route, /function isHardResumeFactField/);
  const hardFactIndex = route.indexOf("if (isHardResumeFactField(field)");
  const modelMappingIndex = route.indexOf("if (hasUsableModelMapping && recordNarrativeMappingCompatible) return { field, mapping }");
  assert.ok(hardFactIndex >= 0 && modelMappingIndex > hardFactIndex, "姓名、手机号、学校、公司和日期等硬事实必须先取所选简历");
  assert.match(fill, /const preferExactValue = exactStructuredValue !== undefined && isHardExactKey/);
  assert.match(fill, /const selectedValue = preferExactValue[\s\S]*\? exactStructuredValue[\s\S]*: hasAcceptedMapping/);
});

test("重复经历叙述按当前记录裁剪输入并校验返回证据", () => {
  assert.match(popup, /recordNarrativeBatch/);
  assert.match(popup, /resume: sanitizeResumeForAi\(selectedResume, batch\)/);
  assert.match(route, /isAutofillRecordNarrativeMappingCompatible/);
  assert.match(route, /recordNarrativeMappingCompatible/);
  const guardedModelIndex = route.indexOf("if (hasUsableModelMapping && recordNarrativeMappingCompatible)");
  const exactFallbackIndex = route.indexOf("if (exactResumeValue?.value)", guardedModelIndex);
  const recordFallbackIndex = route.indexOf("if (recordDescriptionValue)", guardedModelIndex);
  assert.ok(guardedModelIndex >= 0, "跨记录叙述必须先经过当前记录兼容校验");
  assert.ok(exactFallbackIndex > guardedModelIndex, "校验失败后必须回退到当前记录的精确简历值");
  assert.ok(recordFallbackIndex > exactFallbackIndex, "精确值不可用时必须继续回退到当前记录叙述");
});

test("学校、日期、联系方式和链接使用字段级语义边界", () => {
  assert.match(route, /function isFieldValueSemanticallyCompatible/);
  assert.match(route, /FIELD_VALUE_TYPE_MISMATCH/);
  assert.match(fieldCompat, /education\.school/);
  assert.match(fieldCompat, /project\.url/);
  assert.match(route, /isAutofillFieldValueSemanticallyCompatible/);
  assert.match(route, /if \(property\) \{[\s\S]*collectResumeFacts\(selected\.map/);
  assert.match(fill, /digits\.length === 13 && digits\.startsWith\("86"\)/);
  assert.match(fill, /function getVisualLabelCandidates/);
  assert.match(fill, /function isLikelyPageChromeControl/);
  assert.match(fill, /function isAiValueCompatibleWithPlan/);
});

test("新版批次共享操作额度且旧版请求保持兼容", () => {
  assert.match(popup, /const operationId = createOperationId\(\)/);
  assert.match(popup, /typeof crypto\.randomUUID === "function"/);
  assert.match(popup, /crypto\.getRandomValues\(new Uint8Array\(16\)\)/);
  assert.match(popup, /JSON\.stringify\(\{ resume, fields: batch, formSections, applicationContext, operationId, pageSnapshotId, batchId \}\)/);
  assert.match(route, /operationId:\s*z\.string\(\)\.uuid\(\)\.optional\(\)/);
  assert.match(route, /await takeExtensionAutofillRateSlot\(tokenPayload\.sub, parsed\.data\.operationId\)/);
  assert.match(rateLimitHelper, /p_operation_id:\s*operationId \?\? randomUUID\(\)/);
  assert.match(route, /input\.requestSignal\.addEventListener\("abort", abortForClientDisconnect/);
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
  assert.match(raisedBatchLimitMigration, /batch_count between 1 and 100/);
  assert.match(raisedBatchLimitMigration, /current_batch_count >= 100/);
  assert.match(raisedBatchLimitMigration, /active_operation_count >= 5/);
  assert.match(raisedBatchLimitMigration, /active_batch_count >= 100/);
  assert.match(raisedBatchLimitMigration, /batch 101 observes 100 and fails/);
  assert.match(raisedBatchLimitMigration, /grant execute on function public\.take_extension_autofill_rate_slot\(uuid, uuid\) to service_role/);
  assert.doesNotMatch(raisedBatchLimitMigration, /to anon|to authenticated/);
  assert.match(rollingBatchWindowMigration, /current_batch_count >= 100/);
  assert.match(rollingBatchWindowMigration, /active_batch_count >= 500/);
  assert.match(rollingBatchWindowMigration, /five such operations \(500 batches\)/);
  assert.match(rollingBatchWindowMigration, /grant execute on function public\.take_extension_autofill_rate_slot\(uuid, uuid\) to service_role/);
  assert.doesNotMatch(rollingBatchWindowMigration, /to anon|to authenticated/);
});

test("AI 智能填写按语义和输出预算串行分批，允许 100 批与 1500 字段并拦截陈旧响应", () => {
  assert.match(popup, /const AI_AUTOFILL_BATCH_FIELD_LIMIT = 18/);
  assert.match(popup, /const AI_AUTOFILL_BATCH_BUDGET = 1_700/);
  assert.match(popup, /const AI_AUTOFILL_MAX_BATCHES = 100/);
  assert.match(popup, /const AI_AUTOFILL_MAX_FIELDS = 1_500/);
  assert.doesNotMatch(fill, /\.filter\(\(field\) => !field\.sensitive\)\s*\.slice\(0, 100\)/);
  assert.doesNotMatch(popup, /\)\)\.slice\(0, 100\)/);
  assert.match(popup, /fields\.length > AI_AUTOFILL_MAX_FIELDS/);
  assert.match(popup, /检测到 \$\{fields\.length\} 个安全字段，单页上限为 \$\{AI_AUTOFILL_MAX_FIELDS\} 个/);
  assert.match(popup, /本次未调用 AI，也没有改动页面/);
  assert.match(popup, /function buildSemanticAiBatches\(fields\)/);
  assert.match(popup, /function isLocalExactFallbackField\(field\)/);
  assert.match(popup, /localExactOnly: true/);
  assert.match(popup, /localExactFallbackCount/);
  assert.match(popup, /if \(isNarrativeField\(field\)\)/);
  assert.match(popup, /for \(let index = 0; index < batches\.length; index \+= 1\)/);
  assert.match(popup, /batches\.length > AI_AUTOFILL_MAX_BATCHES/);
  assert.doesNotMatch(popup, /const payloads = await Promise\.all\(batches\.map/);
  assert.match(popup, /activeAiOperationId !== operationId/);
  assert.match(popup, /payload\.pageSnapshotId !== pageSnapshotId/);

  const limitCheckIndex = popup.indexOf('fields.length > AI_AUTOFILL_MAX_FIELDS');
  const operationIdIndex = popup.indexOf('const operationId = createOperationId()');
  const modelCallIndex = popup.indexOf('const payload = await requestAiAutofillBatch({');
  const writeIndex = popup.indexOf('const batchFill = await executeMappedFillProgressively({');
  const allBatchesIndex = popup.indexOf('for (let index = 0; index < batches.length; index += 1)');
  assert.ok(limitCheckIndex >= 0 && limitCheckIndex < operationIdIndex, "1500 字段检查必须早于创建模型操作");
  assert.ok(limitCheckIndex < modelCallIndex, "1500 字段检查必须早于模型调用");
  assert.ok(allBatchesIndex >= 0 && allBatchesIndex < writeIndex, "每批模型结果必须在批次循环内立即写入");
  assert.match(popup, /function executeMappedFillProgressively/);
  assert.match(popup, /return executeMappedFillByFrame\(\{ \.\.\.options, scanAttempts: 1 \}\)/);
  assert.match(popup, /正在写入并回读/);
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

test("1.1.0 使用记录身份、稳定扫描、动态控件和可追溯生成", () => {
  assert.match(fill, /function detectProvider\(\)/);
  assert.match(fill, /data-starjob-field-id/);
  assert.match(fill, /`field-ordinal:\$\{index\}`/);
  assert.match(fill, /pageRecordId/);
  assert.match(fill, /resumePath/);
  assert.match(fill, /FIELD_IDENTITY_COLLISION/);
  assert.match(fill, /function waitForDynamicOptions/);
  assert.match(fill, /function fillDynamicControl/);
  assert.match(fill, /function verifyReadback/);
  assert.match(fill, /formSections: buildFormSections/);
  assert.match(popup, /async function waitForFormStability/);
  assert.match(popup, /new MutationObserver/);
  assert.match(popup, /async function scanStableForm/);
  assert.match(popup, /analysisFingerprint/);
  assert.match(popup, /字段身份发生冲突，本次未写入页面/);
  assert.match(route, /missingAfterRepair/);
  assert.match(popup, /sectionsForBatch/);
  assert.match(route, /grounded_generation/);
  assert.match(route, /evidence/);
  assert.match(route, /applicationContext/);
  assert.match(route, /function deriveExactResumeValue/);
  assert.match(route, /AMBIGUOUS_RECORD/);
  assert.match(route, /aiRawMappingCount/);
  assert.match(route, /validatedMappingCount/);
});

test("日期字段先走日期解析且年月拆分不构造虚假日", () => {
  const datePickerIndex = fill.indexOf("definition.date && !definition.datePart && await tryExactDatePickerSelection");
  const dynamicIndex = fill.indexOf("isDynamicControl(element)", datePickerIndex);
  assert.ok(datePickerIndex >= 0 && dynamicIndex > datePickerIndex, "日期选择必须先于普通动态下拉");
  assert.match(fill, /function inferDatePart/);
  assert.match(fill, /function valueForDatePart/);
  assert.match(fill, /datePart: extractedFields\.find/);
});

test("AI 返回的可忽略格式差异不会让整批安全字段失败", () => {
  assert.match(route, /const mappingSchema = z\.object\(/);
  assert.match(route, /mappings: z\.array\(z\.unknown\(\)\)\.max\(100\)/);
  assert.match(route, /normalizeJsonCandidate\(content\)/);
  assert.match(route, /discardedMalformed/);
  assert.match(route, /finish_reason\?: string \| null/);
  assert.match(route, /\["length", "max_tokens"\]/);
  assert.match(route, /extractPartialOutcomeRows\(content\)/);
  assert.match(route, /normalizeModelOutcomeCandidate\(row\)/);
  assert.match(route, /每个输入 fieldKey 都应返回一次/);
  assert.match(route, /MIN_CONFIDENCE = 0\.68/);
  assert.match(route, /MAX_REPAIR_PASSES = 2/);
  assert.match(route, /pendingGroups/);
  assert.match(route, /repairGroupIndex/);
  assert.match(route, /repair_upstream_error/);
  assert.match(route, /modelCallCount/);
  assert.match(route, /MAX_MODEL_OUTPUT_TOKENS = 5_000/);
  assert.match(route, /MIN_MODEL_OUTPUT_TOKENS = 1_200/);
  assert.match(route, /extension_autofill_model_trace/);
  assert.match(route, /extension_autofill_partial_contract/);
  assert.match(route, /AI_RESPONSE_INCOMPLETE/);
  assert.match(route, /degraded: missingAfterRepair.length > 0/);
  assert.match(route, /isHardBlockedApplicationField\(field\)/);
  assert.match(route, /只返回 JSON/);
});

test("Smart Fill V2 使用候选人知识库、申请上下文与公司适配配置", () => {
  assert.match(route, /简历是候选人的事实与能力证据，不是需要逐字复制的答案库/);
  assert.match(route, /semantic_inference/);
  assert.match(route, /user_preference/);
  assert.match(fill, /function getOpenRoots/);
  assert.match(fill, /function extractApplicationContext/);
  for (const company of ["bytedance", "tencent", "alibaba", "jd", "meituan", "baidu", "pdd", "xiaohongshu", "netease", "bilibili", "xiaomi", "huawei"]) {
    assert.match(fill, new RegExp(`id: "${company}"`));
  }
});
