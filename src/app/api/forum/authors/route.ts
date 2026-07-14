import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

const MAX_AUTHORS_PER_REQUEST = 100;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AuthorProfile = {
  id: string;
  role: "admin";
};

export async function POST(request: NextRequest) {
  try {
    const input = (await request.json().catch(() => null)) as {
      userIds?: unknown;
    } | null;
    const userIds = Array.isArray(input?.userIds)
      ? [...new Set(input.userIds)]
      : [];

    if (
      userIds.length === 0 ||
      userIds.length > MAX_AUTHORS_PER_REQUEST ||
      !userIds.every(
        (userId): userId is string =>
          typeof userId === "string" && UUID_PATTERN.test(userId),
      )
    ) {
      return NextResponse.json({ error: "作者查询参数无效。" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select("id, role")
      .in("id", userIds)
      .eq("role", "admin");

    if (error) throw error;

    const authors = Object.fromEntries(
      ((data ?? []) as AuthorProfile[]).map((profile) => [
        profile.id,
        { name: "拾星官方", role: profile.role },
      ]),
    );

    return NextResponse.json(
      { authors },
      { headers: { "Cache-Control": "private, max-age=60" } },
    );
  } catch (error) {
    console.error("[forum_authors]", {
      code: error && typeof error === "object" && "code" in error ? String(error.code) : undefined,
    });
    return NextResponse.json(
      { error: "作者信息读取失败，请稍后重试。" },
      { status: 500 },
    );
  }
}
