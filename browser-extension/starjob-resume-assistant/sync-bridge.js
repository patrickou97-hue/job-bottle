const CHANNEL = "starjob-resume-assistant";
const ALLOWED_ORIGINS = new Set(["https://www.starjob.space", "https://starjob.space"]);

function send(type, detail = {}) {
  window.postMessage({ channel: CHANNEL, source: "extension", type, ...detail }, window.location.origin);
}

window.addEventListener("message", async (event) => {
  if (event.source !== window || !ALLOWED_ORIGINS.has(event.origin)) return;
  const message = event.data;
  if (!message || message.channel !== CHANNEL || message.source !== "website") return;

  if (message.type === "PING") {
    send("PONG", { version: chrome.runtime.getManifest().version });
    return;
  }

  if (message.type !== "SYNC_RESUMES") return;

  try {
    const resumes = Array.isArray(message.resumes) ? message.resumes.slice(0, 20) : [];
    const serialized = JSON.stringify(resumes);
    const valid = resumes.every((resume) => (
      resume &&
      typeof resume.id === "string" &&
      typeof resume.title === "string" &&
      resume.content &&
      typeof resume.content === "object"
    ));

    if (!valid || serialized.length > 4_500_000) {
      throw new Error("简历数据格式不受支持");
    }

    const previous = await chrome.storage.local.get(["activeResumeId"]);
    const activeResumeId = resumes.some((resume) => resume.id === previous.activeResumeId)
      ? previous.activeResumeId
      : resumes[0]?.id || null;
    const lastSyncedAt = typeof message.syncedAt === "string" ? message.syncedAt : new Date().toISOString();
    const matchToken = typeof message.matchToken === "string" && message.matchToken.length <= 1_200 ? message.matchToken : null;
    const matchTokenExpiresAt = typeof message.matchTokenExpiresAt === "string" ? message.matchTokenExpiresAt : null;

    await chrome.storage.local.set({
      starjobResumes: resumes,
      activeResumeId,
      lastSyncedAt,
      matchToken,
      matchTokenExpiresAt,
      aiMatchingAvailable: Boolean(message.aiMatchingAvailable && matchToken),
    });
    send("SYNC_COMPLETE", { count: resumes.length, lastSyncedAt });
  } catch (error) {
    send("SYNC_ERROR", { message: error instanceof Error ? error.message : "同步失败" });
  }
});

send("READY", { version: chrome.runtime.getManifest().version });
