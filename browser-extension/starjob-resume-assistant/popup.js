const STARJOB_HOME = "https://www.starjob.space";
const SMART_MATCH_TIMEOUT_MS = 9_000;
const SMART_MATCH_MAX_FIELDS = 6;
const STORAGE_KEYS = ["starjobResumes", "activeResumeId", "fillMode", "lastSyncedAt", "matchToken", "matchTokenExpiresAt", "aiMatchingAvailable", "analysisOnly", "aiOnly", "aiFieldMappings"];

const elements = {
  emptyState: document.querySelector("#emptyState"),
  readyState: document.querySelector("#readyState"),
  resumeSelect: document.querySelector("#resumeSelect"),
  fillButton: document.querySelector("#fillButton"),
  syncMeta: document.querySelector("#syncMeta"),
  resultPanel: document.querySelector("#resultPanel"),
  resultTitle: document.querySelector("#resultTitle"),
  resultText: document.querySelector("#resultText"),
  progressPanel: document.querySelector("#progressPanel"),
  openSync: document.querySelector("#openSync"),
  openSyncFromEmpty: document.querySelector("#openSyncFromEmpty"),
  openGuide: document.querySelector("#openGuide"),
  clearData: document.querySelector("#clearData"),
};

const progressDefaults = {
  extract: "等待开始",
  match: "等待字段清单",
  fill: "等待匹配结果",
  summary: "等待填写完成",
};

function resetProgress() {
  elements.progressPanel.hidden = false;
  for (const [step, text] of Object.entries(progressDefaults)) updateProgress(step, "pending", text);
}

function updateProgress(step, status, text) {
  const row = elements.progressPanel.querySelector(`[data-step="${step}"]`);
  if (!row) return;
  row.dataset.status = status;
  row.querySelector("p").textContent = text;
}

function openPage(path) {
  void chrome.tabs.create({ url: `${STARJOB_HOME}${path}` });
}

function showResult(title, text, tone = "success") {
  elements.resultTitle.textContent = title;
  elements.resultText.textContent = text;
  elements.resultPanel.dataset.tone = tone;
  elements.resultPanel.hidden = false;
}

function formatSyncTime(value) {
  if (!value) return "简历只保存在当前浏览器";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "简历只保存在当前浏览器";
  return `上次同步 ${date.toLocaleString("zh-CN", { hour12: false })}`;
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
      unmatched: [...acc.unmatched, ...(Array.isArray(item.unmatched) ? item.unmatched : [])],
    }),
    { scanned: 0, matched: 0, filled: 0, preserved: 0, empty: 0, manual: 0, unmatched: [] },
  );
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

  const selectedMode = stored.fillMode === "overwrite" ? "overwrite" : "merge";
  document.querySelector(`input[name="fillMode"][value="${selectedMode}"]`).checked = true;
  elements.syncMeta.textContent = formatSyncTime(stored.lastSyncedAt);
}

