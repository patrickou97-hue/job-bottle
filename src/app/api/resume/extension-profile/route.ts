import { NextResponse } from "next/server";
import { createExtensionMatchToken } from "@/lib/extension-match-token";
import { resumeRowToDocument } from "@/lib/resume-sync";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "请先登录拾星，再同步简历。" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("resumes")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    const resumes = (data ?? []).map((row) => {
      const document = resumeRowToDocument(row);
      return {
        ...document,
        content: {
          ...document.content,
          basics: {
            ...document.content.basics,
            photoDataUrl: "",
          },
        },
      };
    });
    const matchToken = createExtensionMatchToken(user.id);

    return NextResponse.json(
      {
        version: 1,
        resumes,
        syncedAt: new Date().toISOString(),
        aiMatchingAvailable: Boolean(matchToken && process.env.MIMO_API_KEY && process.env.MIMO_BASE_URL && process.env.MIMO_MODEL),
        matchToken: matchToken?.token || null,
        matchTokenExpiresAt: matchToken?.expiresAt || null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "简历同步暂时不可用，请稍后重试。" }, { status: 500 });
  }
}
