import { NextResponse } from "next/server";
import { z } from "zod";
import { createStarInterviewAuthorizationCode } from "@/lib/star-interview-auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({
  installId: z.uuid(),
  state: z.string().regex(/^[a-zA-Z0-9_-]{32,128}$/),
  pkceChallenge: z.string().regex(/^[a-zA-Z0-9_-]{43,128}$/),
  selectedResumeIds: z.array(z.uuid()).min(1).max(10),
}).strict();

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "授权请求无效，请返回诘星重试。" }, { status: 400 });
  }
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: "请先登录拾星，再授权诘星。" }, { status: 401 });
    }
    const authorization = await createStarInterviewAuthorizationCode({
      userId: user.id,
      ...parsed.data,
    });
    if (!authorization) {
      return NextResponse.json({ error: "所选简历不存在或无权访问。" }, { status: 404 });
    }
    return NextResponse.json(
      { data: { ...authorization, state: parsed.data.state } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "授权暂时不可用，请稍后重试。" }, { status: 500 });
  }
}
