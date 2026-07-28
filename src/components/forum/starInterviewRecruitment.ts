import type { ForumPostView } from "@/lib/types";

export const STAR_INTERVIEW_RECRUITMENT_TAG = "starinterview-preview-recruit";
export const STAR_INTERVIEW_RECRUITMENT_PREVIEW_ID = "starinterview-preview-recruitment-local";

export const STAR_INTERVIEW_RECRUITMENT_POST: ForumPostView = {
  id: STAR_INTERVIEW_RECRUITMENT_PREVIEW_ID,
  user_id: "local-preview",
  title: "诘星 StarInterview Preview 体验招募中",
  content: `诘星 StarInterview 是拾星 StarJob 同系列的原生 macOS 实时面试辅助工具。它会结合面试官的问题、你选中的简历与面试场景，帮助你在面试中更快整理回答思路。

我们正在招募首批 Preview 体验用户。申请通过后，将获得 ¥100 人民币等值的诘星体验额度；安装包和审核结果会通过邮件发送。

点击下方“了解详情”，查看功能介绍、体验要求、额度说明和申请方式。`,
  category: "公告",
  tags: ["StarInterview", "Preview", "体验招募", STAR_INTERVIEW_RECRUITMENT_TAG],
  like_count: 0,
  comment_count: 0,
  is_pinned: true,
  platform_visibility: "web",
  created_at: "2026-07-28T13:00:00.000Z",
  updated_at: "2026-07-28T13:00:00.000Z",
  author_name: "拾星官方",
  author_role: "admin",
};

const APPLICATION_SUBJECT = "申请体验诘星 StarInterview Preview";
const APPLICATION_BODY = `你好，我想申请体验诘星 StarInterview Preview。

接收安装包的邮箱：
（请填写）

计划用于哪些岗位或方向的面试：
（请填写，例如：产品经理、咨询、投行、数据分析）

补充说明（可选）：
（请填写）

谢谢。`;

export const STAR_INTERVIEW_APPLICATION_MAILTO = [
  "mailto:raywang6688@outlook.com",
  `?subject=${encodeURIComponent(APPLICATION_SUBJECT)}`,
  `&body=${encodeURIComponent(APPLICATION_BODY)}`,
].join("");

export function isStarInterviewRecruitmentPost(post: Pick<ForumPostView, "tags">) {
  return post.tags.includes(STAR_INTERVIEW_RECRUITMENT_TAG);
}
