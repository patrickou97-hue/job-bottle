const STARJOB_HOME = "https://www.starjob.space";
const SMART_MATCH_TIMEOUT_MS = 9_000;
const SMART_MATCH_MAX_FIELDS = 12;
const AI_AUTOFILL_TIMEOUT_MS = 85_000;
const AI_AUTOFILL_BATCH_SIZE = 50;
const AI_AUTOFILL_MAX_FIELDS = 750;
const CONFIRM_WINDOW_MS = 8_000;
const STORAGE_KEYS = ["starjobResumes", "activeResumeId", "fillMode", "lastSyncedAt", "matchToken", "matchTokenExpiresAt", "aiMatchingAvailable", "analysisOnly", "aiOnly", "aiFieldMappings", "aiAutofillOnly", "aiValueMappings"];

const elements = {
  emptyState: document.querySelector("#emptyState"),
  readyState: document.querySelector("#readyState"),
  resumeSelect: document.querySelector("#resumeSelect"),
  fillButton: document.querySelector("#fillButton"),
  modeHint: document.querySelector("#modeHint"),
  syncMeta: document.querySelector("#syncMeta"),
  resultPanel: document.querySelector("#resultPanel"),
  resultTitle: document.querySelector("#resultTitle"),
  resultText: document.querySelector("#resultText"),
  unmatchedDetails: document.querySelector("#unmatchedDetails"),
  unmatchedList: document.querySelector("#unmatchedList"),
  progressPanel: document.querySelector("#progressPanel"),
  progressAnnouncement: document.querySelector("#progressAnnouncement"),
  progressElapsed: document.querySelector("#progressElapsed"),
  progressLabel: document.querySelector("#progressLabel"),
  progressValue: document.querySelector("#progressValue"),
  progressMeter: document.querySelector("#progressMeter"),
  progressMeterFill: document.querySelector("#progressMeterFill"),
  openSync: document.querySelector("#openSync"),
  openSyncFromEmpty: document.querySelector("#openSyncFromEmpty"),
  openGuide: document.querySelector("#openGuide"),
  clearData: document.querySelector("#clearData"),
};

let overwriteConfirmationExpiresAt = 0;
let overwriteConfirmationTimer = null;
let clearConfirmationExpiresAt = 0;
let clearConfirmationTimer = null;
let activeFillAbortController = null;
let progressStartedAt = 0;
let progressClockTimer = null;
let lastProgressAnnouncement = "";

const progressDefaults = {
  extract: "等待开始",
  match: "等待字段清单",
  fill: "等待匹配结果",
  summary: "等待填写完成",
};

function resetProgress() {
  elements.progressPanel.hidden = false;
  lastProgressAnnouncement = "";
  elements.progressAnnouncement.textContent = "";
  for (const [step, text] of Object.entries(progressDefaults)) updateProgress(step, "pending", text);
  startProgressClock();
  updateTaskProgress(0, 0, "准备读取页面");
}

function updateProgress(step, status, text) {
  const row = elements.progressPanel.querySelector(`[data-step="${step}"]`);
  if (!row) return;
  row.dataset.status = status;
  row.querySelector("p").textContent = text;
}

function startProgressClock() {
  stopProgressClock();
  progressStartedAt = Date.now();
  elements.progressElapsed.textContent = "已用时 0 秒";
  progressClockTimer = window.setInterval(() => {
    const elapsedSeconds = Math.floor((Date.now() - progressStartedAt) / 1_000);
    elements.progressElapsed.textContent = elapsedSeconds < 60
      ? `已用时 ${elapsedSeconds} 秒`
      : `已用时 ${Math.floor(elapsedSeconds / 60)} 分 ${String(elapsedSeconds % 60).padStart(2, "0")} 秒`;
  }, 1_000);
}

function stopProgressClock() {
  if (progressClockTimer) window.clearInterval(progressClockTimer);
  progressClockTimer = null;
}

