import type { Metadata } from "next";
import { GalaxyHome } from '@/components/galaxy/GalaxyHome'

export const metadata: Metadata = {
  title: "拾星 StarJob｜校招岗位、简历与投递进度管理",
  description: "汇集校招岗位，整理简历与网申进度，把每一个值得奔赴的机会收进星瓶。",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return <GalaxyHome />
}
