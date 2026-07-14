"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { getCurrentUserOrNull } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { fetchPosts } from "@/lib/forum";
import { Button } from "@/components/ui/Button";
import { PostCard } from "@/components/forum/PostCard";
import { NewPostForm } from "@/components/forum/NewPostForm";
import { Drawer } from "@/components/ui/Drawer";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { ForumPostView } from "@/lib/types";

const CATEGORIES = ["全部", "公告", "教程", "分享"] as const;

const QUICK_LINKS = [
  { href: "/explore", title: "浏览岗位坐标" },
  { href: "/my", title: "处理投递进度" },
  { href: "/resume", title: "管理简历" },
  { href: "/guide", title: "查看秋招流程" },
] as const;

export function ForumClient() {
  const [posts, setPosts] = useState<ForumPostView[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("全部");
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentUserIsAdmin, setCurrentUserIsAdmin] = useState(false);

  async function loadPosts() {
    setLoading(true);
    setMessage("");
    try {
      if (!isSupabaseConfigured()) {
        setMessage("请先配置数据库环境变量。");
        return;
      }
      const supabase = createClient();
      const user = await getCurrentUserOrNull(supabase);
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        setCurrentUserIsAdmin(profile?.role === "admin");
      } else {
        setCurrentUserIsAdmin(false);
      }
      const result = await fetchPosts(supabase, {
        category: activeCategory,
        limit: 100,
      });
      setPosts(result);
    } catch {
      setMessage("读取指南内容失败，请稍后再试。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPosts();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory]);

  function handleCreated() {
    setShowForm(false);
    void loadPosts();
  }

  function handleDeleted() {
    setExpandedId(null);
    void loadPosts();
  }

  function handlePinnedChange(postId: string, isPinned: boolean) {
    setPosts((current) => current
      .map((post) => post.id === postId ? { ...post, is_pinned: isPinned } : post)
      .sort((left, right) => {
        if (left.is_pinned !== right.is_pinned) return left.is_pinned ? -1 : 1;
        return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
      }));
  }

  function handleUpdated(
    postId: string,
    updates: Pick<ForumPostView, "title" | "content" | "category" | "tags">,
  ) {
    setPosts((current) => current
      .map((post) => post.id === postId ? { ...post, ...updates } : post)
      .filter((post) => activeCategory === "全部" || post.category === activeCategory));
  }

  return (
    <div className="observatory-page space-y-8">
      <section className="page-hero">
        <div className="max-w-2xl">
          <h1 className="page-title">拾星指南</h1>
          <p className="mt-3 text-sm leading-7 text-ink-secondary sm:text-base">
            查看产品公告、使用教程和经过整理的求职经验。内容由拾星官方持续维护。
          </p>
        </div>
        {currentUserIsAdmin ? (
          <div className="flex items-end justify-start md:justify-end">
            <Button onClick={() => setShowForm((value) => !value)}>
              {showForm ? "收起编辑器" : "发布内容"}
            </Button>
          </div>
        ) : null}
      </section>

      <Drawer open={showForm} title="发布指南内容" onClose={() => setShowForm(false)} showHelpLink={false}>
        <NewPostForm onCreated={handleCreated} onCancel={() => setShowForm(false)} />
      </Drawer>

      <section aria-labelledby="guide-shortcuts-title" className="border-y border-[color:var(--line-ghost)] py-5 sm:py-6">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="guide-shortcuts-title" className="text-lg font-semibold text-ink-primary">常用入口</h2>
          <span className="text-xs text-ink-muted">从这里继续处理当前进度</span>
        </div>
        <div className="mt-3 grid gap-x-6 sm:grid-cols-2">
          {QUICK_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="group flex min-h-14 items-center justify-between border-b border-[color:var(--line-ghost)] py-3">
              <span className="text-sm font-medium text-ink-primary">{link.title}</span>
              <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink-primary" />
            </Link>
          ))}
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4">
        <SegmentedControl
          ariaLabel="指南分类"
          options={CATEGORIES.map((category) => ({ value: category, label: category }))}
          value={activeCategory}
          onChange={setActiveCategory}
        />
        <span className="section-meta">{posts.length} 篇内容</span>
      </section>

      {message ? (
        <div className="message-banner text-sm">
          {message}
        </div>
      ) : null}

      <section className="list-surface">
        {loading ? (
          <div className="empty-state">
            <span className="loading-line">正在读取指南</span>
          </div>
        ) : posts.length === 0 ? (
          <div className="empty-state">
            <div>
              <h2>暂无指南内容</h2>
              <p>{currentUserIsAdmin ? "点击“发布内容”添加第一篇公告或教程。" : "官方内容正在整理中，请稍后再来。"}</p>
            </div>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              isAdmin={currentUserIsAdmin}
              expanded={expandedId === post.id}
              onToggle={() =>
                setExpandedId((prev) => (prev === post.id ? null : post.id))
              }
              onDeleted={handleDeleted}
              onPinnedChange={handlePinnedChange}
              onUpdated={handleUpdated}
            />
          ))
        )}
      </section>
    </div>
  );
}
