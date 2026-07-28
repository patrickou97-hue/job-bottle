import type { Metadata } from "next";
import { StarInterviewTeaser } from "./StarInterviewTeaser";

export const metadata: Metadata = {
  title: "诘星 StarInterview｜即将上线",
  description: "诘星 StarInterview，拾星 StarJob 同系列的原生 macOS 面试辅助工具。",
};

export default async function StarInterviewTeaserPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const params = await searchParams;
  return <StarInterviewTeaser showRecruitment={params.preview === "recruitment"} />;
}