function updateTaskProgress(completed, total, label) {
  const determinate = Number.isFinite(total) && total > 0;
  const safeCompleted = determinate ? Math.min(total, Math.max(0, completed)) : 0;
  const percent = determinate ? Math.round((safeCompleted / total) * 100) : null;
  elements.progressLabel.textContent = label;
  elements.progressValue.textContent = percent === null ? "处理中" : `${percent}%`;
  elements.progressMeter.dataset.mode = determinate ? "determinate" : "indeterminate";
  elements.progressMeter.setAttribute("aria-valuetext", determinate ? `已完成 ${safeCompleted} / ${total} 个处理单元` : label);
  const announcement = determinate
    ? `${label}，已完成 ${safeCompleted} / ${total} 个处理单元`
    : label;
  if (announcement !== lastProgressAnnouncement) {
    lastProgressAnnouncement = announcement;
    elements.progressAnnouncement.textContent = announcement;
  }
  if (determinate) {
    elements.progressMeter.setAttribute("aria-valuemin", "0");
    elements.progressMeter.setAttribute("aria-valuemax", "100");
    elements.progressMeter.setAttribute("aria-valuenow", String(percent));
    elements.progressMeterFill.style.transform = `scaleX(${safeCompleted / total})`;
  } else {
    elements.progressMeter.removeAttribute("aria-valuemin");
    elements.progressMeter.removeAttribute("aria-valuemax");
    elements.progressMeter.removeAttribute("aria-valuenow");
    elements.progressMeterFill.style.removeProperty("transform");
  }
}

function openPage(path) {
  void chrome.tabs.create({ url: `${STARJOB_HOME}${path}` });
}

function showResult(title, text, tone = "success", unmatchedFields = []) {
  elements.resultTitle.textContent = title;
  elements.resultText.textContent = text;
  elements.resultPanel.dataset.tone = tone;
  elements.resultPanel.hidden = false;
  const fields = [...new Set(unmatchedFields.map((field) => String(field || "").trim()).filter(Boolean))].slice(0, 8);
  elements.unmatchedList.replaceChildren(...fields.map((field) => {
    const item = document.createElement("li");
    item.textContent = field;
    return item;
  }));
  elements.unmatchedDetails.hidden = fields.length === 0;
  elements.unmatchedDetails.open = false;
}

function selectedFillMode() {
  const value = document.querySelector('input[name="fillMode"]:checked')?.value;
  return ["merge", "overwrite", "ai"].includes(value) ? value : "merge";
}

function resetOverwriteConfirmation() {
  overwriteConfirmationExpiresAt = 0;
  if (overwriteConfirmationTimer) window.clearTimeout(overwriteConfirmationTimer);
  overwriteConfirmationTimer = null;
  const mode = selectedFillMode();
  elements.modeHint.dataset.tone = mode === "overwrite" ? "warning" : mode === "ai" ? "ai" : "neutral";
  elements.modeHint.textContent = mode === "overwrite"
    ? "覆盖模式会替换页面已有内容，填写前需要再次确认。"
    : mode === "ai"
      ? "AI 会从页面顶部开始，按每条记录和字段顺序逐项填写；经历描述与日期只使用对应记录。"
      : "默认只填写空白项，不会改动你已经输入的内容。";
  if (!elements.fillButton.disabled) {
    elements.fillButton.textContent = mode === "ai" ? "AI 智能填写当前页面" : "一键填写当前页面";
  }
  if (elements.resultTitle.textContent === "请确认覆盖") elements.resultPanel.hidden = true;
}

function armOverwriteConfirmation() {
  overwriteConfirmationExpiresAt = Date.now() + CONFIRM_WINDOW_MS;
  elements.modeHint.dataset.tone = "warning";
  elements.modeHint.textContent = "请确认：下一次点击会覆盖当前页面已有内容。";
  elements.fillButton.textContent = "再次点击，确认覆盖并填写";
  showResult("请确认覆盖", "为了避免丢失你已经填写的内容，请再次点击上方按钮。", "warning");
  if (overwriteConfirmationTimer) window.clearTimeout(overwriteConfirmationTimer);
  overwriteConfirmationTimer = window.setTimeout(resetOverwriteConfirmation, CONFIRM_WINDOW_MS);
}

function resetClearConfirmation() {
  clearConfirmationExpiresAt = 0;
  if (clearConfirmationTimer) window.clearTimeout(clearConfirmationTimer);
  clearConfirmationTimer = null;
  elements.clearData.textContent = "清除本地数据";
  if (elements.resultTitle.textContent === "确认清除本地数据") elements.resultPanel.hidden = true;
}

function armClearConfirmation() {
  clearConfirmationExpiresAt = Date.now() + CONFIRM_WINDOW_MS;
  elements.clearData.textContent = "再次点击确认清除";
  showResult("确认清除本地数据", "这会删除扩展中已同步的所有简历，不会删除拾星网站中的云端简历。", "warning");
  if (clearConfirmationTimer) window.clearTimeout(clearConfirmationTimer);
  clearConfirmationTimer = window.setTimeout(resetClearConfirmation, CONFIRM_WINDOW_MS);
}

