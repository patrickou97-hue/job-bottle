import { NextResponse } from "next/server";
import { z } from "zod";
import { exchangeStarInterviewAuthorizationCode } from "@/lib/star-interview-auth";

export const dynamic = "force-dynamic";

const schema = z.object({
  code: z.string().min(32).max(128),
  verifier: z.string().regex(/^[a-zA-Z0-9._~-]{43,128}$/),
  installId: z.uuid(),
  state: z.string().regex(/^[a-zA-Z0-9_-]{32,128}$/),
}).strict();

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "授权交换请求无效。" }, { status: 400 });
  }
  try {
    const session = await exchangeStarInterviewAuthorizationCode(parsed.data);
    if (!session) {
      return NextResponse.json(
        { error: "授权码无效、已使用或已过期，请重新连接拾星。" },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { data: { session } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "账户连接暂时无法完成，请稍后重试。" }, { status: 500 });
  }
}
