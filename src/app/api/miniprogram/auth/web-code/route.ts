import { NextRequest, NextResponse } from "next/server";
import {
  authenticateMiniProgramRequest,
  isActiveMiniProgramSession,
} from "@/lib/miniprogram-auth";
import {
  createWechatWebLoginCode,
  WechatWebLoginRateLimitError,
} from "@/lib/wechat-web-login";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const access = authenticateMiniProgramRequest(request);
  if (!access) {
    return NextResponse.json(
      { error: "登录状态已失效，请重新登录。" },
      { status: 401 },
    );
  }

  try {
    if (!(await isActiveMiniProgramSession(access))) {
      return NextResponse.json(
        { error: "登录状态已失效，请重新登录。" },
        { status: 401 },
      );
    }
    const result = await createWechatWebLoginCode(access.sub);
    return NextResponse.json(
      { data: result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof WechatWebLoginRateLimitError) {
      return NextResponse.json(
        { error: "生成过于频繁，请 30 秒后再试。" },
        { status: 429, headers: { "Retry-After": "30" } },
      );
    }
    return NextResponse.json(
      { error: "网页登录码生成失败，请稍后重试。" },
      { status: 500 },
    );
  }
}
