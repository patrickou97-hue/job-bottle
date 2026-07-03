"use client";

import { useEffect, useState } from "react";
import { getCurrentUserOrNull } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { fetchPosts } from "@/lib/forum";
import { Button } from "@/components/ui/Button";
import { PostCard } from "@/components/forum/PostCard";
import { NewPostForm } from "@/components/forum/NewPostForm";
import type { ForumPost } from "@/lib/types";

const CATEGORIES = ["全部", "讨论", "经验", "求助", "分享"] as const;

export function ForumClient() {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("全部");
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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
      setCurrentUserId(user?.id ?? null);
      const result = await fetchPosts(supabase, {
        category: activeCategory,
        limit: 50,
      });
      setPosts(result);
    } catch {
      setMessage("读取讨论帖失败，请稍后再试。");
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

  return (
    <div className="space-y-6">
      <section className="surface-subtle relative overflow-hidden rounded-[28px] p-6">
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-nebula-silver/14 to-transparent" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs tracking-[0.18em] text-[color:var(--text-meta)]">信号网络</div>
            <h1 className="mt-1 text-3xl font-semibold text-ink-primary">讨论区</h1>
          </div>
          <Button onClick={() => setShowForm((v) => !v)}>
            发送信号
          </Button>
        </div>
      </section>

      {showForm ? (
        <section className="surface-subtle rounded-[24px] p-6">
          <NewPostForm onCreated={handleCreated} onCancel={() => setShowForm(false)} />
        </section>
      ) : null}

      <section className="surface-plain rounded-[24px] p-4">
        <div className="mb-3 text-xs tracking-[0.18em] text-[color:var(--text-meta)]">频道</div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`px-1 py-2 text-sm font-medium transition ${
                activeCategory === cat
                  ? "border-b-2 border-[rgba(159,180,206,0.4)] text-[color:var(--light-silver)]"
                  : "text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)]"
              }`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {message ? (
        <div className="rounded-[22px] border border-red-300/25 bg-red-500/10 p-4 text-sm text-red-100">
          {message}
        </div>
      ) : null}

      <section className="space-y-3">
        {loading ? (
          <div className="surface-subtle rounded-[24px] p-8 text-center text-ink-secondary">
            正在接收信号...
          </div>
        ) : posts.length === 0 ? (
          <div className="surface-subtle rounded-[24px] p-8 text-center">
            <h2 className="text-lg font-semibold text-ink-primary">暂无信号</h2>
            <p className="mt-2 text-sm text-ink-muted">
              点击「发送信号」来发起第一个讨论。
            </p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              expanded={expandedId === post.id}
              onToggle={() =>
                setExpandedId((prev) => (prev === post.id ? null : post.id))
              }
              onDeleted={handleDeleted}
            />
          ))
        )}
      </section>
    </div>
  );
}
