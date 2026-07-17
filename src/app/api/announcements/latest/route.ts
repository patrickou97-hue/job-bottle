import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

const ANNOUNCEMENT_SEEN_ID_KEY = "latest_announcement_seen_id";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "请先登录后查看最新公告。" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: candidates, error: announcementError } = await admin
      .from("forum_posts")
      .select("id,user_id,title,content,category,tags,created_at")
      .eq("category", "公告")
      .order("created_at", { ascending: false })
      .limit(20);
    if (announcementError) throw announcementError;
    if (!candidates?.length) return noAnnouncement();

    const authorIds = [...new Set(candidates.map((post) => post.user_id))];
    const { data: profiles, error: profileError } = await admin
      .from("profiles")
      .select("id,role")
      .in("id", authorIds);
    if (profileError) throw profileError;
    const adminIds = new Set((profiles as Pick<Profile, "id" | "role">[]).filter((profile) => profile.role === "admin").map((profile) => profile.id));
    const announcement = candidates.find((post) => adminIds.has(post.user_id));
    if (!announcement) return noAnnouncement();

    const accountCreatedAt = new Date(user.created_at).getTime();
    const announcementCreatedAt = new Date(announcement.created_at).getTime();
    if (!Number.isFinite(accountCreatedAt) || !Number.isFinite(announcementCreatedAt) || accountCreatedAt >= announcementCreatedAt) {
      return noAnnouncement();
    }

    if (user.user_metadata?.[ANNOUNCEMENT_SEEN_ID_KEY] === announcement.id) {
      return noAnnouncement();
    }

    return NextResponse.json({
      announcement: {
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        tags: announcement.tags ?? [],
        createdAt: announcement.created_at,
      },
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[latest_announcement]", {
      code: error && typeof error === "object" && "code" in error ? String(error.code) : undefined,
    });
    return NextResponse.json({ error: "最新公告暂时无法读取。" }, { status: 500 });
  }
}

function noAnnouncement() {
  return NextResponse.json({ announcement: null }, { headers: { "Cache-Control": "private, no-store" } });
}
