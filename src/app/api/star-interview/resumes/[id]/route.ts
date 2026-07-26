import { NextRequest, NextResponse } from "next/server";
import { resumeRowToDocument } from "@/lib/resume-sync";
import { authenticateStarInterviewRequest } from "@/lib/star-interview-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await authenticateStarInterviewRequest(request);
  if (!access || !access.scopes.includes("resumes:read")) {
    return NextResponse.json({ error: "登录状态已失效，请重新连接拾星。" }, { status: 401 });
  }
  const { id } = await params;
  if (!access.selectedResumeIds.includes(id)) {
    return NextResponse.json({ error: "简历不存在。" }, { status: 404 });
  }
  try {
    const { data, error } = await createAdminClient()
      .from("resumes")
      .select("*")
      .eq("id", id)
      .eq("user_id", access.sub)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "简历不存在。" }, { status: 404 });
    const resume = resumeRowToDocument(data);
    return NextResponse.json(
      {
        data: {
          resume: {
            ...resume,
            content: {
              ...resume.content,
              basics: {
                ...resume.content.basics,
                photoDataUrl: "",
                phone: "",
                email: "",
              },
            },
          },
        },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "简历暂时无法读取，请稍后重试。" }, { status: 500 });
  }
}
