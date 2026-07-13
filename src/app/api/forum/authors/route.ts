import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { ProfileRole } from "@/lib/types";

const MAX_AUTHORS_PER_REQUEST = 100;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AuthorProfile = {
  id: string;
  display_name: string | null;
  role: ProfileRole;
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
      .select("id, display_name, role")
      .in("id", userIds);

    if (error) throw error;

    const authors = Object.fromEntries(
      ((data ?? []) as AuthorProfile[]).map((profile) => {
        const displayName = profile.display_name?.trim() || "匿名用户";
        const name =
          profile.role === "admin"
            ? displayName
            : `${Array.from(displayName).slice(0, 3).join("")}***`;

        return [profile.id, { name, role: profile.role }];
      }),
    );

    return NextResponse.json(
      { authors },
      { headers: { "Cache-Control": "private, max-age=60" } },
    );
  } catch {
    return NextResponse.json(
      { error: "作者信息读取失败，请稍后重试。" },
      { status: 500 },
    );
  }
}
