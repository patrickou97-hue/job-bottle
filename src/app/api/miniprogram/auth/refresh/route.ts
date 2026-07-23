import { NextResponse } from "next/server";
import { rotateMiniProgramSession } from "@/lib/miniprogram-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { refreshToken?: unknown };
    if (
      typeof body.refreshToken !== "string" ||
      body.refreshToken.length < 32 ||
      body.refreshToken.length > 256
    ) {
      return NextResponse.json(
        { error: "刷新凭证无效。", code: "INVALID_REFRESH_TOKEN" },
        { status: 400 },
      );
    }

    const session = await rotateMiniProgramSession(body.refreshToken);
    if (!session) {
      return NextResponse.json(
        { error: "登录状态已失效，请重新登录。", code: "SESSION_EXPIRED" },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { data: { session } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[miniprogram_auth_refresh]", {
      code:
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : undefined,
    });
    return NextResponse.json(
      { error: "登录状态刷新失败，请稍后重试。" },
      { status: 500 },
    );
  }
}
