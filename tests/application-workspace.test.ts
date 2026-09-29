import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workspaceModulePath = "../src/lib/application-workspace." + "ts";
const { createCalendarIcs, createJobSnapshot, createResumeSnapshot, getApplicationCalendarEntries, getApplicationFunnel, getResumeSnapshotHighlights, normalizeFormAnswers, normalizeMaterialRecords } = await import(workspaceModulePath);
const resumeMatchModulePath = "../src/lib/resume-match." + "ts";
const { analyzeResumeForJob } = await import(resumeMatchModulePath);
const resumeModelModulePath = "../src/lib/resume." + "ts";
const { createEmptyResume } = await import(resumeModelModulePath);
const applicationModulePath = "../src/lib/applications." + "ts";
const { normalizeApplicationRow } = await import(applicationModulePath);
const applicationWorkspaceMigration = await readFile(new URL("../supabase/migrations/20260927120000_application_workspace.sql", import.meta.url), "utf8");

const savedAt = "2026-09-20T10:00:00.000Z";
const job = {
  id: "external-job-1",
  company_name: "星河科技",
  start_date: null,
  industry: "科技",
  batch_type: "27 秋招",
  job_titles: "产品经理",
  job_categories: [],
  locations: "上海",
  apply_url: "https://jobs.example.com/apply",
  notes: null,
  responsibilities: "负责产品规划",
  must_have: "应届生",
  preferred_qualifications: null,
  keywords: ["产品"],
  logo_url: null,
  tags: [],
  is_active: true,
  closes_at: "2026-10-01T15:59:00.000Z",
  created_at: savedAt,
  updated_at: savedAt,
};

function application(id: string, status: "opened" | "applied" | "first_round" | "offer" = "opened") {
  return {
    id,
    user_id: "user-1",
    job_id: null,
    status,
    progress_note: null,
    applied_at: null,
    updated_at: savedAt,
    saved_at: savedAt,
    next_action: "准备笔试",
    next_action_at: "2026-09-25T09:00:00.000Z",
    job_snapshot: {
      company_name: job.company_name,
      job_titles: job.job_titles,
      batch_type: job.batch_type,
      apply_url: job.apply_url,
      source_url: job.apply_url,
    },
    job,
  };
}

test("normalizes a user-created position from its private snapshot", () => {
  const row = normalizeApplicationRow({ ...application("custom-1"), job: null });
  assert.equal(row.job.company_name, "星河科技");
  assert.equal(row.job.job_titles, "产品经理");
  assert.equal(row.job.id, "external-custom-1");
});

test("catalog job snapshot retains the official application link as its source", () => {
  const snapshot = createJobSnapshot(job);
  assert.equal(snapshot.source_url, job.apply_url);
});

test("calendar includes upcoming follow-ups and deadlines and exports valid escaped ICS", () => {
  const row = application("custom-1");
  const entries = getApplicationCalendarEntries([row], new Date("2026-09-21T00:00:00.000Z"));
  assert.deepEqual(entries.map((entry: { label: string }) => entry.label), ["准备笔试", "岗位截止"]);
  const ics = createCalendarIcs(entries);
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /SUMMARY:准备笔试 · 星河科技 · 产品经理/);
  assert.match(ics, /END:VCALENDAR/);
});

test("calendar export escapes standalone carriage returns from user-controlled values", () => {
  const row = application("ics-injection");
  row.next_action = "准备笔试\rSUMMARY:Injected";
  row.job.company_name = "星河科技\r\nBEGIN:VEVENT";
  row.job.apply_url = "https://jobs.example.com/apply\rEND:VCALENDAR";

  const ics = createCalendarIcs(getApplicationCalendarEntries([row], new Date("2026-09-21T00:00:00.000Z")));
  assert.match(ics, /SUMMARY:准备笔试\\nSUMMARY:Injected · 星河科技\\nBEGIN:VEVENT/);
  assert.match(ics, /DESCRIPTION:https:\/\/jobs\.example\.com\/apply\\nEND:VCALENDAR/);
  assert.doesNotMatch(ics.replace(/\r\n/g, ""), /[\r\n]/);
});