function formatSyncTime(value) {
  if (!value) return "简历只保存在当前浏览器";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "简历只保存在当前浏览器";
  return `上次同步 ${date.toLocaleString("zh-CN", { hour12: false })}`;
}

function friendlyFillError(error, abortReason) {
  const message = error instanceof Error ? error.message : "";
  if (error instanceof DOMException && error.name === "AbortError") {
    return abortReason === "cancelled"
      ? "本次填写已取消，页面原有内容没有改动。"
      : "AI 单批分析超过 85 秒，本次没有改动页面，请稍后重试。";
  }
  if (/cannot access|cannot read|could not establish|context invalidated|no tab with id/i.test(message)) {
    return "扩展与当前页面的连接已失效，请刷新网申页后重试。";
  }
  return /[\u3400-\u9fff]/.test(message)
    ? message
    : "当前页面暂时无法填写，请刷新网申页后重试。";
}

function throwIfAborted(signal) {
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
}

function createOperationId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

async function requestAiAutofillBatch({ batch, resume, token, operationId, taskSignal }) {
  const controller = new AbortController();
  const cancelFromTask = () => controller.abort(taskSignal.reason || "cancelled");
  taskSignal.addEventListener("abort", cancelFromTask, { once: true });
  const timeout = window.setTimeout(() => controller.abort("timeout"), AI_AUTOFILL_TIMEOUT_MS);
  try {
    const response = await fetch(`${STARJOB_HOME}/api/resume/extension-autofill`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ resume, fields: batch, operationId }),
      cache: "no-store",
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "AI 智能填写暂时不可用");
    return payload;
  } finally {
    window.clearTimeout(timeout);
    taskSignal.removeEventListener("abort", cancelFromTask);
  }
}

function summarizeFrameResults(frameResults) {
  return frameResults.map((entry) => entry.result).filter(Boolean).reduce(
    (acc, item) => ({
      scanned: acc.scanned + (item.scanned || 0),
      matched: acc.matched + (item.matched || 0),
      filled: acc.filled + (item.filled || 0),
      preserved: acc.preserved + (item.preserved || 0),
      empty: acc.empty + (item.empty || 0),
      manual: acc.manual + (item.manual || 0),
      derived: acc.derived + (item.derived || 0),
      failed: acc.failed + (item.failed || 0),
      unmatched: [...acc.unmatched, ...(Array.isArray(item.unmatched) ? item.unmatched : [])],
    }),
    { scanned: 0, matched: 0, filled: 0, preserved: 0, empty: 0, manual: 0, derived: 0, failed: 0, unmatched: [] },
  );
}

function qualifyFrameFieldKey(frameId, fieldIndex, fieldKey) {
  // Put the two uniqueness dimensions before any truncation. Long ATS paths
  // can exceed the server key limit; truncating only the tail must never erase
  // the candidate index and collapse two controls into one mapping.
  const prefix = `${frameId}::${fieldIndex}::`;
  return `${prefix}${String(fieldKey).slice(0, 520 - prefix.length)}`;
}

