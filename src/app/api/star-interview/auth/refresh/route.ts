import { NextResponse } from "next/server";
import { z } from "zod";
import { rotateStarInterviewSession } from "@/lib/star-interview-auth";

export const dynamic = "force-dynamic";

const schema = z.object({
  refreshToken: z.string().min(32).max(256),
  installId: z.uuid(),
}).strict();

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "刷新凭证无效。" }, { status: 400 });
  }
  try {
    const session = await rotateStarInterviewSession(
      parsed.data.refreshToken,
      parsed.data.installId,
    );
    if (!session) {
      return NextResponse.json({ error: "登录状态已失效，请重新连接拾星。" }, { status: 401 });
    }
    return NextResponse.json(
      { data: { session } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "登录状态刷新失败，请稍后重试。" }, { status: 500 });
  }
}
