"use client";

import { useEffect, useState } from "react";
import { getCurrentUserOrNull } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { fetchPosts } from "@/lib/forum";
import { Button } from "@/components/ui/Button";
import { PostCard } from "@/components/forum/PostCard";
import { NewPostForm } from "@/components/forum/NewPostForm";
import { Drawer } from "@/components/ui/Drawer";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
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
          <h1 className="page-title">求职社区</h1>
        </div>
        <div className="flex items-end justify-start md:justify-end">
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? "收起" : "发布"}
          </Button>
        </div>
      </section>

      <Drawer open={showForm} title="发布讨论" onClose={() => setShowForm(false)}>
          <NewPostForm onCreated={handleCreated} onCancel={() => setShowForm(false)} />
      </Drawer>

      <section className="flex flex-wrap items-center justify-between gap-4">
        <SegmentedControl
          ariaLabel="讨论分类"
          options={CATEGORIES.map((category) => ({ value: category, label: category }))}
          value={activeCategory}
          onChange={setActiveCategory}
        />
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
              <h2>暂无经验内容</h2>
              <p>分享一条面试复盘、投递经验或准备方法。</p>
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
