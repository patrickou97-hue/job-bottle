export type ResumeTemplateId = "compact" | "classic" | "modern" | "english_classic" | "english_modern";

export type ResumeBasics = {
  name: string;
  englishName: string;
  photoDataUrl: string;
  phone: string;
  email: string;
  city: string;
  linkedin: string;
  github: string;
  website: string;
  targetRole: string;
};

export type ResumeEducation = {
  id: string;
  school: string;
  degree: string;
  major: string;
  startDate: string;
  endDate: string;
  gpa: string;
  courses: string;
  honors: string;
};

export type ResumeExperience = {
  id: string;
  company: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  bullets: string[];
};

export type ResumeProject = {
  id: string;
  name: string;
  role: string;
  startDate: string;
  endDate: string;
  bullets: string[];
  keywords: string;
};

export type ResumeSkillGroup = {
  id: string;
  category: string;
  skills: string[];
};

export type ResumeCustomSection = {
  id: string;
  title: string;
  bullets: string[];
};

export type ResumeContent = {
  basics: ResumeBasics;
  education: ResumeEducation[];
  work: ResumeExperience[];
  projects: ResumeProject[];
  skills: ResumeSkillGroup[];
  campus: ResumeCustomSection[];
  awards: ResumeCustomSection[];
  certifications: ResumeCustomSection[];
  languages: ResumeCustomSection[];
  customSections: ResumeCustomSection[];
};