test("calendar includes public opening and closing dates and avoids duplicate catalog deadlines", () => {
  const now = new Date("2026-09-28T00:00:00.000Z");
  const linkedApplication = {
    ...application("linked-app"),
    job_id: "catalog-1",
    job: { ...job, id: "catalog-1" },
  };
  const entries = getApplicationCalendarEntries([linkedApplication], now, [
    { id: "catalog-1", company_name: "星河科技", job_titles: "产品经理", apply_url: "https://jobs.example.com/1", is_active: true, opens_at: "2026-09-20T00:00:00.000Z", closes_at: "2026-10-01T00:00:00.000Z" },
    { id: "catalog-2", company_name: "远望数据", job_titles: "数据分析", apply_url: "https://jobs.example.com/2", is_active: true, opens_at: "2026-09-30T00:00:00.000Z", closes_at: "2026-10-10T00:00:00.000Z" },
    { id: "catalog-3", company_name: "已下线公司", job_titles: "测试岗位", apply_url: "https://jobs.example.com/3", is_active: false, closes_at: "2026-10-10T00:00:00.000Z" },
  ]);

  assert.equal(entries.filter((entry: { jobId?: string }) => entry.jobId === "catalog-1").length, 0);
  assert.deepEqual(entries.filter((entry: { jobId?: string }) => entry.jobId === "catalog-2").map((entry: { label: string }) => entry.label), ["岗位开放", "岗位截止"]);
  assert.equal(entries.some((entry: { jobId?: string }) => entry.jobId === "catalog-3"), false);
});

test("calendar excludes reminders and deadlines older than its 14-day overdue window", () => {
  const row = {
    ...application("old-application"),
    next_action_at: "2026-09-01T09:00:00.000Z",
    job: { ...job, closes_at: "2026-09-05T15:59:00.000Z" },
  };

  assert.deepEqual(getApplicationCalendarEntries([row], new Date("2026-09-28T00:00:00.000Z")), []);
});

test("funnel conversion counts only recorded applications and their highest recorded stage", () => {
  const rows = [application("saved"), application("applied"), application("interview"), application("offer")];
  const history = [
    { id: "1", application_id: "applied", user_id: "user-1", from_status: "opened", to_status: "applied", changed_at: savedAt },
    { id: "2", application_id: "interview", user_id: "user-1", from_status: "opened", to_status: "applied", changed_at: savedAt },
    { id: "3", application_id: "interview", user_id: "user-1", from_status: "applied", to_status: "first_round", changed_at: savedAt },
    { id: "4", application_id: "offer", user_id: "user-1", from_status: "opened", to_status: "offer", changed_at: savedAt },
  ];
  const funnel = getApplicationFunnel(rows, history, new Date("2026-09-01T00:00:00.000Z"));
  assert.deepEqual(funnel.map(({ count }: { count: number }) => count), [4, 3, 2, 2, 1]);
});

test("resume snapshot omits embedded photo data while preserving structured content", () => {
  const resume = {
    id: "resume-1",
    title: "产品经理校招版",
    targetRole: "产品经理",
    jobTarget: "星河科技",
    linkedJobId: null,
    templateId: "classic",
    createdAt: savedAt,
    updatedAt: savedAt,
    content: {
      basics: { name: "林同学", photoDataUrl: "data:image/png;base64,secret", email: "lin@example.com" },
      education: [{ school: "测试大学" }],
      sectionOrder: ["education"],
    },
  };
  const snapshot = createResumeSnapshot(resume);
  assert.equal(snapshot.photoOmitted, true);
  assert.equal((snapshot.content.basics as { photoDataUrl: string }).photoDataUrl, "");
  assert.equal((snapshot.content.basics as { email: string }).email, "lin@example.com");
  assert.equal(resume.content.basics.photoDataUrl, "data:image/png;base64,secret");
});

