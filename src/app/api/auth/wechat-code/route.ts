import { NextRequest, NextResponse } from "next/server";
import {
  getWechatInternalEmail,
  isWechatInternalEmail,
} from "@/lib/account-identity";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  consumeWechatWebLoginCode,
  WechatWebLoginRateLimitError,
} from "@/lib/wechat-web-login";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    if (!hasTrustedOrigin(request)) {
      return NextResponse.json(
        { error: "请求来源无效，请从拾星登录页重试。" },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
    if (typeof body?.code !== "string" || !/^\d{8}$/.test(body.code)) {
      return NextResponse.json({ error: "请输入 8 位网页登录码。" }, { status: 400 });
    }

    const userId = await consumeWechatWebLoginCode(
      body.code,
      getRequestFingerprint(request),
    );
    if (!userId) {
      return NextResponse.json(
        { error: "网页登录码无效或已过期，请在小程序重新生成。" },
        { status: 401 },
      );
    }

    const admin = createAdminClient();
    const { data: authUser, error: userError } = await admin.auth.admin.getUserById(userId);
    if (userError || !authUser.user) throw userError ?? new Error("WeChat user missing.");

    let loginEmail = authUser.user.email;
    if (!loginEmail) {
      loginEmail = getWechatInternalEmail(userId);
      const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
        email: loginEmail,
        email_confirm: true,
        user_metadata: {
          ...authUser.user.user_metadata,
          display_name: authUser.user.user_metadata?.display_name || "微信用户",
          source: "wechat_miniprogram",
          account_origin: "wechat",
          email_kind: "internal",
        },
      });
      if (updateError) throw updateError;
    }
    if (isWechatInternalEmail(loginEmail) && authUser.user.user_metadata?.email_kind !== "internal") {
      const { error: metadataError } = await admin.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...authUser.user.user_metadata,
          source: "wechat_miniprogram",
          account_origin: "wechat",
          email_kind: "internal",
        },
      });
      if (metadataError) throw metadataError;
    }

    const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: loginEmail,
    });
    if (linkError) throw linkError;

    const supabase = await createClient();
    const { data: verified, error: verifyError } = await supabase.auth.verifyOtp({
      type: "magiclink",
      token_hash: link.properties.hashed_token,
    });
    if (verifyError || !verified.session) {
      throw verifyError ?? new Error("Web session was not created.");
    }

    return NextResponse.json(
      { data: { userId } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof WechatWebLoginRateLimitError) {
      return NextResponse.json(
        { error: "尝试次数过多，请 10 分钟后再试。" },
        { status: 429, headers: { "Retry-After": "600" } },
      );
    }
    return NextResponse.json(
      { error: "微信网页登录暂时不可用，请稍后重试。" },
      { status: 500 },
    );
  }
}

function hasTrustedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  const allowed = new Set([
    "https://www.starjob.space",
  ]);
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (configuredSiteUrl) {
    try {
      allowed.add(new URL(configuredSiteUrl).origin);
    } catch {
      // A malformed optional URL must not broaden the allowlist.
    }
  }
  if (process.env.NODE_ENV !== "production") {
    allowed.add(request.nextUrl.origin);
    allowed.add("http://localhost:3000");
    allowed.add("http://127.0.0.1:3000");
  }
  return allowed.has(origin);
}

function getRequestFingerprint(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = request.headers.get("x-real-ip") || forwardedFor || "unknown";
  const userAgent = request.headers.get("user-agent")?.slice(0, 200) || "unknown";
  return `${ip}\n${userAgent}`;
}
