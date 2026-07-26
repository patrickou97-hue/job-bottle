import type { Metadata } from "next";
import { StarInterviewConnectClient } from "./StarInterviewConnectClient";
import { resumeRowToDocument } from "@/lib/resume-sync";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "连接诘星",
  robots: { index: false, follow: false },
};

export default async function StarInterviewConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; install_id?: string; code_challenge?: string }>;
}) {
  const params = await searchParams;
  const state = /^[a-zA-Z0-9_-]{32,128}$/.test(params.state ?? "") ? params.state! : "";
  const installId = /^[0-9a-f-]{36}$/i.test(params.install_id ?? "") ? params.install_id! : "";
  const pkceChallenge = /^[a-zA-Z0-9_-]{43,128}$/.test(params.code_challenge ?? "")
    ? params.code_challenge!
    : "";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let resumes: { id: string; title: string; targetRole: string; updatedAt: string }[] = [];
  if (user) {
    const { data } = await supabase
      .from("resumes")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(20);
    resumes = (data ?? []).map((row) => {
      const resume = resumeRowToDocument(row);
      return {
        id: resume.id,
        title: resume.title,
        targetRole: resume.targetRole,
        updatedAt: resume.updatedAt,
      };
    });
  }
  const displayName =
    (typeof user?.user_metadata?.display_name === "string" && user.user_metadata.display_name) ||
    "拾星用户";

  return (
    <main className="space-root min-h-screen px-5 py-12 sm:grid sm:place-items-center sm:px-8">
      <div className="w-full max-w-xl">
        <p className="mb-5 text-center text-xs font-semibold tracking-[0.22em] text-ink-muted">拾星 · STARJOB</p>
        <StarInterviewConnectClient
          state={state}
          installId={installId}
          pkceChallenge={pkceChallenge}
          signedIn={Boolean(user)}
          displayName={displayName}
          resumes={resumes}
        />
      </div>
    </main>
  );
}