async function executeMappedFillByFrame({
  tabId,
  frameIds,
  mappings,
  fieldAddressByQualifiedKey,
  storageState,
  mappingStorageKey,
}) {
  const mappingsByFrame = new Map(frameIds.map((frameId) => [frameId, {}]));
  for (const [qualifiedKey, mapping] of Object.entries(mappings)) {
    const address = fieldAddressByQualifiedKey.get(qualifiedKey);
    if (!address) continue;
    mappingsByFrame.get(address.frameId)[address.rawFieldKey] = mapping;
  }

  const results = [];
  let failedFrames = 0;
  let failedFields = 0;
  for (const frameId of frameIds) {
    const frameMappings = mappingsByFrame.get(frameId) || {};
    await chrome.storage.local.set({
      ...storageState,
      [mappingStorageKey]: frameMappings,
    });
    try {
      results.push(...await chrome.scripting.executeScript({
        target: { tabId, frameIds: [frameId] },
        files: ["fill.js"],
      }));
    } catch (error) {
      failedFrames += 1;
      failedFields += Object.keys(frameMappings).length;
      console.warn("[starjob_fill_frame_failed]", {
        frameId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { results, failedFrames, failedFields };
}

function sanitizeResumeForAi(resume, fields) {
  const content = resume?.content || {};
  const basics = content.basics || {};
  const text = (value) => typeof value === "string" ? value : "";
  const bullets = (value) => Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
  const mapEntries = (value, mapper) => Array.isArray(value) ? value.map(mapper) : [];
  const customEntry = (item = {}) => ({
    title: text(item.title),
    role: text(item.role),
    date: text(item.date),
    bullets: bullets(item.bullets),
  });
  const normalizeDescriptor = (value) => String(value ?? "").normalize("NFKC").toLowerCase().replace(/[\s\-_./\\:：,，()（）\[\]【】{}<>《》?？*]+/g, "");
  const includeBirthDate = Array.isArray(fields) && fields.some((field) => {
    const descriptor = normalizeDescriptor(`${field?.label || ""} ${field?.attributes || ""} ${field?.context || ""}`);
    const rawDescriptor = `${field?.label || ""} ${field?.attributes || ""} ${field?.context || ""}`;
    return ["出生日期", "出生年月", "生日", "birthdate", "dateofbirth", "年龄", "周岁", "age"].some((term) => descriptor.includes(normalizeDescriptor(term)))
      || /(?:^|[^a-z])dob(?:[^a-z]|$)/i.test(rawDescriptor);
  });

  return {
    title: text(resume?.title),
    targetRole: text(resume?.targetRole),
    jobTarget: text(resume?.jobTarget),
    templateId: text(resume?.templateId),
    content: {
      basics: {
        name: text(basics.name),
        englishName: text(basics.englishName),
        birthDate: includeBirthDate ? text(basics.birthDate) : "",
        gender: text(basics.gender),
        nationality: text(basics.nationality),
        preferredLocations: text(basics.preferredLocations),
        phone: text(basics.phone),
        email: text(basics.email),
        city: text(basics.city),
        linkedin: text(basics.linkedin),
        github: text(basics.github),
        website: text(basics.website),
        targetRole: text(basics.targetRole),
      },
      education: mapEntries(content.education, (item = {}) => ({
        school: text(item.school), degree: text(item.degree), major: text(item.major),
        startDate: text(item.startDate), endDate: text(item.endDate), gpa: text(item.gpa),
        courses: text(item.courses), honors: text(item.honors),
      })),
      work: mapEntries(content.work, (item = {}) => ({
        experienceType: ["internship", "employment", "other"].includes(item.experienceType) ? item.experienceType : "other",
        company: text(item.company), title: text(item.title), location: text(item.location),
        startDate: text(item.startDate), endDate: text(item.endDate), current: item.current === true,
        bullets: bullets(item.bullets),
      })),
      projects: mapEntries(content.projects, (item = {}) => ({
        name: text(item.name), role: text(item.role), url: text(item.url), startDate: text(item.startDate),
        endDate: text(item.endDate), bullets: bullets(item.bullets), keywords: text(item.keywords),
      })),
      skills: mapEntries(content.skills, (item = {}) => ({
        category: text(item.category),
        skills: Array.isArray(item.skills) ? item.skills.filter((skill) => typeof skill === "string") : [],
      })),
      campus: mapEntries(content.campus, customEntry),
      awards: mapEntries(content.awards, customEntry),
      certifications: mapEntries(content.certifications, customEntry),
      languages: mapEntries(content.languages, customEntry),
      customSections: mapEntries(content.customSections, customEntry),
    },
  };
}

async function render() {
  const stored = await chrome.storage.local.get(STORAGE_KEYS);
  const resumes = Array.isArray(stored.starjobResumes) ? stored.starjobResumes : [];
  const activeId = resumes.some((resume) => resume.id === stored.activeResumeId)
    ? stored.activeResumeId
    : resumes[0]?.id;

  elements.emptyState.hidden = resumes.length > 0;
  elements.readyState.hidden = resumes.length === 0;
  elements.resultPanel.hidden = true;
  elements.progressPanel.hidden = true;
  elements.resumeSelect.replaceChildren();

  for (const resume of resumes) {
    const option = document.createElement("option");
    option.value = resume.id;
    option.textContent = resume.targetRole
      ? `${resume.title || "未命名简历"} - ${resume.targetRole}`
      : resume.title || "未命名简历";
    option.selected = resume.id === activeId;
    elements.resumeSelect.append(option);
  }

  const selectedMode = ["merge", "overwrite", "ai"].includes(stored.fillMode) ? stored.fillMode : "merge";
  document.querySelector(`input[name="fillMode"][value="${selectedMode}"]`).checked = true;
  elements.syncMeta.textContent = formatSyncTime(stored.lastSyncedAt);
  resetOverwriteConfirmation();
  resetClearConfirmation();
}

async function fillCurrentPage() {
  const fillMode = selectedFillMode();
  if (fillMode === "overwrite" && overwriteConfirmationExpiresAt < Date.now()) {
    armOverwriteConfirmation();
    return;
  }
  resetOverwriteConfirmation();
  if (!globalThis.chrome?.tabs?.query || !globalThis.chrome?.scripting?.executeScript || !globalThis.chrome?.storage?.local) {
    showResult("请从浏览器工具栏打开扩展", "当前是界面预览，实际填写需要在 Chrome 或 Edge 的扩展菜单中打开拾星网申助手。", "warning");
    return;
  }
  const taskController = new AbortController();
  activeFillAbortController = taskController;
  elements.fillButton.disabled = fillMode !== "ai";
  elements.fillButton.textContent = fillMode === "ai" ? "停止本次智能填写" : "正在逐项分析";
  elements.resultPanel.hidden = true;
  resetProgress();
  updateProgress("extract", "loading", "正在读取可见表单字段");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url || /^(chrome|edge|about|chrome-extension):/.test(tab.url)) {
      throw new Error("当前页面不允许扩展填写，请打开企业网申页面后重试。");
    }

    const activeResumeId = elements.resumeSelect.value;
    await chrome.storage.local.set({
      activeResumeId,
      fillMode,
      analysisOnly: true,
      aiOnly: false,
      aiFieldMappings: {},
      aiAutofillOnly: false,
      aiValueMappings: {},
    });

    const analysisResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      files: ["fill.js"],
    });
    throwIfAborted(taskController.signal);
    const analyses = analysisResults
      .filter((entry) => entry.result)
      .map((entry) => ({ frameId: entry.frameId, result: entry.result }));
    const fields = analyses.flatMap(({ frameId, result }) => (
      Array.isArray(result.fields)
        ? result.fields.map((field, fieldIndex) => ({
            ...field,
            fieldKey: qualifyFrameFieldKey(frameId, fieldIndex, field.fieldKey),
            sourceFieldKey: field.fieldKey,
            sourceFrameId: frameId,
          }))
        : []
    ));
    const fieldAddressByQualifiedKey = new Map(fields.map((field) => [field.fieldKey, {
      frameId: field.sourceFrameId,
      rawFieldKey: field.sourceFieldKey,
    }]));
    const frameIds = [...new Set(analyses.map((entry) => entry.frameId))];
    const extracted = analyses.reduce((sum, entry) => sum + (entry.result.scanned || 0), 0);
    const locallyIdentified = analyses.reduce((sum, entry) => sum + (entry.result.identified || 0), 0);
    const smartMatchFields = fields
      .filter((field) => !field.deterministicKey || Number(field.deterministicConfidence) < 0.74)
      .slice(0, SMART_MATCH_MAX_FIELDS);
    updateProgress("extract", "success", `共提取 ${extracted} 个可见字段`);
    updateTaskProgress(1, 4, `已读取 ${extracted} 个可见字段`);

    if (extracted === 0) {
      updateProgress("match", "fallback", "当前页面没有可分析字段");
      updateProgress("fill", "fallback", "当前页面没有可填写字段");
      updateProgress("summary", "success", "请进入具体网申表单后重试");
      showResult("没有找到可填写表单", "请进入网申填写页后重试。部分验证码或封闭组件需要手动处理。", "error");
      return;
    }

    if (fillMode === "ai" && fields.length > AI_AUTOFILL_MAX_FIELDS) {
      const limitMessage = `检测到 ${fields.length} 个安全字段，单页上限为 ${AI_AUTOFILL_MAX_FIELDS} 个`;
      updateProgress("match", "fallback", `${limitMessage}，未调用 AI`);
      updateProgress("fill", "fallback", "本次没有写入页面");
      updateProgress("summary", "fallback", "请分步骤填写或收起部分表单区块后重试");
      updateTaskProgress(1, 4, `${limitMessage}，本次已停止`);
      showResult(
        "表单字段过多，未开始填写",
        `${limitMessage}。本次未调用 AI，也没有改动页面。请分步骤填写或收起部分表单区块后重试。`,
        "error",
      );
      return;
    }

    if (fillMode === "ai") {
      updateProgress("match", "loading", `正在让 AI 从上到下处理 ${fields.length} 个安全字段`);
      const stored = await chrome.storage.local.get(["starjobResumes", "matchToken", "matchTokenExpiresAt", "aiMatchingAvailable"]);
      const selectedResume = (Array.isArray(stored.starjobResumes) ? stored.starjobResumes : [])
        .find((resume) => resume.id === activeResumeId);
      const tokenValid = stored.matchToken
        && (!stored.matchTokenExpiresAt || new Date(stored.matchTokenExpiresAt).getTime() > Date.now());
      if (!selectedResume?.content) throw new Error("没有找到所选简历，请重新同步后再试。");
      if (!stored.aiMatchingAvailable || !tokenValid) throw new Error("AI 智能填写需要重新同步简历，请返回拾星同步后再试。");

      const aiValueMappings = {};
      let acceptedMappings = 0;
      const sanitizedResume = sanitizeResumeForAi(selectedResume, fields);
      const batches = [];
      for (let index = 0; index < fields.length; index += AI_AUTOFILL_BATCH_SIZE) {
        batches.push(fields.slice(index, index + AI_AUTOFILL_BATCH_SIZE));
      }
      const totalTaskUnits = batches.length + 3;
      const operationId = createOperationId();
      updateTaskProgress(1, totalTaskUnits, `已拆分为 ${batches.length} 批，正在并行分析`);
      let completedBatches = 0;
      const payloads = await Promise.all(batches.map(async (batch) => {
        try {
          const payload = await requestAiAutofillBatch({
            batch,
            resume: sanitizedResume,
            token: stored.matchToken,
            operationId,
            taskSignal: taskController.signal,
          });
          completedBatches += 1;
          updateProgress("match", "loading", `已完成 ${completedBatches}/${batches.length} 批，全部成功后再填写页面`);
          updateTaskProgress(1 + completedBatches, totalTaskUnits, `已完成 ${completedBatches}/${batches.length} 批字段分析`);
          return payload;
        } catch (error) {
          if (!taskController.signal.aborted) taskController.abort("batch_failed");
          throw error;
        }
      }));
      for (const payload of payloads) {
        for (const mapping of payload.mappings || []) {
          if (mapping?.fieldKey && typeof mapping.value === "string" && mapping.value.trim()
            && ["resume", "derived"].includes(mapping.basis) && Number(mapping.confidence) >= 0.82) {
            aiValueMappings[mapping.fieldKey] = {
              value: mapping.value.trim(),
              confidence: Number(mapping.confidence),
              basis: mapping.basis,
            };
            acceptedMappings += 1;
          }
        }
      }
      updateProgress("match", "success", `所有批次成功后，AI 找到 ${acceptedMappings} 个有简历依据的值`);
      updateProgress("fill", "loading", "正在按页面顺序填写并选择空白项");
      updateTaskProgress(2 + batches.length, totalTaskUnits, `已确认 ${acceptedMappings} 个有简历依据的值，正在填写`);
      throwIfAborted(taskController.signal);
      activeFillAbortController = null;
      elements.fillButton.disabled = true;
      elements.fillButton.textContent = "正在安全写入页面";
      const aiFill = await executeMappedFillByFrame({
        tabId: tab.id,
        frameIds,
        mappings: aiValueMappings,
        fieldAddressByQualifiedKey,
        mappingStorageKey: "aiValueMappings",
        storageState: {
          analysisOnly: false,
          aiOnly: false,
          aiFieldMappings: {},
          aiAutofillOnly: true,
        },
      });
      throwIfAborted(taskController.signal);
      const total = summarizeFrameResults(aiFill.results);
      total.failed += aiFill.failedFields;
      total.manual += aiFill.failedFields;
      const frameFailureCopy = aiFill.failedFrames > 0 ? `（涉及 ${aiFill.failedFrames} 个页面区域）` : "";
      updateProgress("fill", total.failed > 0 ? "fallback" : "success", `已填写 ${total.filled} 项，其中 ${total.derived} 项为 AI 派生${total.failed > 0 ? `，${total.failed} 项写入失败${frameFailureCopy}` : ""}`);
      updateProgress("summary", total.failed > 0 ? "fallback" : "success", `保留已有内容 ${total.preserved} 项，${total.manual} 项需手动确认${total.failed > 0 ? `，其中 ${total.failed} 项写入失败` : ""}`);
      updateTaskProgress(totalTaskUnits, totalTaskUnits, `已填写 ${total.filled} 项，${total.manual} 项需手动确认${total.failed > 0 ? `，${total.failed} 项写入失败` : ""}`);
      showResult(
        total.failed > 0 ? `AI 已填写 ${total.filled} 项，部分未完成` : `AI 已填写 ${total.filled} 项`,
        `已按简历从上到下处理；无明确依据的内容保持空白。其中 ${total.derived} 项为格式、选项或自我描述等派生值，已用琥珀色边框标记。${total.failed > 0 ? `需手动确认的内容中，有 ${total.failed} 项因页面控件或页面区域异常写入失败${frameFailureCopy}。` : ""}`,
        total.failed > 0 ? "warning" : "success",
        total.unmatched,
      );
      return;
    }

    updateProgress("match", "success", `本地规则已识别 ${locallyIdentified} 个`);
    updateProgress("fill", "loading", "正在按经历卡片立即填写");
    await chrome.storage.local.set({ analysisOnly: false, aiOnly: false, aiFieldMappings: {}, aiAutofillOnly: false, aiValueMappings: {} });
    const localFrameResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      files: ["fill.js"],
    });
    throwIfAborted(taskController.signal);
    const total = summarizeFrameResults(localFrameResults);
    updateProgress("fill", "success", `本地填写完成 ${total.filled}/${total.matched || total.scanned}`);
    updateTaskProgress(2, 4, `本地规则已填写 ${total.filled} 项`);

    if (total.scanned === 0) {
      updateProgress("fill", "fallback", "当前页面没有可填写字段");
      updateProgress("summary", "success", "请进入具体网申表单后重试");
      showResult("没有找到可填写表单", "请进入网申填写页后重试。部分验证码或封闭组件需要手动处理。", "error");
      return;
    }

    const stored = await chrome.storage.local.get(["matchToken", "matchTokenExpiresAt", "aiMatchingAvailable"]);
    let aiMappings = {};
    let aiMatched = 0;
    const tokenValid = stored.matchToken
      && (!stored.matchTokenExpiresAt || new Date(stored.matchTokenExpiresAt).getTime() > Date.now());

    if (smartMatchFields.length && stored.aiMatchingAvailable && tokenValid) {
      updateProgress("match", "loading", `页面已先填，后台复核 ${smartMatchFields.length} 个未识别字段`);
      try {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), SMART_MATCH_TIMEOUT_MS);
        let response;
        try {
          response = await fetch(`${STARJOB_HOME}/api/resume/extension-match`, {
            method: "POST",
            headers: { Authorization: `Bearer ${stored.matchToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ fields: smartMatchFields }),
            cache: "no-store",
            signal: controller.signal,
          });
        } finally {
          window.clearTimeout(timeout);
        }
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "智能分析暂时不可用");
        for (const mapping of payload.mappings || []) {
          if (mapping?.fieldKey && mapping.key && Number(mapping.confidence) >= 0.78) {
            aiMappings[mapping.fieldKey] = { key: mapping.key, confidence: Number(mapping.confidence) };
            aiMatched += 1;
          }
        }
        if (aiMatched > 0) {
          const aiFill = await executeMappedFillByFrame({
            tabId: tab.id,
            frameIds,
            mappings: aiMappings,
            fieldAddressByQualifiedKey,
            mappingStorageKey: "aiFieldMappings",
            storageState: {
              analysisOnly: false,
              aiOnly: true,
              aiAutofillOnly: false,
              aiValueMappings: {},
            },
          });
          const aiTotal = summarizeFrameResults(aiFill.results);
          aiTotal.failed += aiFill.failedFields;
          total.filled += aiTotal.filled;
          total.matched += aiTotal.matched;
          total.empty += aiTotal.empty;
          total.failed += aiTotal.failed;
          total.manual = Math.max(0, total.manual - aiTotal.filled);
          total.unmatched.push(...aiTotal.unmatched);
        }
        updateProgress("match", "success", `本地识别 ${locallyIdentified} 个，智能复核 ${aiMatched} 个`);
        updateTaskProgress(3, 4, `本地识别 ${locallyIdentified} 个，后台复核 ${aiMatched} 个`);
      } catch (error) {
        const message = error instanceof DOMException && error.name === "AbortError"
          ? "智能复核超过 9 秒"
          : error instanceof Error ? error.message : "智能分析不可用";
        updateProgress("match", "fallback", `${message}，立即使用本地规则`);
        updateTaskProgress(3, 4, `${message}，已回退到本地规则`);
      }
    } else {
      const reason = !smartMatchFields.length
        ? "低置信字段为 0，本次无需智能复核"
        : !tokenValid ? "请重新同步简历以启用智能分析" : "本次使用本地规则匹配";
      updateProgress("match", "fallback", `${reason}，已识别 ${locallyIdentified} 个`);
      updateTaskProgress(3, 4, `${reason}，继续整理待确认项`);
    }

    updateProgress("fill", total.failed > 0 ? "fallback" : "success", `填写完成 ${total.filled}/${total.matched || total.scanned}${total.failed > 0 ? `，${total.failed} 项写入失败` : ""}`);
    updateProgress("summary", total.failed > 0 ? "fallback" : "success", `共 ${total.manual} 个需手动确认，其中 ${total.empty || 0} 个在简历中没有对应值`);
    updateTaskProgress(4, 4, `已填写 ${total.filled} 项，${total.manual} 项需手动确认${total.failed > 0 ? `，${total.failed} 项写入失败` : ""}`);
    showResult(
      total.failed > 0 ? `已填写 ${total.filled} 项，部分未完成` : `已填写 ${total.filled} 项`,
      `保留已有内容 ${total.preserved} 项，仍有 ${total.manual} 项需要你确认。${total.failed > 0 ? `其中 ${total.failed} 项因页面控件异常写入失败。` : ""}提交前请逐项检查。`,
      total.failed > 0 ? "warning" : "success",
      total.unmatched,
    );
  } catch (error) {
    updateProgress("summary", "fallback", "填写中断，请查看下方原因");
    showResult(taskController.signal.reason === "cancelled" ? "本次填写已取消" : "本次填写未完成", friendlyFillError(error, taskController.signal.reason), taskController.signal.reason === "cancelled" ? "warning" : "error");
  } finally {
    await chrome.storage.local.remove(["analysisOnly", "aiOnly", "aiFieldMappings", "aiAutofillOnly", "aiValueMappings"]);
    stopProgressClock();
    if (activeFillAbortController === taskController) activeFillAbortController = null;
    elements.fillButton.disabled = false;
    resetOverwriteConfirmation();
  }
}

elements.resumeSelect.addEventListener("change", () => {
  resetOverwriteConfirmation();
  void chrome.storage.local.set({ activeResumeId: elements.resumeSelect.value });
});

document.querySelectorAll('input[name="fillMode"]').forEach((input) => {
  input.addEventListener("change", () => {
    if (input.checked) {
      resetOverwriteConfirmation();
      void chrome.storage.local.set({ fillMode: input.value });
    }
  });
});

elements.fillButton.addEventListener("click", () => {
  if (activeFillAbortController) {
    activeFillAbortController.abort("cancelled");
    elements.fillButton.disabled = true;
    elements.fillButton.textContent = "正在停止，不会改动页面";
    return;
  }
  void fillCurrentPage();
});
elements.openSync.addEventListener("click", () => openPage("/extension#sync"));
elements.openSyncFromEmpty.addEventListener("click", () => openPage("/extension#sync"));
elements.openGuide.addEventListener("click", () => openPage("/extension/guide"));
elements.clearData.addEventListener("click", async () => {
  if (!globalThis.chrome?.storage?.local) return;
  if (clearConfirmationExpiresAt < Date.now()) {
    armClearConfirmation();
    return;
  }
  resetClearConfirmation();
  await chrome.storage.local.remove(STORAGE_KEYS);
  await render();
  showResult("本地数据已清除", "扩展中保存的拾星简历已删除。", "success");
});

function renderPreview() {
  elements.emptyState.hidden = true;
  elements.readyState.hidden = false;
  const option = document.createElement("option");
  option.value = "preview";
  option.textContent = "产品运营-校招版";
  elements.resumeSelect.append(option);
  elements.syncMeta.textContent = "简历只保存在当前浏览器";
  resetProgress();
  updateProgress("extract", "success", "共提取 40 个可见字段");
  updateProgress("match", "success", "本地识别 28 个，后台复核 3 个");
  updateProgress("fill", "success", "本地内容已先填写，补充完成 18/35");
  updateProgress("summary", "success", "17 个需手动确认，其中 12 个在简历中没有对应值");
  updateTaskProgress(4, 4, "预览：已填写 18 项，17 项需手动确认");
  stopProgressClock();
  showResult("已填写 18 项", "请检查页面中标记的字段，并手动提交网申。", "success", ["最高学历", "毕业时间", "附件简历", "身份证明"]);
}

if (globalThis.chrome?.storage?.local) void render();
else renderPreview();
