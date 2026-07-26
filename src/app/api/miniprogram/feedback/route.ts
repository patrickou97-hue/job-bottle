import { NextRequest, NextResponse } from "next/server";
import { createFeedback } from "@/lib/feedback-server";
import { authenticateMiniProgramRequest } from "@/lib/miniprogram-auth";

export async function POST(request: NextRequest) {
  const identity = authenticateMiniProgramRequest(request);
  if (!identity) {
    return NextResponse.json(
      { error: "登录状态已失效，请重新登录。" },
      { status: 401 },
    );
  }
  try {
    const body = await request.json();
    const result = await createFeedback({
      platform: "miniprogram",
      userId: identity.sub,
      category: body?.category,
      content: body?.content,
      fingerprint: `user:${identity.sub}`,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }
    return NextResponse.json({ data: { submitted: true, id: result.id } });
  } catch {
    return NextResponse.json(
      { error: "反馈暂时无法提交，请稍后重试。" },
      { status: 500 },
    );
  }
}
