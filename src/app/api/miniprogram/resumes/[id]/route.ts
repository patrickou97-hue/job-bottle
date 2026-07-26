import { NextRequest, NextResponse } from "next/server";
import { authenticateMiniProgramRequest } from "@/lib/miniprogram-auth";
import { toMiniProgramResumeDetail } from "@/lib/miniprogram-api";
import {
  duplicateResumeTitle,
  parseMiniProgramResumeUpdate,
  resumeContentForStorage,
} from "@/lib/miniprogram-resume";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const identity = authenticateMiniProgramRequest(request);
  if (!identity) {
    return NextResponse.json(
      { error: "登录状态已失效，请重新登录。" },
      { status: 401 },
    );
  }

  try {
    const { id } = await context.params;
    if (!isUuid(id)) {
      return NextResponse.json({ error: "简历编号无效。" }, { status: 400 });
    }
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("resumes")
      .select("*")
      .eq("id", id)
      .eq("user_id", identity.sub)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: "简历不存在或已删除。" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { data: { resume: toMiniProgramResumeDetail(data) } },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "简历暂时无法读取，请稍后重试。" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const identity = authenticateMiniProgramRequest(request);
  if (!identity) {
    return NextResponse.json(
      { error: "登录状态已失效，请重新登录。" },
      { status: 401 },
    );
  }

  try {
    const { id } = await context.params;
    if (!isUuid(id)) {
      return NextResponse.json({ error: "简历编号无效。" }, { status: 400 });
    }
    const parsed = parseMiniProgramResumeUpdate(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "简历内容格式不正确，请检查后重试。", code: "INVALID_RESUME" },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { data: current, error: currentError } = await admin
      .from("resumes")
      .select("*")
      .eq("id", id)
      .eq("user_id", identity.sub)
      .maybeSingle();
    if (currentError) throw currentError;
    if (!current) {
      return NextResponse.json(
        { error: "简历不存在或已删除。" },
        { status: 404 },
      );
    }

    if (!parsed.data.force && current.updated_at !== parsed.data.baseUpdatedAt) {
      return NextResponse.json(
        {
          error: "这份简历已在其他设备更新，请先刷新或确认覆盖。",
          code: "RESUME_CONFLICT",
          data: { resume: toMiniProgramResumeDetail(current) },
        },
        { status: 409 },
      );
    }

    const updatedAt = new Date().toISOString();
    const payload = {
      title: parsed.data.title || "未命名简历",
      target_role: parsed.data.targetRole || null,
      job_target: parsed.data.jobTarget || null,
      linked_job_id: parsed.data.linkedJobId,
      template_id: parsed.data.templateId,
      content_json: resumeContentForStorage(
        parsed.data.content,
        parsed.data.templateId,
      ),
      updated_at: updatedAt,
    };
    let update = admin
      .from("resumes")
      .update(payload)
      .eq("id", id)
      .eq("user_id", identity.sub);
    if (!parsed.data.force) {
      update = update.eq("updated_at", parsed.data.baseUpdatedAt);
    }
    let { data, error } = await update.select("*").maybeSingle();

    if (
      error?.code === "23514" &&
      String(error.message).includes("template_id")
    ) {
      const fallback = await admin
        .from("resumes")
        .update({ ...payload, template_id: "compact" })
        .eq("id", id)
        .eq("user_id", identity.sub)
        .select("*")
        .maybeSingle();
      data = fallback.data;
      error = fallback.error;
    }
    if (error) throw error;
    if (!data) {
      const { data: latest } = await admin
        .from("resumes")
        .select("*")
        .eq("id", id)
        .eq("user_id", identity.sub)
        .maybeSingle();
      return NextResponse.json(
        {
          error: "这份简历刚刚发生变化，请刷新后重试。",
          code: "RESUME_CONFLICT",
          data: latest ? { resume: toMiniProgramResumeDetail(latest) } : undefined,
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { data: { resume: toMiniProgramResumeDetail(data) } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "简历保存失败，请稍后重试。" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const identity = authenticateMiniProgramRequest(request);
  if (!identity) {
    return NextResponse.json(
      { error: "登录状态已失效，请重新登录。" },
      { status: 401 },
    );
  }

  try {
    const { id } = await context.params;
    if (!isUuid(id)) {
      return NextResponse.json({ error: "简历编号无效。" }, { status: 400 });
    }
    const body = (await request.json()) as { action?: unknown };
    if (body.action !== "duplicate") {
      return NextResponse.json({ error: "不支持的简历操作。" }, { status: 400 });
    }
    const admin = createAdminClient();
    const { data: current, error: currentError } = await admin
      .from("resumes")
      .select("*")
      .eq("id", id)
      .eq("user_id", identity.sub)
      .maybeSingle();
    if (currentError) throw currentError;
    if (!current) {
      return NextResponse.json(
        { error: "简历不存在或已删除。" },
        { status: 404 },
      );
    }
    const now = new Date().toISOString();
    const { data, error } = await admin
      .from("resumes")
      .insert({
        user_id: identity.sub,
        title: duplicateResumeTitle(current.title),
        target_role: current.target_role,
        job_target: current.job_target,
        linked_job_id: current.linked_job_id,
        template_id: current.template_id,
        content_json: current.content_json,
        created_at: now,
        updated_at: now,
      })
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json(
      { data: { resume: toMiniProgramResumeDetail(data) } },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "简历复制失败，请稍后重试。" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const identity = authenticateMiniProgramRequest(request);
  if (!identity) {
    return NextResponse.json(
      { error: "登录状态已失效，请重新登录。" },
      { status: 401 },
    );
  }

  try {
    const { id } = await context.params;
    if (!isUuid(id)) {
      return NextResponse.json({ error: "简历编号无效。" }, { status: 400 });
    }
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("resumes")
      .delete()
      .eq("id", id)
      .eq("user_id", identity.sub)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: "简历不存在或已删除。" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { data: { deletedId: data.id } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "简历删除失败，请稍后重试。" },
      { status: 500 },
    );
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
