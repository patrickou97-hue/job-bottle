import { NextRequest, NextResponse } from "next/server";
import { authenticateMiniProgramRequest } from "@/lib/miniprogram-auth";
import { toMiniProgramProfile } from "@/lib/miniprogram-api";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

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
      .from("profiles")
      .select("*")
      .eq("id", identity.sub)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: "用户资料尚未建立。" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { data: { profile: toMiniProgramProfile(data) } },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "用户资料暂时无法读取，请稍后重试。" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const identity = authenticateMiniProgramRequest(request);
  if (!identity) {
    return NextResponse.json(
      { error: "登录状态已失效，请重新登录。" },
      { status: 401 },
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .update({
        display_name: cleanText(body.displayName, 50) || "拾星用户",
        phone: nullableText(body.phone, 30),
        city: nullableText(body.city, 50),
        school: nullableText(body.school, 100),
        major: nullableText(body.major, 100),
        graduation_year: nullableText(body.graduationYear, 20),
        preferred_regions: cleanList(body.preferredRegions, 12, 50),
        target_roles: cleanList(body.targetRoles, 12, 80),
        updated_at: new Date().toISOString(),
      })
      .eq("id", identity.sub)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: "用户资料尚未建立。" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { data: { profile: toMiniProgramProfile(data) } },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "个人资料保存失败，请稍后重试。" },
      { status: 500 },
    );
  }
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function nullableText(value: unknown, maxLength: number) {
  return cleanText(value, maxLength) || null;
}

function cleanList(value: unknown, maxItems: number, maxLength: number) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().slice(0, maxLength))
        .filter(Boolean),
    ),
  ).slice(0, maxItems);
}
