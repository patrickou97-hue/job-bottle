import { NextRequest, NextResponse } from "next/server";
import { resumeRowToDocument } from "@/lib/resume-sync";
import { authenticateStarInterviewRequest } from "@/lib/star-interview-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const access = await authenticateStarInterviewRequest(request);
  if (!access || !access.scopes.includes("resumes:read")) {
    return NextResponse.json({ error: "登录状态已失效，请重新连接拾星。" }, { status: 401 });
  }
  try {
    const { data, error } = await createAdminClient()
      .from("resumes")
      .select("*")
      .eq("user_id", access.sub)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json(
      {
        data: {
          resumes: (data ?? []).map((row) => {
            const resume = resumeRowToDocument(row);
            return {
              id: resume.id,
              title: resume.title,
              targetRole: resume.targetRole,
              templateId: resume.templateId,
              updatedAt: resume.updatedAt,
            };
          }),
        },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "简历暂时无法读取，请稍后重试。" }, { status: 500 });
  }
}
