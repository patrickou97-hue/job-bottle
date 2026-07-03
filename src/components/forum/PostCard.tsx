"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  toggleLike,
  fetchUserLike,
  createComment,
  deleteComment,
  deletePost,
  fetchPost,
} from "@/lib/forum";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { SignalStrengthTicks } from "@/components/forum/SignalStrengthTicks";
import { freshnessTier, isFadingSignal, signalScore } from "@/lib/signal-score";
import type { ForumComment, ForumPost, ForumPostWithComments } from "@/lib/types";

type PostCardProps = {
  post: ForumPost;
  currentUserId: string | null;
  expanded: boolean;
  onToggle: () => void;
  onDeleted: () => void;
};

export function PostCard({
  post,
  currentUserId,
  expanded,
  onToggle,
  onDeleted,
}: PostCardProps) {
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [liked, setLiked] = useState(false);
  const [postLikeCount, setPostLikeCount] = useState(post.like_count);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isOwner = currentUserId === post.user_id;
  const authorName = (post as Record<string, unknown>).author_name as string ?? "匿名用户";
  const strength = signalScore({ replies: post.comment_count, lastActivityAt: post.updated_at });
  const freshness = freshnessTier(post.updated_at);
  const fading = isFadingSignal(post.updated_at);

  async function handleExpand() {
    if (!expanded && isSupabaseConfigured()) {
      setLoadingComments(true);
      try {
        const supabase = createClient();
        const full = (await fetchPost(supabase, post.id)) as ForumPostWithComments;
        setComments(full.comments);
        if (currentUserId) {
          const likedNow = await fetchUserLike(supabase, currentUserId, post.id);
          setLiked(likedNow);
        }
      } catch {
        // ignore
      } finally {
        setLoadingComments(false);
      }
    }
    onToggle();
  }

  async function handleLike() {
    if (!currentUserId || !isSupabaseConfigured()) return;
    const supabase = createClient();
    const isLiked = await toggleLike(supabase, currentUserId, post.id);
    setLiked(isLiked);
    setPostLikeCount((c) => (isLiked ? c + 1 : Math.max(c - 1, 0)));
  }

  async function handleSubmitComment() {
    const text = commentText.trim();
    if (!text || !currentUserId || !isSupabaseConfigured()) return;
    setSubmitting(true);
    try {
      const supabase = createClient();
      const comment = await createComment(supabase, currentUserId, post.id, text);
      setComments((prev) => [...prev, comment]);
      setCommentText("");
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!currentUserId || !isSupabaseConfigured()) return;
    const supabase = createClient();
    await deleteComment(supabase, currentUserId, commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  async function handleDeletePost() {
    if (!currentUserId || !isSupabaseConfigured()) return;
    if (!window.confirm("确定要删除这条信号吗？")) return;
    const supabase = createClient();
    await deletePost(supabase, currentUserId, post.id);
    onDeleted();
  }

  return (
    <div className="border-b border-white/[0.05] transition hover:bg-[color:var(--surface-hover-bg)]">
      {/* Header */}
      <button
        type="button"
        className="grid w-full grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 text-left"
        onClick={handleExpand}
      >
        <FreshnessDot tier={freshness} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className={post.category === "求助" ? "text-xs text-[color:var(--text-danger)] opacity-70" : "text-xs text-[color:var(--text-meta)]"}>
              [{post.category}]
            </span>
            <h3 className={`truncate text-[15px] font-medium text-[color:var(--text-primary)] ${fading ? "opacity-[0.65]" : ""}`}>
              {post.title}
            </h3>
            {post.is_pinned ? (
              <span className="inline-flex shrink-0 items-center gap-1 text-xs text-[color:var(--light-silver)]">
                ◆ 信标
              </span>
            ) : null}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[color:var(--text-muted)]">
            <span>来源：{authorName}</span>
            <span className="text-[color:var(--text-disabled)]">·</span>
            <span>接收于 {formatDateTime(post.created_at)}</span>
            {post.tags.length > 0 ? (
              <span className="text-[color:var(--text-muted)]">
                {post.tags.map((t) => `#${t}`).join(" ")}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-4 text-xs text-[color:var(--text-muted)]">
          <SignalStrengthTicks score={strength} />
          <span className="hidden tabular-nums sm:inline">
            回声 {post.comment_count} · 共鸣 {postLikeCount} · {formatDateTime(post.updated_at)}
          </span>
          <span className="text-[color:var(--text-muted)]">{expanded ? "收起" : "展开"}</span>
        </div>
      </button>

      {/* Expanded content */}
      {expanded ? (
        <div className="border-t border-white/[0.07] px-5 pb-5 pt-4">
          {/* Post content */}
          <div className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-ink-secondary">
            {post.content}
          </div>

          {/* Actions */}
          <div className="mb-4 flex items-center gap-3">
            <button
              type="button"
              onClick={handleLike}
              className={`relative inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                liked
                  ? "border-nebula-blue/25 bg-nebula-blue/8 text-[color:var(--light-silver)]"
                  : "border-white/[0.08] bg-white/[0.04] text-ink-muted hover:border-white/[0.15]"
              }`}
            >
              共鸣 {postLikeCount > 0 ? postLikeCount : 0}
            </button>

            {isOwner ? (
              <button
                type="button"
                onClick={handleDeletePost}
                className="inline-flex items-center gap-1.5 rounded-full border border-red-400/25 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-200 transition hover:bg-red-500/20"
              >
                <Trash2 aria-hidden="true" className="size-3.5" />
                删除信号
              </button>
            ) : null}
          </div>

          {/* Comments */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-ink-primary">
              回声 {comments.length > 0 ? `(${comments.length})` : ""}
            </h4>

            {loadingComments ? (
              <div className="py-3 text-center text-xs text-ink-muted">
                正在加载回声...
              </div>
            ) : comments.length === 0 ? (
              <div className="py-3 text-center text-xs text-ink-muted">
                暂无回声，来说点什么吧
              </div>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  className="border-l border-[rgba(159,180,206,0.15)] py-3 pl-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 text-xs text-ink-muted">
                      <span className="font-medium text-ink-secondary">
                        {(comment as Record<string, unknown>).author_name as string ?? "匿名用户"}
                      </span>
                      <span>{formatDateTime(comment.created_at)}</span>
                    </div>
                    {currentUserId === comment.user_id ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-ink-muted transition hover:text-red-300"
                        aria-label="删除评论"
                      >
                        <Trash2 aria-hidden="true" className="size-3.5" />
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink-secondary">
                    {comment.content}
                  </p>
                </div>
              ))
            )}

            {/* Comment input */}
            {currentUserId ? (
              <div className="flex gap-2">
                <Textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="发送回声..."
                  className="min-h-[60px] flex-1"
                  rows={2}
                />
                <Button
                  className="self-end"
                  disabled={!commentText.trim() || submitting}
                  onClick={handleSubmitComment}
                >
                  发送回声
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FreshnessDot({ tier }: { tier: "fresh" | "recent" | "old" }) {
  if (tier === "fresh") {
    return <span className="size-1.5 rounded-full bg-[color:var(--light-ice)] shadow-[0_0_10px_rgba(195,211,230,0.25)]" aria-hidden="true" />;
  }
  if (tier === "recent") {
    return <span className="size-1.5 rounded-full bg-[color:var(--light-muted)] opacity-80" aria-hidden="true" />;
  }
  return <span className="size-1.5 rounded-full border border-[color:var(--light-muted)] opacity-40" aria-hidden="true" />;
}