test("resume snapshot preview shows concise experience evidence and ignores malformed content", () => {
  const snapshot = {
    content: {
      education: [{ school: "测试大学", major: "金融学", degree: "本科" }, null],
      work: [{ company: "星河科技", title: "产品实习生", bullets: ["跟进用户调研和反馈"] }],
      projects: [{ name: "岗位推荐系统", role: "负责人", bullets: ["完成需求梳理与上线复盘"] }],
    },
  };

  assert.deepEqual(getResumeSnapshotHighlights(snapshot), [
    "教育 · 测试大学 · 金融学 · 本科",
    "工作经历 · 星河科技 · 产品实习生 — 跟进用户调研和反馈",
    "项目经历 · 岗位推荐系统 · 负责人 — 完成需求梳理与上线复盘",
  ]);
});

test("material records discard empty rows and bound user-entered fields", () => {
  assert.deepEqual(normalizeMaterialRecords([
    { name: "", url: "https://example.com", note: "ignored without a name" },
    { name: "作品集", url: "x".repeat(1300), note: "n".repeat(1100) },
  ]), [{ name: "作品集", url: "x".repeat(1200), note: "n".repeat(1000) }]);
});

test("application dossier limits fit the maximum editable answers and materials", () => {
  const answers = normalizeFormAnswers(Array.from({ length: 21 }, (_, index) => ({
    question: `${index}：${"问题".repeat(399)}`,
    answer: "回答".repeat(2002),
  })));
  const materials = normalizeMaterialRecords(Array.from({ length: 21 }, (_, index) => ({
    name: `${index}：${"材料".repeat(80)}`,
    url: `https://example.com/${"u".repeat(1280)}`,
    note: "说明".repeat(500),
  })));

  assert.equal(answers.length, 20);
  assert.equal(answers[0].question.length, 400);
  assert.equal(answers[0].answer.length, 4000);
  assert.equal(materials.length, 20);
  assert.equal(materials[0].name.length, 160);
  assert.equal(materials[0].url.length, 1200);
  assert.equal(materials[0].note.length, 1000);
  assert.ok(JSON.stringify(answers).length < 120000);
  assert.ok(JSON.stringify(materials).length < 60000);
  assert.match(applicationWorkspaceMigration, /jsonb_array_length\(form_answers\) <= 20/);
  assert.match(applicationWorkspaceMigration, /char_length\(form_answers::text\) <= 120000/);
  assert.match(applicationWorkspaceMigration, /jsonb_array_length\(material_records\) <= 20/);
  assert.match(applicationWorkspaceMigration, /char_length\(material_records::text\) <= 60000/);
});

test("resume preflight does not count blank experience placeholders", () => {
  const resume = createEmptyResume();
  resume.content.work = [{ id: "blank-work", experienceType: "internship", company: "", title: "", location: "", startDate: "", endDate: "", current: false, bullets: ["   "] }];
  resume.content.projects = [{ id: "blank-project", name: "", role: "", url: "", startDate: "", endDate: "", bullets: [], keywords: "" }];

  const result = analyzeResumeForJob(resume, null) as { checks: Array<{ label: string; passed: boolean }> };
  assert.equal(result.checks.find((check) => check.label === "经历内容")?.passed, false);
});

test("resume preflight accepts a named experience with real description", () => {
  const resume = createEmptyResume();
  resume.content.work = [{ id: "work-1", experienceType: "internship", company: "星河科技", title: "产品实习生", location: "", startDate: "", endDate: "", current: false, bullets: ["跟进用户调研和功能反馈。"] }];

  const result = analyzeResumeForJob(resume, null) as { checks: Array<{ label: string; passed: boolean }> };
  assert.equal(result.checks.find((check) => check.label === "经历内容")?.passed, true);
});

test("resume keyword matching does not match Latin terms inside longer words", () => {
  const resume = createEmptyResume();
  resume.content.skills = [{ id: "skills-1", category: "开发工具", skills: ["JavaScript", "NoSQL", "跨团队沟通"] }];

  const result = analyzeResumeForJob(resume, { keywords: ["Java", "SQL", "JavaScript", "NoSQL", "团队沟通"] }) as { present: string[]; missing: string[] };
  assert.deepEqual(result.present, ["JavaScript", "NoSQL", "团队沟通"]);
  assert.deepEqual(result.missing, ["Java", "SQL"]);
});
