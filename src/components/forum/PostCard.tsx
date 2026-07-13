"use client";

import { useState } from "react";
import { Pin, PinOff, Trash2 } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  toggleLike,
  fetchUserLike,
  createComment,
  deleteComment,
  deletePost,
  fetchPost,
  setPostPinned,
} from "@/lib/forum";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { SignalStrengthTicks } from "@/components/forum/SignalStrengthTicks";
import { freshnessTier, isFadingSignal, signalScore } from "@/lib/signal-score";
import type { ForumCommentView, ForumPostView, ForumPostWithComments } from "@/lib/types";

type PostCardProps = {
  post: ForumPostView;
  currentUserId: string | null;
  isAdmin: boolean;
  expanded: boolean;
  onToggle: () => void;
  onDeleted: () => void;
  onPinnedChange: (postId: string, isPinned: boolean) => void;
};

export function PostCard({
  post,
  currentUserId,
  isAdmin,
  expanded,
  onToggle,
  onDeleted,
  onPinnedChange,
}: PostCardProps) {
  const [comments, setComments] = useState<ForumCommentView[]>([]);
  const [commentText, setCommentText] = useState("");
  const [liked, setLiked] = useState(false);
  const [postLikeCount, setPostLikeCount] = useState(post.like_count);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  const isOwner = currentUserId === post.user_id;
  const authorName = post.author_name;
  const strength = signalScore({ replies: post.comment_count, lastActivityAt: post.created_at });
  const freshness = freshnessTier(post.created_at);
  const fading = isFadingSignal(post.created_at);

  async function handleExpand() {
    if (!expanded && isSupabaseConfigured()) {
      setLoadingComments(true);
      setActionMessage("");
      try {
        const supabase = createClient();
        const full = (await fetchPost(supabase, post.id)) as ForumPostWithComments;
        setComments(full.comments);
        if (currentUserId) {
          const likedNow = await fetchUserLike(supabase, currentUserId, post.id);
          setLiked(likedNow);
        }
      } catch {
        setActionMessage("评论读取失败，请检查网络后重试。");
      } finally {
        setLoadingComments(false);
      }
    }
    onToggle();
  }

  async function handleLike() {
    if (!currentUserId) {
      setActionMessage("登录后可以点赞。");
      return;
    }
    if (!isSupabaseConfigured() || actionBusy) return;
    setActionBusy(true);
    setActionMessage("");
    try {
      const isLiked = await toggleLike(createClient(), currentUserId, post.id);
      setLiked(isLiked);
      setPostLikeCount((count) => (isLiked ? count + 1 : Math.max(count - 1, 0)));
    } catch {
      setActionMessage("点赞状态保存失败，请稍后重试。");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleSubmitComment() {
    const text = commentText.trim();
    if (!text || !currentUserId || !isSupabaseConfigured()) return;
    setSubmitting(true);
    setActionMessage("");
    try {
      const supabase = createClient();
      const comment = await createComment(supabase, currentUserId, post.id, text);
      setComments((prev) => [...prev, comment]);
      setCommentText("");
    } catch {
      setActionMessage("评论发布失败，请检查网络后重试。");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!currentUserId || !isSupabaseConfigured()) return;
    setActionBusy(true);
    setActionMessage("");
    try {
      await deleteComment(createClient(), currentUserId, commentId);
      setComments((current) => current.filter((comment) => comment.id !== commentId));
    } catch {
      setActionMessage("评论删除失败，请稍后重试。");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleDeletePost() {
    if (!currentUserId || !isSupabaseConfigured()) return;
    if (!window.confirm("确定要删除这条帖子吗？")) return;
    setActionBusy(true);
    setActionMessage("");
    try {
      await deletePost(createClient(), currentUserId, post.id);
      onDeleted();
    } catch {
      setActionMessage("帖子删除失败，请稍后重试。");
    } finally {
      setActionBusy(false);
    }
  }

  async function handlePinPost() {
    if (!isAdmin || actionBusy) return;
    const nextPinned = !post.is_pinned;
    setActionBusy(true);
    setActionMessage("");
    try {
      await setPostPinned(post.id, nextPinned);
      onPinnedChange(post.id, nextPinned);
      setActionMessage(nextPinned ? "已置顶，所有用户都会优先看到这条内容。" : "已取消置顶。");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "置顶状态保存失败，请稍后重试。");
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <div
      data-pinned={post.is_pinned}
      className={`border-b transition ${post.is_pinned ? "border-[#efc29a]/25 bg-[linear-gradient(90deg,rgba(239,194,154,0.11),rgba(126,124,181,0.035)_55%,transparent)] shadow-[inset_3px_0_0_rgba(239,194,154,0.82)]" : "border-white/[0.05] hover:bg-[color:var(--surface-hover-bg)]"}`}
    >
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
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#efc29a] px-2 py-1 text-[11px] font-bold tracking-[0.08em] text-[#121827] shadow-[0_0_20px_rgba(239,194,154,0.24)]">
                <Pin aria-hidden="true" className="size-3 fill-current" />
                全站置顶
              </span>
            ) : null}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[color:var(--text-muted)]">
            <span>来源：{authorName}</span>
            <span className="text-[color:var(--text-disabled)]">·</span>
            <span>发布于 {formatDateTime(post.created_at)}</span>
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
            评论 {post.comment_count} · 点赞 {postLikeCount}
          </span>
          <span className="text-[color:var(--text-muted)]">{expanded ? "收起" : "展开"}</span>
        </div>
      </button>

      {/* Expanded content */}
      {expanded ? (
        <div className="border-t border-white/[0.06] px-5 pb-7 pt-5 sm:px-10">
          {/* Post content */}
          <div className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-ink-secondary">
            {post.content}
          </div>

          {/* Actions */}
          <div className="mb-4 flex items-center gap-3">
            {isAdmin ? (
              <button
                type="button"
                onClick={handlePinPost}
                disabled={actionBusy}
                className="pressable inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] px-3 py-1.5 text-xs font-medium text-[color:var(--light-silver)] transition hover:bg-white/[0.06]"
              >
                {post.is_pinned ? <PinOff aria-hidden="true" className="size-3.5" /> : <Pin aria-hidden="true" className="size-3.5" />}
                {post.is_pinned ? "取消置顶" : "置顶帖子"}
              </button>
            ) : null}

            <button
              type="button"
              onClick={handleLike}
              disabled={actionBusy}
              className={`pressable relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                liked
                  ? "bg-nebula-blue/8 text-[color:var(--light-silver)]"
                  : "bg-white/[0.04] text-ink-muted hover:bg-white/[0.07]"
              }`}
            >
              点赞 {postLikeCount > 0 ? postLikeCount : 0}
            </button>

            {isOwner ? (
              <button
                type="button"
                onClick={handleDeletePost}
                disabled={actionBusy}
                className="pressable inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-[color:var(--text-danger)] transition hover:bg-[rgba(127,85,104,0.16)]"
              >
                <Trash2 aria-hidden="true" className="size-3.5" />
                删除帖子
              </button>
            ) : null}
          </div>

          {actionMessage ? (
            <p className="mb-4 text-sm text-[#d8a8b7]" role="status" aria-live="polite">
              {actionMessage}
            </p>
          ) : null}

          {/* Comments */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-ink-primary">
              评论 {comments.length > 0 ? `(${comments.length})` : ""}
            </h4>

            {loadingComments ? (
              <div className="empty-state min-h-24 py-3">
                <span className="loading-line text-xs">正在读取评论</span>
              </div>
            ) : comments.length === 0 ? (
              <div className="empty-state min-h-24 py-3 text-xs">
                暂无评论
              </div>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  className="border-l border-[rgba(201,197,228,0.15)] py-3 pl-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 text-xs text-ink-muted">
                      <span className="font-medium text-ink-secondary">
                        {comment.author_name}
                      </span>
                      <span>{formatDateTime(comment.created_at)}</span>
                    </div>
                    {currentUserId === comment.user_id ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(comment.id)}
                        disabled={actionBusy}
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
                  placeholder="写下评论"
                  className="min-h-[60px] flex-1"
                  rows={2}
                />
                <Button
                  className="self-end"
                  disabled={!commentText.trim() || submitting}
                  onClick={handleSubmitComment}
                >
                  发布评论
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
    return <span className="size-1.5 rounded-full bg-[color:var(--light-ice)] shadow-[0_0_10px_rgba(201,197,228,0.28)]" aria-hidden="true" />;
  }
  if (tier === "recent") {
    return <span className="size-1.5 rounded-full bg-[color:var(--light-muted)] opacity-80" aria-hidden="true" />;
  }
  return <span className="size-1.5 rounded-full bg-[color:var(--light-muted)] opacity-25" aria-hidden="true" />;
}