export type ResumeDocument = {
  id: string;
  title: string;
  targetRole: string;
  jobTarget: string;
  linkedJobId: string | null;
  templateId: ResumeTemplateId;
  content: ResumeContent;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "job_bottle_resumes_v1";

export const RESUME_TEMPLATES: { id: ResumeTemplateId; label: string }[] = [
  { id: "compact", label: "紧凑中文" },
  { id: "classic", label: "经典商科" },
  { id: "modern", label: "现代单栏" },
  { id: "english_classic", label: "English Classic" },
  { id: "english_modern", label: "English Modern" },
];

export function getResumeTemplateMeta(templateId: ResumeTemplateId) {
  return RESUME_TEMPLATES.find((template) => template.id === templateId) ?? RESUME_TEMPLATES[0];
}

export function isEnglishResumeTemplate(templateId: ResumeTemplateId) {
  return templateId === "english_classic" || templateId === "english_modern";
}

export function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.round(Math.random() * 100_000)}`;
}

export function createResumeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  // The resumes table uses a UUID primary key. Keep the local fallback UUID-shaped
  // as well so a resume created before the browser crypto API is ready can sync.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const value = Math.floor(Math.random() * 16);
    return (character === "x" ? value : (value & 0x3) | 0x8).toString(16);
  });
}

export function isResumeId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function getResumeTargetLine(resume: ResumeDocument) {
  const candidates = [resume.content.basics.targetRole, resume.targetRole]
    .map((value) => value.trim())
    .filter(Boolean);
  const target = candidates[0] ?? "";

  return /^(通用|通用版|用于通用匹配)$/.test(target) ? "" : target;
}

export function createEmptyResume(): ResumeDocument {
  const now = new Date().toISOString();
  return {
    id: createResumeId(),
    title: "未命名简历",
    targetRole: "",
    jobTarget: "",
    linkedJobId: null,
    templateId: "compact",
    content: {
      basics: {
        name: "",
        englishName: "",
        photoDataUrl: "",
        phone: "",
        email: "",
        city: "",
        linkedin: "",
        github: "",
        website: "",
        targetRole: "",
      },
      education: [],
      work: [],
      projects: [],
      skills: [],
      campus: [],
      awards: [],
      certifications: [],
      languages: [],
      customSections: [],
    },
    createdAt: now,
    updatedAt: now,
  };
}

export function createSampleResume(): ResumeDocument {
  const now = new Date().toISOString();
  return {
    id: createResumeId(),
    title: "示例简历",
    targetRole: "产品经理实习生",
    jobTarget: "互联网产品方向",
    linkedJobId: null,
    templateId: "compact",
    content: {
      basics: {
        name: "王小星",
        englishName: "Stella Wang",
        photoDataUrl: "",
        phone: "138 0000 0000",
        email: "stella@example.com",
        city: "上海",
        linkedin: "linkedin.com/in/stella",
        github: "github.com/stella",
        website: "",
        targetRole: "产品经理实习生",
      },
      education: [
        {
          id: createId("edu"),
          school: "复旦大学",
          degree: "本科",
          major: "信息管理与信息系统",
          startDate: "2023.09",
          endDate: "2027.06",
          gpa: "3.78/4.00",
          courses: "数据结构、数据库系统、用户研究、商业分析",
          honors: "校级一等奖学金、优秀学生干部",
        },
      ],
      work: [
        {
          id: createId("work"),
          company: "拾星科技",
          title: "产品实习生",
          location: "上海",
          startDate: "2025.06",
          endDate: "2025.09",
          current: false,
          bullets: [
            "负责秋招岗位信息管理模块的需求梳理，拆解 30+ 条用户反馈并形成迭代清单。",
            "搭建岗位筛选与投递状态看板，帮助测试用户将岗位查找时间降低约 40%。",
          ],
        },
      ],
      projects: [
        {
          id: createId("project"),
          name: "Job Bottle 求职管理工具",
          role: "产品负责人",
          startDate: "2025.10",
          endDate: "2026.01",
          keywords: "Next.js、Supabase、用户访谈、数据看板",
          bullets: [
            "设计岗位星图、投递轨道和星瓶三条核心路径，覆盖岗位发现、进度管理与复盘分享。",
            "基于 170+ 条真实岗位数据建立筛选体系，支持按地区、行业和岗位类别组合查询。",
          ],
        },
      ],
      skills: [
        {
          id: createId("skill"),
          category: "产品与数据",
          skills: ["用户访谈", "竞品分析", "SQL", "Figma", "Excel"],
        },
      ],
      campus: [
        {
          id: createId("campus"),
          title: "校园经历",
          bullets: ["担任学院学生会外联部负责人，统筹 5 场企业交流活动。"],
        },
      ],
      awards: [
        {
          id: createId("award"),
          title: "获奖经历",
          bullets: ["全国大学生市场调研大赛校赛一等奖。"],
        },
      ],
      certifications: [],
      languages: [
        {
          id: createId("language"),
          title: "语言能力",
          bullets: ["英语 CET-6，具备英文资料阅读与双语沟通能力。"],
        },
      ],
      customSections: [],
    },
    createdAt: now,
    updatedAt: now,
  };
}

export function loadLocalResumes() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeResumeDocument).filter((resume) => resume !== null);
  } catch {
    return [];
  }
}

export function saveLocalResumes(resumes: ResumeDocument[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(resumes));
}

export function touchResume(resume: ResumeDocument): ResumeDocument {
  return {
    ...resume,
    updatedAt: new Date().toISOString(),
  };
}

export function createBlankEducation(): ResumeEducation {
  return {
    id: createId("edu"),
    school: "",
    degree: "",
    major: "",
    startDate: "",
    endDate: "",
    gpa: "",
    courses: "",
    honors: "",
  };
}

export function createBlankExperience(): ResumeExperience {
  return {
    id: createId("work"),
    company: "",
    title: "",
    location: "",
    startDate: "",
    endDate: "",
    current: false,
    bullets: [""],
  };
}

export function createBlankProject(): ResumeProject {
  return {
    id: createId("project"),
    name: "",
    role: "",
    startDate: "",
    endDate: "",
    bullets: [""],
    keywords: "",
  };
}

export function createBlankSkillGroup(): ResumeSkillGroup {
  return {
    id: createId("skill"),
    category: "",
    skills: [""],
  };
}

export function createBlankCustomSection(title = "自定义模块"): ResumeCustomSection {
  return {
    id: createId("section"),
    title,
    bullets: [""],
  };
}

export function compactList(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean);
}

function normalizeResumeDocument(value: unknown): ResumeDocument | null {
  if (!value || typeof value !== "object") return null;
  const fallback = createEmptyResume();
  const resume = value as Partial<ResumeDocument>;
  const content = resume.content && typeof resume.content === "object" ? resume.content : fallback.content;
  const basics = content.basics && typeof content.basics === "object" ? content.basics : fallback.content.basics;

  return {
    ...fallback,
    ...resume,
    id: typeof resume.id === "string" && isResumeId(resume.id) ? resume.id : fallback.id,
    title: typeof resume.title === "string" ? resume.title : fallback.title,
    targetRole: typeof resume.targetRole === "string" ? resume.targetRole : "",
    jobTarget: typeof resume.jobTarget === "string" ? resume.jobTarget : "",
    linkedJobId: typeof resume.linkedJobId === "string" ? resume.linkedJobId : null,
    templateId: normalizeTemplateId(resume.templateId),
    content: {
      ...fallback.content,
      ...content,
      basics: {
        ...fallback.content.basics,
        ...basics,
      },
      education: Array.isArray(content.education) ? content.education : [],
      work: Array.isArray(content.work) ? content.work : [],
      projects: Array.isArray(content.projects) ? content.projects : [],
      skills: Array.isArray(content.skills) ? content.skills : [],
      campus: Array.isArray(content.campus) ? content.campus : [],
      awards: Array.isArray(content.awards) ? content.awards : [],
      certifications: Array.isArray(content.certifications) ? content.certifications : [],
      languages: Array.isArray(content.languages) ? content.languages : [],
      customSections: Array.isArray(content.customSections) ? content.customSections : [],
    },
  };
}

function normalizeTemplateId(value: unknown): ResumeTemplateId {
  return value === "compact" || value === "classic" || value === "modern" ? value : "compact";
}
