import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createMiniProgramSession } from "@/lib/miniprogram-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: unknown;
      password?: unknown;
    };
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254 ||
      password.length < 6 ||
      password.length > 128
    ) {
      return invalidCredentials();
    }

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
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.user) return invalidCredentials();

    const session = await createMiniProgramSession(data.user.id);
    return NextResponse.json(
      {
        data: {
          session,
          isNewUser: false,
          needsAccountBinding: false,
          authMethod: "email",
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[miniprogram_auth_email]", {
      code:
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : undefined,
    });
    return NextResponse.json(
      { error: "邮箱登录暂时不可用，请稍后重试。" },
      { status: 500 },
    );
  }
}

function invalidCredentials() {
  return NextResponse.json(
    {
      error: "邮箱或密码不正确，请检查后重试。",
      code: "INVALID_EMAIL_CREDENTIALS",
    },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}
