import type { Metadata } from "next";
import { ProductTutorials } from "@/components/guide/ProductTutorials";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "拾星产品使用教程",
  description: "按主题查看岗位探索、星瓶、投递管理、简历制作和网申助手的使用步骤。",
  alternates: { canonical: "/forum/tutorials" },
};

export default function ProductTutorialsPage() {
  return (
    <PageShell>
      <ProductTutorials />
    </PageShell>
  );
}
