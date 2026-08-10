import { NextRequest, NextResponse } from "next/server";
import { POST as reviewResumeImport } from "@/app/api/resume/import/route";
import { authenticateMiniProgramRequest } from "@/lib/miniprogram-auth";
import {
  createResumeFromImport,
  parseResumeTextLocally,
  type ImportedResumeDraft,
} from "@/lib/resume-import";
import { toMiniProgramResumeDetail } from "@/lib/miniprogram-api";
import { resumeContentForStorage } from "@/lib/miniprogram-resume";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST(request: NextRequest) {
  const identity = authenticateMiniProgramRequest(request);
  if (!identity) {
    return NextResponse.json(
      { error: "登录状态已失效，请重新登录。" },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => null) as {
    sourceText?: unknown;
    fileName?: unknown;
    mode?: unknown;
  } | null;
  const sourceText =
    typeof body?.sourceText === "string" ? body.sourceText.trim() : "";
  const fileName =
    typeof body?.fileName === "string" && body.fileName.trim()
      ? body.fileName.trim().slice(0, 120)
      : "粘贴导入简历";
  const mode = body?.mode === "ai" ? "ai" : "program";
  if (sourceText.length < 120 || sourceText.length > 24_000) {
    return NextResponse.json(
      { error: "请粘贴 120 至 24000 字的简历文字。" },
      { status: 400 },
    );
  }
  if (request.signal.aborted) return cancelledResponse();

  try {
    const local = parseResumeTextLocally(sourceText, fileName);
    let draft: ImportedResumeDraft = local.draft;
    let summary = "已按简历标题与经历区块完成结构识别。";
    let warnings = local.warnings;

    if (mode === "ai") {
      const reviewRequest = new NextRequest(
        new URL("/api/resume/import", request.url),
        {
          method: "POST",
          headers: {
            Authorization: request.headers.get("authorization") ?? "",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileName,
            sourceText: local.normalizedText,
            localDraft: local.draft,
          }),
          signal: request.signal,
        },
      );
      const reviewResponse = await reviewResumeImport(reviewRequest);
      const reviewPayload = await reviewResponse.json().catch(() => null) as {
        error?: string;
        summary?: string;
        draft?: ImportedResumeDraft;
        warnings?: string[];
      } | null;
      if (!reviewResponse.ok || !reviewPayload?.draft) {
        return NextResponse.json(
          {
            error:
              reviewPayload?.error ??
              "智能复核暂时不可用，未创建简历，请稍后重试。",
          },
          { status: reviewResponse.status || 502 },
        );
      }
      if (request.signal.aborted) return cancelledResponse();
      draft = reviewPayload.draft;
      summary = reviewPayload.summary ?? summary;
      warnings = reviewPayload.warnings ?? warnings;
    }

    const resume = createResumeFromImport(draft);
    if (request.signal.aborted) return cancelledResponse();
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("resumes")
      .insert({
        id: resume.id,
        user_id: identity.sub,
        title: resume.title,
        target_role: resume.targetRole || null,
        job_target: resume.jobTarget || null,
        linked_job_id: null,
        template_id: resume.templateId,
        content_json: resumeContentForStorage(
          resume.content,
          resume.templateId,
        ),
        created_at: resume.createdAt,
        updated_at: resume.updatedAt,
      })
      .select("*")
      .abortSignal(request.signal)
      .single();
    if (error) throw error;

    return NextResponse.json(
      {
        data: {
          resume: toMiniProgramResumeDetail(data),
          summary,
          warnings,
          mode,
        },
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (request.signal.aborted) return cancelledResponse();
    console.error("[miniprogram_resume_import]", {
      code:
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : undefined,
    });
    return NextResponse.json(
      { error: "简历导入失败，未创建简历，请稍后重试。" },
      { status: 500 },
    );
  }
}

function cancelledResponse() {
  return NextResponse.json(
    { error: "本次导入已取消，未创建简历。" },
    { status: 499, headers: { "Cache-Control": "no-store" } },
  );
}
