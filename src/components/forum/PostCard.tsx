"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BookOpen, Megaphone, Pencil, Pin, PinOff, Sparkles, Trash2 } from "lucide-react";
import { deletePost, setPostPinned, updatePost } from "@/lib/forum";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import type { ForumPostView } from "@/lib/types";

type PostCardProps = {
  post: ForumPostView;
  isAdmin: boolean;
  expanded: boolean;
  onToggle: () => void;
  onDeleted: () => void;
  onPinnedChange: (postId: string, isPinned: boolean) => void;
  onUpdated: (
    postId: string,
    updates: Pick<ForumPostView, "title" | "content" | "category" | "tags">,
  ) => void;
};

const GUIDE_CATEGORIES = ["公告", "教程", "分享"] as const;

export function PostCard({
  post,
  isAdmin,
  expanded,
  onToggle,
  onDeleted,
  onPinnedChange,
  onUpdated,
}: PostCardProps) {
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title);
  const [editCategory, setEditCategory] = useState(post.category);
  const [editContent, setEditContent] = useState(post.content);
  const [editTags, setEditTags] = useState(post.tags.join("，"));
  const reducedMotion = useReducedMotion();
  const contentId = `guide-content-${post.id}`;

  function beginEditing() {
    setEditTitle(post.title);
    setEditCategory(post.category);
    setEditContent(post.content);
    setEditTags(post.tags.join("，"));
    setActionMessage("");
    setEditing(true);
  }

  async function handleUpdatePost() {
    if (!isAdmin || actionBusy) return;
    const title = editTitle.trim();
    const content = editContent.trim();
    if (!title || title.length > 120) {
      setActionMessage("请输入不超过 120 字的标题。");
      return;
    }
    if (!content || content.length > 5000) {
      setActionMessage("请输入不超过 5000 字的正文。");
      return;
    }

    const category = GUIDE_CATEGORIES.includes(editCategory as (typeof GUIDE_CATEGORIES)[number])
      ? editCategory
      : "公告";
    const tags = editTags
      .split(/[,，、\s]+/)
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 8);

    setActionBusy(true);
    setActionMessage("");
    try {
      await updatePost(post.id, { title, content, category, tags });
      onUpdated(post.id, { title, content, category, tags });
      setEditing(false);
      setActionMessage("内容已更新。");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "内容保存失败，请稍后重试。");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleDeletePost() {
    if (!isAdmin || actionBusy) return;
    if (!window.confirm("确定删除这条指南内容吗？")) return;
    setActionBusy(true);
    setActionMessage("");
    try {
      await deletePost(post.id);
      onDeleted();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "内容删除失败，请稍后重试。");
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
      setActionMessage(nextPinned ? "已设为重点内容。" : "已取消重点标记。");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "重点状态保存失败，请稍后重试。");
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <motion.article
      layout
      transition={reducedMotion ? { duration: 0 } : { layout: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } }}
      data-pinned={post.is_pinned}
      className={`border-b transition ${post.is_pinned ? "border-[#d8b08b] bg-[#fff8f1] shadow-[inset_3px_0_0_#c9864f]" : "border-[color:var(--line-ghost)] hover:bg-[color:var(--surface-hover-bg)]"}`}
    >
      <button
        type="button"
        className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-5 text-left sm:px-5"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={contentId}
      >
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <CategoryLabel category={post.category} />
            <h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold text-[color:var(--text-primary)] sm:text-base">
              {post.title}
            </h2>
            {post.is_pinned ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[#efc29a] px-2 py-1 text-[11px] font-bold tracking-[0.08em] text-[#121827]">
                <Pin aria-hidden="true" className="size-3 fill-current" />
                重点推荐
              </span>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[color:var(--text-muted)]">
            <span className="font-medium text-[color:var(--text-secondary)]">拾星官方</span>
            <span aria-hidden="true">·</span>
            <span>发布于 {formatDateTime(post.created_at)}</span>
            {post.tags.length > 0 ? (
              <span>{post.tags.map((tag) => `#${tag}`).join(" ")}</span>
            ) : null}
          </div>
        </div>
        <span className="shrink-0 text-xs font-medium text-[color:var(--text-muted)]">
          {expanded ? "收起" : "阅读全文"}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key={contentId}
            id={contentId}
            initial={reducedMotion ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: reducedMotion ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="border-t border-[color:var(--line-ghost)] px-5 pb-7 pt-5 sm:px-10"
          >
            {editing ? (
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleUpdatePost();
                }}
              >
                <div>
                  <label htmlFor={`guide-title-${post.id}`} className="mb-1 block text-xs font-medium text-ink-muted">标题</label>
                  <Input id={`guide-title-${post.id}`} value={editTitle} maxLength={120} onChange={(event) => setEditTitle(event.target.value)} />
                </div>
                <div>
                  <label htmlFor={`guide-category-${post.id}`} className="mb-1 block text-xs font-medium text-ink-muted">分类</label>
                  <Select id={`guide-category-${post.id}`} value={editCategory} onChange={(event) => setEditCategory(event.target.value)}>
                    {GUIDE_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                  </Select>
                </div>
                <div>
                  <label htmlFor={`guide-body-${post.id}`} className="mb-1 block text-xs font-medium text-ink-muted">正文</label>
                  <Textarea id={`guide-body-${post.id}`} value={editContent} maxLength={5000} rows={9} onChange={(event) => setEditContent(event.target.value)} />
                  <p className="mt-1 text-right text-xs text-ink-muted">{editContent.length} / 5000</p>
                </div>
                <div>
                  <label htmlFor={`guide-tags-${post.id}`} className="mb-1 block text-xs font-medium text-ink-muted">标签（可选，逗号分隔）</label>
                  <Input id={`guide-tags-${post.id}`} value={editTags} onChange={(event) => setEditTags(event.target.value)} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={actionBusy}>{actionBusy ? "保存中" : "保存修改"}</Button>
                  <Button type="button" variant="secondary" disabled={actionBusy} onClick={() => setEditing(false)}>取消</Button>
                </div>
              </form>
            ) : (
              <div className="max-w-3xl whitespace-pre-wrap text-[15px] leading-8 text-ink-secondary">
                {post.content}
              </div>
            )}

            {isAdmin && !editing ? (
              <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-[color:var(--line-ghost)] pt-4">
                <button type="button" onClick={handlePinPost} disabled={actionBusy} className="pressable inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:bg-[color:var(--surface-hover-bg)] hover:text-ink-primary">
                  {post.is_pinned ? <PinOff aria-hidden="true" className="size-3.5" /> : <Pin aria-hidden="true" className="size-3.5" />}
                  {post.is_pinned ? "取消重点" : "设为重点"}
                </button>
                <button type="button" onClick={beginEditing} disabled={actionBusy} className="pressable inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:bg-[color:var(--surface-hover-bg)] hover:text-ink-primary">
                  <Pencil aria-hidden="true" className="size-3.5" />
                  编辑内容
                </button>
                <button type="button" onClick={handleDeletePost} disabled={actionBusy} className="pressable inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[color:var(--text-danger)] transition hover:bg-[rgba(127,85,104,0.12)]">
                  <Trash2 aria-hidden="true" className="size-3.5" />
                  删除内容
                </button>
              </div>
            ) : null}

            {actionMessage ? <p className="mt-4 text-sm text-[#a66f81]" role="status" aria-live="polite">{actionMessage}</p> : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.article>
  );
}

function CategoryLabel({ category }: { category: string }) {
  const config = category === "公告"
    ? { icon: Megaphone, className: "bg-[#f4e7db] text-[#7c4d2d]" }
    : category === "教程"
      ? { icon: BookOpen, className: "bg-[#e7edf6] text-[#36587e]" }
      : { icon: Sparkles, className: "bg-[#eee9f3] text-[#684f78]" };
  const Icon = config.icon;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold ${config.className}`}>
      <Icon aria-hidden="true" className="size-3" />
      {category}
    </span>
  );
}