async function fillCurrentPage() {
  elements.fillButton.disabled = true;
  elements.fillButton.textContent = "正在逐项分析";
  elements.resultPanel.hidden = true;
  resetProgress();
  updateProgress("extract", "loading", "正在读取可见表单字段");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url || /^(chrome|edge|about|chrome-extension):/.test(tab.url)) {
      throw new Error("当前页面不允许扩展填写，请打开企业网申页面后重试。");
    }

    const fillMode = document.querySelector('input[name="fillMode"]:checked')?.value === "overwrite"
      ? "overwrite"
      : "merge";
    const activeResumeId = elements.resumeSelect.value;
    await chrome.storage.local.set({ activeResumeId, fillMode, analysisOnly: true, aiOnly: false, aiFieldMappings: {} });

    const analysisResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      files: ["fill.js"],
    });
    const analyses = analysisResults.map((entry) => entry.result).filter(Boolean);
    const fields = analyses.flatMap((item) => Array.isArray(item.fields) ? item.fields : []).slice(0, 100);
    const extracted = analyses.reduce((sum, item) => sum + (item.scanned || 0), 0);
    const locallyIdentified = analyses.reduce((sum, item) => sum + (item.identified || 0), 0);
    const smartMatchFields = fields
      .filter((field) => !field.deterministicKey || Number(field.deterministicConfidence) < 0.74)
      .slice(0, SMART_MATCH_MAX_FIELDS);
    updateProgress("extract", "success", `共提取 ${extracted} 个可见字段`);

    updateProgress("match", "success", `本地规则已识别 ${locallyIdentified} 个`);
    updateProgress("fill", "loading", "正在按经历卡片立即填写");
    await chrome.storage.local.set({ analysisOnly: false, aiOnly: false, aiFieldMappings: {} });
    const localFrameResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      files: ["fill.js"],
    });
    const total = summarizeFrameResults(localFrameResults);
    updateProgress("fill", "success", `本地填写完成 ${total.filled}/${total.matched || total.scanned}`);

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
          await chrome.storage.local.set({ analysisOnly: false, aiOnly: true, aiFieldMappings: aiMappings });
          const aiFrameResults = await chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: true },
            files: ["fill.js"],
          });
          const aiTotal = summarizeFrameResults(aiFrameResults);
          total.filled += aiTotal.filled;
          total.matched += aiTotal.matched;
          total.empty += aiTotal.empty;
          total.manual = Math.max(0, total.manual - aiTotal.filled);
          total.unmatched.push(...aiTotal.unmatched);
        }
        updateProgress("match", "success", `本地识别 ${locallyIdentified} 个，智能复核 ${aiMatched} 个`);
      } catch (error) {
        const message = error instanceof DOMException && error.name === "AbortError"
          ? "智能复核超过 9 秒"
          : error instanceof Error ? error.message : "智能分析不可用";
        updateProgress("match", "fallback", `${message}，立即使用本地规则`);
      }
    } else {
      const reason = !smartMatchFields.length
        ? "低置信字段为 0，本次无需智能复核"
        : !tokenValid ? "请重新同步简历以启用智能分析" : "本次使用本地规则匹配";
      updateProgress("match", "fallback", `${reason}，已识别 ${locallyIdentified} 个`);
    }

    updateProgress("fill", "success", `填写完成 ${total.filled}/${total.matched || total.scanned}`);
    updateProgress("summary", "success", `共 ${total.manual} 个需手动确认，其中 ${total.empty || 0} 个在简历中没有对应值`);
    showResult(
      `已填写 ${total.filled} 项`,
      `扫描 ${total.scanned} 项，保留已有内容 ${total.preserved} 项，需手动确认 ${total.manual} 项。${[...new Set(total.unmatched)].slice(0, 4).length ? ` 可优先检查：${[...new Set(total.unmatched)].slice(0, 4).join("、")}。` : ""}提交前请逐项检查。`,
    );
  } catch (error) {
    updateProgress("summary", "fallback", "填写中断，请查看下方原因");
    showResult("本次填写未完成", error instanceof Error ? error.message : "请刷新网申页面后重试。", "error");
  } finally {
    await chrome.storage.local.remove(["analysisOnly", "aiOnly", "aiFieldMappings"]);
    elements.fillButton.disabled = false;
    elements.fillButton.textContent = "一键填写当前页面";
  }
}

elements.resumeSelect.addEventListener("change", () => {
  void chrome.storage.local.set({ activeResumeId: elements.resumeSelect.value });
});

document.querySelectorAll('input[name="fillMode"]').forEach((input) => {
  input.addEventListener("change", () => {
    if (input.checked) void chrome.storage.local.set({ fillMode: input.value });
  });
});

elements.fillButton.addEventListener("click", () => void fillCurrentPage());
elements.openSync.addEventListener("click", () => openPage("/extension#sync"));
elements.openSyncFromEmpty.addEventListener("click", () => openPage("/extension#sync"));
elements.openGuide.addEventListener("click", () => openPage("/extension/guide"));
elements.clearData.addEventListener("click", async () => {
  if (!globalThis.chrome?.storage?.local) return;
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
  showResult("已填写 18 项", "请检查页面中标记的字段，并手动提交网申。", "success");
}

if (globalThis.chrome?.storage?.local) void render();
else renderPreview();
