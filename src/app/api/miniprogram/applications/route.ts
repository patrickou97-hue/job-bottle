import { NextRequest, NextResponse } from "next/server";
import { authenticateMiniProgramRequest } from "@/lib/miniprogram-auth";
import { toMiniProgramApplication } from "@/lib/miniprogram-api";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApplicationCandidateStage } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const identity = authenticateMiniProgramRequest(request);
  if (!identity) return unauthorized();

  try {
    const admin = createAdminClient();
    const { data: applications, error } = await admin
      .from("user_applications")
      .select("*")
      .eq("user_id", identity.sub)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    const jobIds = [...new Set((applications ?? []).map((item) => item.job_id))];
    const { data: jobs, error: jobError } = jobIds.length
      ? await admin.from("jobs").select("*").in("id", jobIds)
      : { data: [], error: null };
    if (jobError) throw jobError;
    const jobMap = new Map((jobs ?? []).map((job) => [job.id, job]));

    return NextResponse.json(
      {
        data: {
          applications: (applications ?? []).flatMap((application) => {
            const job = jobMap.get(application.job_id);
            return job ? [toMiniProgramApplication(application, job)] : [];
          }),
        },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "投递记录暂时无法读取，请稍后重试。" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const identity = authenticateMiniProgramRequest(request);
  if (!identity) return unauthorized();

  try {
    const body = (await request.json()) as {
      jobId?: unknown;
      candidateStage?: unknown;
    };
    if (typeof body.jobId !== "string" || !body.jobId) {
      return NextResponse.json(
        { error: "岗位编号无效。" },
        { status: 400 },
      );
    }
    const candidateStage = parseCandidateStage(body.candidateStage);
    if (!candidateStage) {
      return NextResponse.json(
        { error: "星瓶阶段无效。" },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { data: job, error: jobError } = await admin
      .from("jobs")
      .select("id")
      .eq("id", body.jobId)
      .eq("is_active", true)
      .maybeSingle();
    if (jobError) throw jobError;
    if (!job) {
      return NextResponse.json(
        { error: "岗位不存在或已下线。" },
        { status: 404 },
      );
    }

    const { data: existing, error: existingError } = await admin
      .from("user_applications")
      .select("id")
      .eq("user_id", identity.sub)
      .eq("job_id", body.jobId)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) {
      return NextResponse.json(
        { data: { id: existing.id } },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const { data, error } = await admin
      .from("user_applications")
      .insert({
        user_id: identity.sub,
        job_id: body.jobId,
        status: "opened",
        candidate_stage: candidateStage,
        saved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw error;

    return NextResponse.json(
      { data: { id: data.id } },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "岗位收录失败，请稍后重试。" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const identity = authenticateMiniProgramRequest(request);
  if (!identity) return unauthorized();

  try {
    const body = (await request.json()) as {
      id?: unknown;
      status?: unknown;
      candidateStage?: unknown;
      note?: unknown;
      nextAction?: unknown;
      nextActionAt?: unknown;
      priority?: unknown;
      applicationChannel?: unknown;
      applicationAccount?: unknown;
      contactName?: unknown;
      resumeId?: unknown;
      customStageLabel?: unknown;
      reviewNote?: unknown;
    };
    if (typeof body.id !== "string" || !body.id) {
      return NextResponse.json({ error: "星瓶记录无效。" }, { status: 400 });
    }
    const status = parseStatus(body.status);
    const candidateStage = parseCandidateStage(body.candidateStage);
    if (!status || !candidateStage) {
      return NextResponse.json({ error: "投递状态无效。" }, { status: 400 });
    }
    const priority = body.priority === undefined
      ? undefined
      : typeof body.priority === "number" &&
      Number.isInteger(body.priority) &&
      body.priority >= 0 &&
      body.priority <= 3
        ? body.priority
        : null;
    if (priority === null) {
      return NextResponse.json({ error: "优先级无效。" }, { status: 400 });
    }
    const nextActionAt = body.nextActionAt === undefined
      ? undefined
      : parseOptionalDate(body.nextActionAt);
    if (body.nextActionAt !== undefined && nextActionAt === undefined) {
      return NextResponse.json(
        { error: "下一步时间格式无效。" },
        { status: 400 },
      );
    }
    const resumeId = body.resumeId === undefined
      ? undefined
      : parseOptionalUuid(body.resumeId);
    if (body.resumeId !== undefined && resumeId === undefined) {
      return NextResponse.json({ error: "关联简历无效。" }, { status: 400 });
    }
    const admin = createAdminClient();
    if (typeof resumeId === "string") {
      const { data: resume, error: resumeError } = await admin
        .from("resumes")
        .select("id")
        .eq("id", resumeId)
        .eq("user_id", identity.sub)
        .maybeSingle();
      if (resumeError) throw resumeError;
      if (!resume) {
        return NextResponse.json(
          { error: "关联简历不存在或不属于当前账号。" },
          { status: 400 },
        );
      }
    }
    const { data: application, error } = await admin
      .from("user_applications")
      .update({
        status,
        candidate_stage: candidateStage,
        note: cleanText(body.note, 1000),
        next_action: cleanText(body.nextAction, 300),
        ...(nextActionAt !== undefined ? { next_action_at: nextActionAt } : {}),
        ...(priority !== undefined ? { priority } : {}),
        ...(body.applicationChannel !== undefined
          ? { application_channel: optionalText(body.applicationChannel, 80) }
          : {}),
        ...(body.applicationAccount !== undefined
          ? { application_account: optionalText(body.applicationAccount, 160) }
          : {}),
        ...(body.contactName !== undefined
          ? { contact_name: optionalText(body.contactName, 120) }
          : {}),
        ...(resumeId !== undefined ? { resume_id: resumeId } : {}),
        ...(body.customStageLabel !== undefined
          ? { custom_stage_label: optionalText(body.customStageLabel, 40) }
          : {}),
        ...(body.reviewNote !== undefined
          ? { review_note: optionalText(body.reviewNote, 3000) }
          : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.id)
      .eq("user_id", identity.sub)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!application) {
      return NextResponse.json({ error: "星瓶记录不存在。" }, { status: 404 });
    }
    const { data: job, error: jobError } = await admin
      .from("jobs")
      .select("*")
      .eq("id", application.job_id)
      .maybeSingle();
    if (jobError) throw jobError;
    if (!job) {
      return NextResponse.json({ error: "岗位不存在或已下线。" }, { status: 404 });
    }
    return NextResponse.json(
      { data: { application: toMiniProgramApplication(application, job) } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "投递状态更新失败，请稍后重试。" },
      { status: 500 },
    );
  }
}

function parseCandidateStage(value: unknown): ApplicationCandidateStage | null {
  return value === "evaluating" || value === "saved" || value === "preparing"
    ? value
    : null;
}

function parseStatus(value: unknown) {
  return value === "opened" ||
    value === "applied" ||
    value === "written_test" ||
    value === "first_round" ||
    value === "second_round" ||
    value === "final_round" ||
    value === "offer" ||
    value === "rejected" ||
    value === "withdrawn"
    ? value
    : null;
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function optionalText(value: unknown, maxLength: number) {
  const clean = cleanText(value, maxLength);
  return clean || null;
}

function parseOptionalUuid(value: unknown) {
  if (value === null || value === "") return null;
  if (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    return value;
  }
  return undefined;
}

function parseOptionalDate(value: unknown) {
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T09:00:00+08:00`)
    : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function unauthorized() {
  return NextResponse.json(
    { error: "登录状态已失效，请重新登录。" },
    { status: 401 },
  );
}
