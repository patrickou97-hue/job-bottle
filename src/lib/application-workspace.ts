import type {
  ApplicationFormAnswer,
  ApplicationMaterial,
  ApplicationWithJob,
  Job,
  JobSnapshot,
  ResumeSnapshot,
  StatusHistory,
} from "@/lib/types";
import type { ResumeDocument } from "@/lib/resume";

export type CalendarEntry = {
  id: string;
  applicationId?: string;
  jobId?: string;
  company: string;
  role: string;
  label: string;
  date: Date;
  overdue: boolean;
  url: string;
};

export type JobCalendarRecord = Pick<Job, "id" | "company_name" | "job_titles" | "apply_url" | "is_active"> & {
  opens_at?: string | null;
  closes_at?: string | null;
};

export function createJobSnapshot(job: Job): JobSnapshot {
  return {
    company_name: job.company_name,
    job_titles: job.job_titles || "岗位待补充",
    locations: job.locations,
    industry: job.industry,
    batch_type: job.batch_type,
    apply_url: job.apply_url,
    start_date: job.start_date,
    responsibilities: job.responsibilities ?? null,
    must_have: job.must_have ?? null,
    preferred_qualifications: job.preferred_qualifications ?? null,
    keywords: job.keywords ?? [],
    closes_at: job.closes_at ?? null,
    source_url: job.apply_url,
    notes: job.notes,
  };
}

export function createResumeSnapshot(resume: ResumeDocument): ResumeSnapshot {
  const content = {
    ...resume.content,
    basics: { ...resume.content.basics, photoDataUrl: "" },
  };
  return {
    id: resume.id,
    title: resume.title,
    targetRole: resume.targetRole,
    jobTarget: resume.jobTarget,
    templateId: resume.templateId,
    capturedAt: new Date().toISOString(),
    photoOmitted: Boolean(resume.content.basics.photoDataUrl),
    content: content as unknown as Record<string, unknown>,
  };
}

export function getResumeSnapshotHighlights(snapshot: Pick<ResumeSnapshot, "content">): string[] {
  const content = snapshot.content;
  const entries = (key: string) => Array.isArray(content[key])
    ? (content[key] as unknown[]).filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
  const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
  const firstBullet = (entry: Record<string, unknown>) => Array.isArray(entry.bullets)
    ? entry.bullets.map(text).find(Boolean)?.slice(0, 120) ?? ""
    : "";
  const line = (prefix: string, parts: string[], entry: Record<string, unknown>) => {
    const identity = parts.map((key) => text(entry[key])).filter(Boolean).join(" · ");
    const evidence = firstBullet(entry);
    return identity ? `${prefix} · ${identity}${evidence ? ` — ${evidence}` : ""}` : "";
  };

  return [
    ...entries("education").map((entry) => line("教育", ["school", "college", "major", "degree"], entry)),
    ...entries("work").map((entry) => line("工作经历", ["company", "title"], entry)),
    ...entries("projects").map((entry) => line("项目经历", ["name", "role"], entry)),
    ...entries("campus").map((entry) => line("校园经历", ["title", "role"], entry)),
  ].filter(Boolean).slice(0, 8);
}

export function normalizeFormAnswers(value: unknown): ApplicationFormAnswer[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((answer) => {
    if (!answer || typeof answer !== "object") return [];
    const question = typeof answer.question === "string" ? answer.question.trim().slice(0, 400) : "";
    const text = typeof answer.answer === "string" ? answer.answer.trim().slice(0, 4000) : "";
    return question && text ? [{ question, answer: text }] : [];
  }).slice(0, 20);
}

export function normalizeMaterialRecords(value: unknown): ApplicationMaterial[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((material) => {
    if (!material || typeof material !== "object") return [];
    const name = typeof material.name === "string" ? material.name.trim().slice(0, 160) : "";
    const url = typeof material.url === "string" ? material.url.trim().slice(0, 1200) : "";
    const note = typeof material.note === "string" ? material.note.trim().slice(0, 1000) : "";
    return name ? [{ name, url, note }] : [];
  }).slice(0, 20);
}

