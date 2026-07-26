import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { isWechatInternalEmail } from "@/lib/account-identity";
import {
  authenticateMiniProgramRequest,
  createMiniProgramSession,
  exchangeMiniProgramWechatCode,
  hashMiniProgramIdentifier,
  isActiveMiniProgramSession,
} from "@/lib/miniprogram-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const identity = authenticateMiniProgramRequest(request);
  if (!identity || !(await isActiveMiniProgramSession(identity))) {
    return unauthorized();
  }
  try {
    const admin = createAdminClient();
    const [{ data: auth }, { data: wechat }] = await Promise.all([
      admin.auth.admin.getUserById(identity.sub),
      admin
        .from("wechat_identities")
        .select("id")
        .eq("user_id", identity.sub)
        .maybeSingle(),
    ]);
    const email =
      auth.user?.email && !isWechatInternalEmail(auth.user.email)
        ? auth.user.email
        : "";
    return NextResponse.json({
      data: {
        hasEmail: Boolean(email),
        email,
        hasWechat: Boolean(wechat),
        wechatIdentityId: wechat?.id ?? null,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "账号信息暂时无法读取。" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const identity = authenticateMiniProgramRequest(request);
  if (!identity || !(await isActiveMiniProgramSession(identity))) {
    return unauthorized();
  }
  try {
    const body = await request.json();
    if (body?.action === "bind_wechat") {
      return await bindWechat(identity.sub, body.code);
    }
    if (body?.action === "bind_email") {
      return await bindEmail(identity.sub, body.email, body.password);
    }
    return NextResponse.json({ error: "账号操作无效。" }, { status: 400 });
  } catch {
    return NextResponse.json(
      { error: "账号绑定暂时无法完成，请稍后重试。" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const identity = authenticateMiniProgramRequest(request);
  if (!identity || !(await isActiveMiniProgramSession(identity))) {
    return unauthorized();
  }
  try {
    const admin = createAdminClient();
    const { data: auth } = await admin.auth.admin.getUserById(identity.sub);
    const email = auth.user?.email ?? "";
    if (!email || isWechatInternalEmail(email)) {
      return NextResponse.json(
        { error: "请先绑定真实邮箱，再解绑微信。" },
        { status: 409 },
      );
    }
    const { data, error } = await admin
      .from("wechat_identities")
      .delete()
      .eq("user_id", identity.sub)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: "当前账号没有绑定微信。" },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: { unbound: true } });
  } catch {
    return NextResponse.json(
      { error: "微信解绑暂时无法完成，请稍后重试。" },
      { status: 500 },
    );
  }
}

async function bindWechat(userId: string, code: unknown) {
  if (typeof code !== "string" || !code || code.length > 256) {
    return NextResponse.json({ error: "微信登录凭证无效。" }, { status: 400 });
  }
  const wechat = await exchangeMiniProgramWechatCode(code);
  if (!wechat.openid) {
    return NextResponse.json(
      { error: "微信验证失败，请重新尝试。" },
      { status: 401 },
    );
  }
  const admin = createAdminClient();
  const openidHash = hashMiniProgramIdentifier("openid", wechat.openid);
  const unionidHash = wechat.unionid
    ? hashMiniProgramIdentifier("unionid", wechat.unionid)
    : null;
  const [{ data: byWechat }, { data: byUser }] = await Promise.all([
    admin
      .from("wechat_identities")
      .select("id,user_id")
      .eq("openid_hash", openidHash)
      .maybeSingle(),
    admin
      .from("wechat_identities")
      .select("id,user_id")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  if (byWechat && byWechat.user_id !== userId) {
    return NextResponse.json(
      { error: "这个微信已绑定其他拾星账号。" },
      { status: 409 },
    );
  }
  if (byUser && byUser.id !== byWechat?.id) {
    return NextResponse.json(
      { error: "当前账号已经绑定了另一个微信。" },
      { status: 409 },
    );
  }
  if (!byWechat) {
    const { error } = await admin.from("wechat_identities").insert({
      user_id: userId,
      openid_hash: openidHash,
      unionid_hash: unionidHash,
    });
    if (error) throw error;
  }
  return NextResponse.json({ data: { bound: true } });
}

async function bindEmail(
  sourceUserId: string,
  emailValue: unknown,
  passwordValue: unknown,
) {
  const email =
    typeof emailValue === "string" ? emailValue.trim().toLowerCase() : "";
  const password = typeof passwordValue === "string" ? passwordValue : "";
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    password.length < 6 ||
    password.length > 128
  ) {
    return invalidCredentials();
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase configuration is missing.");
  const supabase = createSupabaseClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user) return invalidCredentials();
  const targetUserId = data.user.id;
  if (targetUserId === sourceUserId) {
    return NextResponse.json({
      data: { bound: true, session: await createMiniProgramSession(targetUserId) },
    });
  }
  const admin = createAdminClient();
  const { data: merged, error: mergeError } = await admin.rpc(
    "merge_wechat_user_into_email_user",
    { source_user_id: sourceUserId, target_user_id: targetUserId },
  );
  if (mergeError) throw mergeError;
  if (!merged) {
    return NextResponse.json(
      { error: "目标邮箱账号已绑定其他微信，无法合并。" },
      { status: 409 },
    );
  }
  const session = await createMiniProgramSession(targetUserId);
  await admin.auth.admin.deleteUser(sourceUserId);
  return NextResponse.json({ data: { bound: true, session } });
}

function invalidCredentials() {
  return NextResponse.json(
    { error: "邮箱或密码不正确，请检查后重试。" },
    { status: 401 },
  );
}

function unauthorized() {
  return NextResponse.json(
    { error: "登录状态已失效，请重新登录。" },
    { status: 401 },
  );
}
