import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createStarInterviewSessionForUser } from "@/lib/star-interview-auth";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.email().max(254).transform((value) => value.trim().toLowerCase()),
  password: z.string().min(6).max(128),
  installId: z.uuid(),
}).strict();

export async function POST(request: Request) {
  if (request.headers.get("x-starinterview-client") !== "macos-v1") {
    return invalidCredentials();
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return invalidCredentials();
  }
  if (
    request.headers.get("x-starinterview-install-id") !== parsed.data.installId
  ) {
    return invalidCredentials();
  }

  try {
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
      email: parsed.data.email,
      password: parsed.data.password,
    });
    if (error || !data.user) {
      return invalidCredentials();
    }

    const session = await createStarInterviewSessionForUser(
      data.user.id,
      parsed.data.installId,
    );
    return NextResponse.json(
      { data: { session } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[star_interview_auth_email]", {
      code:
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : undefined,
    });
    return NextResponse.json(
      { error: "拾星登录暂时不可用，请稍后重试。" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
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
