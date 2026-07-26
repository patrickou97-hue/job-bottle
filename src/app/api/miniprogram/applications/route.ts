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

    const { data, error } = await admin
      .from("user_applications")
      .upsert(
        {
          user_id: identity.sub,
          job_id: body.jobId,
          status: "opened",
          candidate_stage: candidateStage,
          saved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,job_id" },
      )
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
    };
    if (typeof body.id !== "string" || !body.id) {
      return NextResponse.json({ error: "星瓶记录无效。" }, { status: 400 });
    }
    const status = parseStatus(body.status);
    const candidateStage = parseCandidateStage(body.candidateStage);
    if (!status || !candidateStage) {
      return NextResponse.json({ error: "投递状态无效。" }, { status: 400 });
    }
    const admin = createAdminClient();
    const { data: application, error } = await admin
      .from("user_applications")
      .update({
        status,
        candidate_stage: candidateStage,
        note: cleanText(body.note, 1000),
        next_action: cleanText(body.nextAction, 300),
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

function unauthorized() {
  return NextResponse.json(
    { error: "登录状态已失效，请重新登录。" },
    { status: 401 },
  );
}
