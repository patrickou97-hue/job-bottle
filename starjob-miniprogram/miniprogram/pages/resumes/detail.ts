import { apiRequest } from "../../services/request";
import type { ResumeDetailResponse } from "../../types/api";
import type {
  ResumeDetail,
  ResumeEducation,
  ResumeExperience,
  ResumeProject,
  ResumeSkillGroup,
  ResumeTextSection,
} from "../../types/domain";

type EducationView = ResumeEducation & { dateLabel: string };
type ExperienceView = ResumeExperience & { dateLabel: string };
type ProjectView = ResumeProject & { dateLabel: string };
type OtherSectionView = ResumeTextSection & { sectionLabel: string };
type SkillView = ResumeSkillGroup & { skillsLabel: string };

type ResumePreview = ResumeDetail & {
  educationView: EducationView[];
  workView: ExperienceView[];
  projectsView: ProjectView[];
  skillsView: SkillView[];
  otherSections: OtherSectionView[];
  contactLine: string;
};

const OTHER_SECTION_GROUPS = [
  { key: "campus", label: "校园经历" },
  { key: "awards", label: "荣誉奖项" },
  { key: "certifications", label: "证书" },
  { key: "languages", label: "语言能力" },
  { key: "customSections", label: "其他经历" },
] as const;

Page({
  data: {
    id: "",
    loading: true,
    errorMessage: "",
    resume: null as ResumePreview | null,
  },

  onLoad(options: Record<string, string | undefined>) {
    this.setData({ id: options.id ? decodeURIComponent(options.id) : "" });
    void this.loadResume();
  },

  onPullDownRefresh() {
    void this.loadResume().finally(() => wx.stopPullDownRefresh());
  },

  async loadResume() {
    if (!this.data.id) {
      this.setData({ loading: false, errorMessage: "简历编号无效。" });
      return;
    }
    this.setData({ loading: true, errorMessage: "" });
    try {
      const response = await apiRequest<ResumeDetailResponse>(
        `/resumes/${encodeURIComponent(this.data.id)}`,
      );
      const resume = toPreview(response.data.resume);
      this.setData({ loading: false, resume });
      wx.setNavigationBarTitle({ title: resume.title || "简历预览" });
    } catch (error) {
      this.setData({
        loading: false,
        errorMessage:
          error instanceof Error ? error.message : "简历读取失败，请重试。",
      });
    }
  },

  onRetry() {
    void this.loadResume();
  },
});

function toPreview(resume: ResumeDetail): ResumePreview {
  const basics = resume.content.basics;
  const contactLine = [
    basics.phone,
    basics.email,
    basics.city,
    basics.linkedin,
    basics.github,
    basics.website,
  ]
    .filter(Boolean)
    .join(" · ");
  const otherSections = OTHER_SECTION_GROUPS.flatMap(({ key, label }) =>
    (resume.content[key] || []).map((item) => ({
      ...item,
      sectionLabel: label,
    })),
  );
  return {
    ...resume,
    contactLine,
    educationView: (resume.content.education || []).map((item) => ({
      ...item,
      dateLabel: formatRange(item.startDate, item.endDate),
    })),
    workView: (resume.content.work || []).map((item) => ({
      ...item,
      dateLabel: formatRange(
        item.startDate,
        item.current ? "至今" : item.endDate,
      ),
    })),
    projectsView: (resume.content.projects || []).map((item) => ({
      ...item,
      dateLabel: formatRange(item.startDate, item.endDate),
    })),
    skillsView: (resume.content.skills || []).map((item) => ({
      ...item,
      skillsLabel: item.skills.join("、"),
    })),
    otherSections,
  };
}

function formatRange(start: string, end: string) {
  if (start && end) return `${start} — ${end}`;
  return start || end || "";
}
