import { NextRequest, NextResponse } from "next/server";
import { authenticateMiniProgramRequest } from "@/lib/miniprogram-auth";
import { toMiniProgramResume } from "@/lib/miniprogram-api";
import { DEFAULT_RESUME_SECTION_ORDER } from "@/lib/resume";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const TEMPLATE_IDS = [
  "compact",
  "classic",
  "modern",
  "consulting",
  "technical",
  "academic",
  "english_classic",
  "english_modern",
] as const;
type TemplateId = (typeof TEMPLATE_IDS)[number];

export async function GET(request: NextRequest) {
  const identity = authenticateMiniProgramRequest(request);
  if (!identity) {
    return NextResponse.json(
      { error: "登录状态已失效，请重新登录。" },
      { status: 401 },
    );
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("resumes")
      .select("*")
      .eq("user_id", identity.sub)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return NextResponse.json(
      { data: { resumes: (data ?? []).map(toMiniProgramResume) } },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "简历暂时无法读取，请稍后重试。" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const identity = authenticateMiniProgramRequest(request);
  if (!identity) {
    return NextResponse.json(
      { error: "登录状态已失效，请重新登录。" },
      { status: 401 },
    );
  }

  try {
    const body = (await request.json()) as {
      title?: unknown;
      targetRole?: unknown;
      templateId?: unknown;
    };
    const title = cleanText(body.title, 50) || "未命名简历";
    const targetRole = cleanText(body.targetRole, 80);
    const templateId: TemplateId =
      isTemplateId(body.templateId)
        ? body.templateId
        : "compact";
    const admin = createAdminClient();
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("display_name,city")
      .eq("id", identity.sub)
      .maybeSingle();
    if (profileError) throw profileError;

    const now = new Date().toISOString();
    const content = {
      basics: {
        name: profile?.display_name ?? "",
        englishName: "",
        photoDataUrl: "",
        phone: "",
        email: "",
        city: profile?.city ?? "",
        linkedin: "",
        github: "",
        website: "",
        targetRole,
      },
      sectionOrder: [...DEFAULT_RESUME_SECTION_ORDER],
      education: [],
      work: [],
      projects: [],
      skills: [],
      campus: [],
      awards: [],
      certifications: [],
      languages: [],
      customSections: [],
      __job_bottle_template_id: templateId,
    };
    const { data, error } = await admin
      .from("resumes")
      .insert({
        user_id: identity.sub,
        title,
        target_role: targetRole || null,
        template_id: templateId,
        content_json: content,
        created_at: now,
        updated_at: now,
      })
      .select("*")
      .single();
    if (error) throw error;

    return NextResponse.json(
      { data: { resume: toMiniProgramResume(data) } },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "简历创建失败，请稍后重试。" },
      { status: 500 },
    );
  }
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isTemplateId(value: unknown): value is TemplateId {
  return (
    typeof value === "string" &&
    (TEMPLATE_IDS as readonly string[]).includes(value)
  );
}