export function getApplicationCalendarEntries(
  applications: ApplicationWithJob[],
  now = new Date(),
  catalogJobs: JobCalendarRecord[] = [],
): CalendarEntry[] {
  const entries: CalendarEntry[] = [];
  const minimumCalendarTime = now.getTime() - 14 * 86_400_000;
  const applicationJobIds = new Set(applications.map((application) => application.job_id).filter((id): id is string => Boolean(id)));
  for (const application of applications) {
    if (["rejected", "withdrawn"].includes(application.status)) continue;
    const company = application.job.company_name;
    const role = application.applied_position || application.job.job_titles || "校招岗位";
    const actionDate = application.next_action_at ? new Date(application.next_action_at) : null;
    if (actionDate && Number.isFinite(actionDate.getTime()) && actionDate.getTime() >= minimumCalendarTime) {
      entries.push({
        id: `${application.id}:action`,
        applicationId: application.id,
        company,
        role,
        label: application.next_action?.trim() || "投递跟进",
        date: actionDate,
        overdue: actionDate.getTime() < now.getTime(),
        url: application.job.apply_url,
      });
    }
    const closingDate = application.job.closes_at ? new Date(application.job.closes_at) : null;
    if (closingDate && Number.isFinite(closingDate.getTime()) && closingDate.getTime() >= minimumCalendarTime) {
      entries.push({
        id: `${application.id}:deadline`,
        applicationId: application.id,
        company,
        role,
        label: "岗位截止",
        date: closingDate,
        overdue: closingDate.getTime() < now.getTime(),
        url: application.job.apply_url,
      });
    }
  }
  for (const job of catalogJobs) {
    if (!job.is_active || applicationJobIds.has(job.id)) continue;
    const role = job.job_titles || "校招岗位";
    const openingDate = job.opens_at ? new Date(job.opens_at) : null;
    if (openingDate && Number.isFinite(openingDate.getTime()) && openingDate.getTime() >= now.getTime()) {
      entries.push({
        id: `${job.id}:opening`,
        jobId: job.id,
        company: job.company_name,
        role,
        label: "岗位开放",
        date: openingDate,
        overdue: false,
        url: job.apply_url,
      });
    }
    const closingDate = job.closes_at ? new Date(job.closes_at) : null;
    if (closingDate && Number.isFinite(closingDate.getTime()) && closingDate.getTime() >= minimumCalendarTime) {
      entries.push({
        id: `${job.id}:deadline`,
        jobId: job.id,
        company: job.company_name,
        role,
        label: "岗位截止",
        date: closingDate,
        overdue: closingDate.getTime() < now.getTime(),
        url: job.apply_url,
      });
    }
  }
  return entries.sort((left, right) => left.date.getTime() - right.date.getTime());
}

export function createCalendarIcs(entries: CalendarEntry[]) {
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const escape = (value: string) => value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n?/g, "\n")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//StarJob//Application Calendar//ZH", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const entry of entries) {
    const start = entry.date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const end = new Date(entry.date.getTime() + 30 * 60_000).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${entry.id}@starjob.space`,
      `DTSTAMP:${now}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${escape(`${entry.label} · ${entry.company} · ${entry.role}`)}`,
      `DESCRIPTION:${escape(entry.url)}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

export type FunnelStep = { key: string; label: string; count: number; fromStart: number };

export function getApplicationFunnel(
  applications: ApplicationWithJob[],
  history: StatusHistory[],
  since = new Date(Date.now() - 180 * 86_400_000),
): FunnelStep[] {
  const states = new Map<string, { createdAt: number; maxStage: number }>();
  const stageIndex: Record<string, number> = {
    opened: 0,
    applied: 1,
    written_test: 2,
    first_round: 3,
    second_round: 4,
    final_round: 5,
    offer: 6,
    rejected: -1,
    withdrawn: -1,
  };
  const appIds = new Set(applications.map((item) => item.id));
  for (const item of history) {
    if (!appIds.has(item.application_id)) continue;
    const changedAt = new Date(item.changed_at).getTime();
    const current = states.get(item.application_id);
    if (!current) states.set(item.application_id, { createdAt: changedAt, maxStage: stageIndex[item.to_status] ?? 0 });
    else {
      current.createdAt = Math.min(current.createdAt, changedAt);
      current.maxStage = Math.max(current.maxStage, stageIndex[item.to_status] ?? 0);
    }
  }
  for (const application of applications) {
    if (!states.has(application.id)) {
      states.set(application.id, {
        createdAt: new Date(application.saved_at ?? application.updated_at).getTime(),
        maxStage: stageIndex[application.status] ?? 0,
      });
    }
  }
  const cohort = [...states.values()].filter((item) => item.createdAt >= since.getTime());
  const start = cohort.length;
  return [
    { key: "saved", label: "已收录", count: start, fromStart: 100 },
    { key: "applied", label: "已投递", count: cohort.filter((item) => item.maxStage >= 1).length, fromStart: ratio(cohort.filter((item) => item.maxStage >= 1).length, start) },
    { key: "assessment", label: "笔试 / 测评", count: cohort.filter((item) => item.maxStage >= 2).length, fromStart: ratio(cohort.filter((item) => item.maxStage >= 2).length, start) },
    { key: "interview", label: "进入面试", count: cohort.filter((item) => item.maxStage >= 3).length, fromStart: ratio(cohort.filter((item) => item.maxStage >= 3).length, start) },
    { key: "offer", label: "Offer", count: cohort.filter((item) => item.maxStage >= 6).length, fromStart: ratio(cohort.filter((item) => item.maxStage >= 6).length, start) },
  ];
}

function ratio(value: number, total: number) {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}
