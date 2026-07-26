import { NextRequest, NextResponse } from "next/server";
import {
  authenticateStarInterviewRequest,
  revokeStarInterviewSession,
} from "@/lib/star-interview-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const access = await authenticateStarInterviewRequest(request);
  if (!access) {
    return NextResponse.json({ error: "登录状态已失效。" }, { status: 401 });
  }
  try {
    await revokeStarInterviewSession(access.sid, access.sub);
    return NextResponse.json(
      { data: { loggedOut: true } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "暂时无法断开账户，请稍后重试。" }, { status: 500 });
  }
}
