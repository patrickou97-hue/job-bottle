import { NextRequest, NextResponse } from "next/server";
import { createResumePdfBytes } from "@/components/resume/resumePdf";
import { authenticateMiniProgramRequest } from "@/lib/miniprogram-auth";
import { toMiniProgramResumeDetail } from "@/lib/miniprogram-api";
import type { ResumeDocument } from "@/lib/resume";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

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
    const resume = toMiniProgramResumeDetail(data) as ResumeDocument;
    const bytes = await createResumePdfBytes(resume, request.nextUrl.origin);
    const fileName = safeFileName(
      resume.content.basics.name || resume.title || "StarJob-Resume",
    );
    return new NextResponse(bytes, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}.pdf`,
        "Content-Type": "application/pdf",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "PDF 生成失败，请稍后重试。" },
      { status: 500 },
    );
  }
}

function safeFileName(value: string) {
  return value.trim().replace(/[\\/:*?"<>|]/g, "-").slice(0, 80) || "Resume";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
