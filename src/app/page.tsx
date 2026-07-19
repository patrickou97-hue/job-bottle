import type { Metadata } from "next";
import { GalaxyHome } from '@/components/galaxy/GalaxyHome'

export const metadata: Metadata = {
  title: "拾星 StarJob｜校招岗位与投递进度管理",
  description: "发现校招岗位、管理网申和面试进度，把重要机会收进自己的星瓶。",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return <GalaxyHome />
}
