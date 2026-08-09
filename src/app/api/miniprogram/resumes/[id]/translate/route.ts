import { NextRequest, NextResponse } from "next/server";
import { POST as translateResume } from "@/app/api/resume/translate/route";
import { authenticateMiniProgramRequest } from "@/lib/miniprogram-auth";
import { toMiniProgramResumeDetail } from "@/lib/miniprogram-api";
import { resumeContentForStorage } from "@/lib/miniprogram-resume";
import {
  createResumeFromTranslation,
  createResumeTranslationSource,
  type ResumeTranslationResult,
} from "@/lib/resume-translation";
import {
  getResumeLanguage,
  type ResumeDocument,
  type ResumeLanguage,
} from "@/lib/resume";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 180;
export const preferredRegion = "hkg1";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const identity = authenticateMiniProgramRequest(request);
  if (!identity) {
    return NextResponse.json(
      { error: "登录状态已失效，请重新登录。" },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "简历编号无效。" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { data: row, error } = await admin
      .from("resumes")
      .select("*")
      .eq("id", id)
      .eq("user_id", identity.sub)
      .maybeSingle();
    if (error) throw error;
    if (!row) {
      return NextResponse.json(
        { error: "简历不存在或已删除。" },
        { status: 404 },
      );
    }

    const source = toMiniProgramResumeDetail(row) as ResumeDocument;
    const targetLanguage: ResumeLanguage =
      getResumeLanguage(source.templateId) === "zh-CN" ? "en-US" : "zh-CN";
    const translationRequest = new NextRequest(
      new URL("/api/resume/translate", request.url),
      {
        method: "POST",
        headers: {
          Authorization: request.headers.get("authorization") ?? "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceLanguage: targetLanguage === "en-US" ? "zh-CN" : "en-US",
          targetLanguage,
          resume: createResumeTranslationSource(source),
        }),
      },
    );
    const translationResponse = await translateResume(translationRequest);
    const translation = await translationResponse.json().catch(() => null) as
      | ResumeTranslationResult
      | { error?: string }
      | null;
    if (
      !translationResponse.ok ||
      !translation ||
      !("translated" in translation)
    ) {
      return NextResponse.json(
        {
          error:
            translation && "error" in translation && translation.error
              ? translation.error
              : "翻译暂时不可用，原简历未改动。",
        },
        { status: translationResponse.status || 502 },
      );
    }

    const translated = createResumeFromTranslation(
      source,
      translation.translated,
      targetLanguage,
    );
    const { data: created, error: createError } = await admin
      .from("resumes")
      .insert({
        id: translated.id,
        user_id: identity.sub,
        title: translated.title,
        target_role: translated.targetRole || null,
        job_target: translated.jobTarget || null,
        linked_job_id: null,
        template_id: translated.templateId,
        content_json: resumeContentForStorage(
          translated.content,
          translated.templateId,
        ),
        created_at: translated.createdAt,
        updated_at: translated.updatedAt,
      })
      .select("*")
      .single();
    if (createError) throw createError;

    return NextResponse.json(
      {
        data: {
          resume: toMiniProgramResumeDetail(created),
          summary: translation.summary,
          warnings: translation.warnings,
        },
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[miniprogram_resume_translate]", {
      code:
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : undefined,
    });
    return NextResponse.json(
      { error: "翻译暂时不可用，原简历未改动。" },
      { status: 500 },
    );
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
