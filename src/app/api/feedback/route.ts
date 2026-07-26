import { NextRequest, NextResponse } from "next/server";
import { createFeedback } from "@/lib/feedback-server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "请求来源无效。" }, { status: 403 });
  }
  try {
    const body = await request.json();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const result = await createFeedback({
      platform: "web",
      userId: user?.id ?? null,
      category: body?.category,
      content: body?.content,
      contactEmail: body?.contactEmail,
      fingerprint: requestFingerprint(request),
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }
    return NextResponse.json({ submitted: true, id: result.id });
  } catch {
    return NextResponse.json(
      { error: "反馈暂时无法提交，请稍后重试。" },
      { status: 500 },
    );
  }
}

function isTrustedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const allowed = new Set([
    request.nextUrl.origin,
    "https://www.starjob.space",
    "https://starjob.space",
  ]);
  return allowed.has(origin);
}

function requestFingerprint(request: NextRequest) {
  return [
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
    request.headers.get("user-agent") || "unknown",
  ].join("|");
}
