import { ForumClient } from "@/components/forum/ForumClient";
import { PageShell } from "@/components/layout/PageShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "拾星指南 | StarJob",
  description: "拾星 StarJob 的产品公告、使用教程和求职经验分享。",
};

export default function ForumPage() {
  return (
    <PageShell>
      <ForumClient />
    </PageShell>
  );
}
