import { apiRequest } from "../../services/request";
import type { ResumeDetailResponse } from "../../types/api";
import type {
  ResumeDetail,
  ResumeEducation,
  ResumeExperience,
  ResumeProject,
  ResumeSectionKey,
  ResumeSkillGroup,
  ResumeTextSection,
} from "../../types/domain";

type EducationView = ResumeEducation & { dateLabel: string };
type ExperienceView = ResumeExperience & { dateLabel: string };
type ProjectView = ResumeProject & { dateLabel: string };
type OtherSectionView = ResumeTextSection & { order: number; sectionLabel: string };
type SkillView = ResumeSkillGroup & { skillsLabel: string };
type LanguageView = ResumeTextSection & { bulletsLabel: string };

type ResumePreview = ResumeDetail & {
  educationView: EducationView[];
  workView: ExperienceView[];
  projectsView: ProjectView[];
  skillsView: SkillView[];
  languagesView: LanguageView[];
  otherSections: OtherSectionView[];
  sectionPosition: Record<ResumeSectionKey, number>;
  contactLine: string;
};

const OTHER_SECTION_GROUPS = [
  { key: "campus", label: "校园经历" },
  { key: "awards", label: "荣誉奖项" },
  { key: "certifications", label: "证书" },
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

  onEdit() {
    if (!this.data.id) return;
    wx.redirectTo({
      url: `/pages/resumes/editor?id=${encodeURIComponent(this.data.id)}`,
    });
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
  const sectionOrder = normalizeSectionOrder(resume.content.sectionOrder);
  const sectionPosition = Object.fromEntries(
    sectionOrder.map((key, index) => [key, index]),
  ) as Record<ResumeSectionKey, number>;
  const otherSections = OTHER_SECTION_GROUPS.flatMap(({ key, label }) =>
    (resume.content[key] || []).map((item) => ({
      ...item,
      order: sectionPosition[key],
      sectionLabel: label,
    })),
  );
  return {
    ...resume,
    contactLine,
    sectionPosition,
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
    languagesView: (resume.content.languages || []).map((item) => ({
      ...item,
      bulletsLabel: item.bullets.join("、"),
    })),
    otherSections,
  };
}

const DEFAULT_SECTION_ORDER: ResumeSectionKey[] = [
  "education",
  "work",
  "projects",
  "campus",
  "awards",
  "certifications",
  "skills",
  "customSections",
];

function normalizeSectionOrder(value: ResumeSectionKey[] | undefined) {
  const requested = Array.isArray(value)
    ? value.filter((key) => DEFAULT_SECTION_ORDER.includes(key))
    : [];
  return [
    ...new Set(requested),
    ...DEFAULT_SECTION_ORDER.filter((key) => !requested.includes(key)),
  ];
}

function formatRange(start: string, end: string) {
  if (start && end) return `${start} — ${end}`;
  return start || end || "";
}
