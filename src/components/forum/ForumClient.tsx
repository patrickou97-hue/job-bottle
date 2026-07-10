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
    <div className="observatory-page space-y-8">
      <section className="page-hero">
        <div>
          <p className="page-kicker">同路人讨论</p>
          <h1 className="page-title">讨论区</h1>
        </div>
        <div className="flex items-end justify-start md:justify-end">
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? "收起" : "发布"}
          </Button>
        </div>
      </section>

      {showForm ? (
        <section className="liquid-panel p-5">
          <NewPostForm onCreated={handleCreated} onCancel={() => setShowForm(false)} />
        </section>
      ) : null}

      <section className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] px-1 pb-2">
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
        <span className="section-meta">{posts.length} 条内容</span>
      </section>

      {message ? (
        <div className="message-banner text-sm">
          {message}
        </div>
      ) : null}

      <section className="collection-surface overflow-hidden">
        {loading ? (
          <div className="empty-state">
            <span className="loading-line">正在读取讨论</span>
          </div>
        ) : posts.length === 0 ? (
          <div className="empty-state">
            <div>
              <h2>暂无讨论</h2>
              <p>发布第一条讨论。</p>
            </div>
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
