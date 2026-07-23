import { NextRequest, NextResponse } from "next/server";
import {
  authenticateMiniProgramRequest,
  revokeMiniProgramSession,
} from "@/lib/miniprogram-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const identity = authenticateMiniProgramRequest(request);
  if (!identity) {
    return NextResponse.json(
      { error: "登录状态已失效，请重新登录。" },
      { status: 401 },
    );
  }

  try {
    const body = (await request.json()) as { refreshToken?: unknown };
    if (typeof body.refreshToken === "string") {
      await revokeMiniProgramSession(identity.sub, body.refreshToken);
    }
    return NextResponse.json(
      { data: { success: true } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "退出登录失败，请稍后重试。" },
      { status: 500 },
    );
  }
}
