import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assistantEdit, editorPatch } from "@/lib/application-assistant";
import { interpretApplicationMessage } from "@/lib/application-assistant-model";
import { UpstreamError } from "@/lib/deepseek-json";
import { createClient } from "@/lib/supabase/server";
import { checkVipIdentity, isVipSameOrigin, vipJson } from "@/lib/starjob-vip-server";

export const maxDuration = 60;
const target = { accountId: z.uuid(), id: z.uuid(), updatedAt: z.iso.datetime({ offset: true }) };
const bodySchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("chat"), accountId: z.uuid(), message: z.string().trim().min(1).max(700), history: z.array(z.string().max(1000)).max(6) }).strict(),
  z.object({ mode: z.literal("update"), ...target, edit: assistantEdit }).strict(),
  z.object({ mode: z.literal("delete"), ...target }).strict(),
]);

export async function POST(request: NextRequest) {
  if (!isVipSameOrigin(request)) return vipJson({ error: "请求来源无效。" }, 403);
  const identity = await checkVipIdentity(request);
  if (identity instanceof NextResponse) return identity;
  if (Number(request.headers.get("content-length")) > 40_000) return vipJson({ error: "消息过长。" }, 413);
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return vipJson({ error: "请检查消息或变更内容。" }, 400);
  const input = parsed.data;
  // Writes always use the current signed-in user's RLS client, including in local VIP preview.
  const db = await createClient();
  const userId = identity.userId;
  if (!userId || input.accountId !== userId) return vipJson({ error: "当前账号已变化，请刷新投递管理。" }, 403);
  if (input.mode === "chat") {
    const slot = await db.rpc("take_resume_ai_rate_slot");
    if (slot.error) return vipJson({ error: "暂时无法开始对话，请稍后重试。" }, 503);
    if (!slot.data) return vipJson({ error: "短时间内请求较多，请稍后再试。" }, 429);
    try {
      const intent = await interpretApplicationMessage(input.message, input.history, request.signal);
      return vipJson({ intent });
    } catch (error) {
      if ((error instanceof Error && error.message === "MODEL_UNAVAILABLE")
        || (error instanceof UpstreamError && [401, 403].includes(error.status))) {
        return vipJson({ error: "投递助手的模型服务暂不可用，请稍后再试。" }, 503);
      }
      return vipJson({ error: "这次未能解析指令，投递记录保持原样。请重试。" }, 502);
    }
  }

  const conflict = () => vipJson({ error: "记录已变化或已删除，请刷新记录后重新核对。" }, 409);
  if (input.mode === "delete") {
    const result = await db.from("user_applications").delete()
      .eq("user_id", userId).eq("id", input.id).eq("updated_at", input.updatedAt).select("id").maybeSingle();
    if (result.error) return vipJson({ error: "删除未能确认，请刷新记录核对。" }, 503);
    return result.data ? vipJson({ removed: result.data.id }) : conflict();
  }

  const current = await db.from("user_applications").select("workflow_nodes,progress_note")
    .eq("user_id", userId).eq("id", input.id).eq("updated_at", input.updatedAt).maybeSingle();
  if (current.error) return vipJson({ error: "暂时无法读取这条投递。" }, 503);
  if (!current.data) return conflict();
  let patch;
  try { patch = editorPatch(current.data, input.edit); }
  catch { return vipJson({ error: "这条投递没有这个阶段，请打开详情查看它的流程。" }, 422); }
  const result = await db.from("user_applications").update(patch)
    .eq("user_id", userId).eq("id", input.id).eq("updated_at", input.updatedAt).select("id,updated_at").maybeSingle();
  if (result.error) return vipJson({ error: "保存未能确认，请刷新记录核对。" }, 503);
  return result.data ? vipJson({ updated: result.data.id }) : conflict();
}
