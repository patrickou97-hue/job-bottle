import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  createMiniProgramSession,
  hashMiniProgramIdentifier,
} from "@/lib/miniprogram-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type WechatCodeSessionResponse = {
  openid?: string;
  unionid?: string;
  session_key?: string;
  errcode?: number;
  errmsg?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { code?: unknown };
    if (
      typeof body.code !== "string" ||
      body.code.length < 1 ||
      body.code.length > 256
    ) {
      return NextResponse.json(
        { error: "微信登录凭证无效。", code: "INVALID_WECHAT_CODE" },
        { status: 400 },
      );
    }

    const wechat = await exchangeWechatCode(body.code);
    if (!wechat.openid) {
      console.warn("[miniprogram_auth_wechat_exchange]", {
        errcode: wechat.errcode,
      });
      return NextResponse.json(
        { error: "微信登录验证失败，请重新尝试。", code: "WECHAT_LOGIN_FAILED" },
        { status: 401 },
      );
    }

    const admin = createAdminClient();
    const openidHash = hashMiniProgramIdentifier("openid", wechat.openid);
    const unionidHash = wechat.unionid
      ? hashMiniProgramIdentifier("unionid", wechat.unionid)
      : null;
    const { data: existing, error: identityError } = await admin
      .from("wechat_identities")
      .select("id,user_id")
      .eq("openid_hash", openidHash)
      .maybeSingle();
    if (identityError) throw identityError;

    let userId = existing?.user_id;
    let isNewUser = false;
    if (existing) {
      const { error: updateError } = await admin
        .from("wechat_identities")
        .update({
          unionid_hash: unionidHash,
          updated_at: new Date().toISOString(),
          last_login_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (updateError) throw updateError;
    } else {
      const anonymousUserId = await createAnonymousSupabaseUser();
      const { data: created, error: createError } = await admin
        .from("wechat_identities")
        .insert({
          user_id: anonymousUserId,
          openid_hash: openidHash,
          unionid_hash: unionidHash,
        })
        .select("user_id")
        .maybeSingle();

      if (createError || !created) {
        const { data: raced } = await admin
          .from("wechat_identities")
          .select("user_id")
          .eq("openid_hash", openidHash)
          .maybeSingle();
        if (!raced) {
          await admin.auth.admin.deleteUser(anonymousUserId);
          throw createError ?? new Error("Failed to create WeChat identity.");
        }
        await admin.auth.admin.deleteUser(anonymousUserId);
        userId = raced.user_id;
      } else {
        userId = created.user_id;
        isNewUser = true;
      }
    }

    if (!userId) throw new Error("WeChat identity has no user.");
    const session = await createMiniProgramSession(userId);
    return NextResponse.json(
      {
        data: {
          session,
          isNewUser,
          needsAccountBinding: true,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[miniprogram_auth_wechat]", {
      code:
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : undefined,
    });
    return NextResponse.json(
      { error: "微信登录暂时不可用，请稍后重试。" },
      { status: 500 },
    );
  }
}

async function exchangeWechatCode(code: string) {
  const appId = process.env.WECHAT_MINIPROGRAM_APP_ID;
  const appSecret = process.env.WECHAT_MINIPROGRAM_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error("WeChat Mini Program credentials are missing.");
  }

  const url = new URL("https://api.weixin.qq.com/sns/jscode2session");
  url.search = new URLSearchParams({
    appid: appId,
    secret: appSecret,
    js_code: code,
    grant_type: "authorization_code",
  }).toString();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`WeChat HTTP ${response.status}`);
    return (await response.json()) as WechatCodeSessionResponse;
  } finally {
    clearTimeout(timeout);
  }
}

async function createAnonymousSupabaseUser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !publishableKey) {
    throw new Error("Supabase public server configuration is missing.");
  }

  const supabase = createSupabaseClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
  const { data, error } = await supabase.auth.signInAnonymously({
    options: {
      data: {
        display_name: "微信用户",
        source: "wechat_miniprogram",
      },
    },
  });
  if (error || !data.user) {
    throw error ?? new Error("Failed to create anonymous auth user.");
  }
  return data.user.id;
}
