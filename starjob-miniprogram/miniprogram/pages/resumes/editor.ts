import { ApiError, apiRequest } from "../../services/request";
import { API_BASE_URL } from "../../config/env";
import { getValidAccessToken, refreshSession } from "../../services/session";
import type {
  ResumeDeleteResponse,
  ResumeDetailResponse,
  ResumeDuplicateResponse,
  ResumeUpdateResponse,
} from "../../types/api";
import type {
  ResumeContent,
  ResumeDetail,
  ResumeEducation,
  ResumeExperience,
  ResumeProject,
  ResumeSkillGroup,
  ResumeTextSection,
} from "../../types/domain";

type EditorExperience = ResumeExperience & { bulletsText: string };
type EditorProject = ResumeProject & { bulletsText: string };
type EditorSkill = ResumeSkillGroup & { skillsText: string };
type EditorTextSection = ResumeTextSection & { bulletsText: string };
type EditorContent = Omit<
  ResumeContent,
  | "work"
  | "projects"
  | "skills"
  | "campus"
  | "awards"
  | "certifications"
  | "languages"
  | "customSections"
> & {
  work: EditorExperience[];
  projects: EditorProject[];
  skills: EditorSkill[];
  campus: EditorTextSection[];
  awards: EditorTextSection[];
  certifications: EditorTextSection[];
  languages: EditorTextSection[];
  customSections: EditorTextSection[];
};
type EditorResume = Omit<ResumeDetail, "content"> & { content: EditorContent };

type EditorSection =
  | "overview"
  | "basics"
  | "education"
  | "work"
  | "projects"
  | "skills"
  | "campus"
  | "awards"
  | "certifications"
  | "languages"
  | "customSections";

const SECTION_OPTIONS: { id: EditorSection; label: string }[] = [
  { id: "overview", label: "设置" },
  { id: "basics", label: "基本信息" },
  { id: "education", label: "教育" },
  { id: "work", label: "经历" },
  { id: "projects", label: "项目" },
  { id: "skills", label: "技能" },
  { id: "campus", label: "校园" },
  { id: "awards", label: "奖项" },
  { id: "certifications", label: "证书" },
  { id: "languages", label: "语言" },
  { id: "customSections", label: "其他" },
];

const TEMPLATE_OPTIONS = [
  { id: "compact", label: "紧凑中文" },
  { id: "classic", label: "经典商科" },
  { id: "modern", label: "现代单栏" },
  { id: "consulting", label: "咨询投研" },
  { id: "technical", label: "技术简洁" },
  { id: "academic", label: "学术研究" },
  { id: "english_classic", label: "English Classic" },
  { id: "english_modern", label: "English Modern" },
] as const;

const DRAFT_PREFIX = "starjob_resume_draft_v1:";
let draftTimer: ReturnType<typeof setTimeout> | undefined;

Page({
  data: {
    id: "",
    loading: true,
    saving: false,
    dirty: false,
    errorMessage: "",
    activeSection: "overview" as EditorSection,
    sectionOptions: SECTION_OPTIONS,
    templateOptions: TEMPLATE_OPTIONS,
    resume: null as EditorResume | null,
  },

  onLoad(options: Record<string, string | undefined>) {
    this.setData({ id: options.id ? decodeURIComponent(options.id) : "" });
    void this.loadResume();
  },

  onHide() {
    this.persistDraft();
  },

  onUnload() {
    if (draftTimer) clearTimeout(draftTimer);
    this.persistDraft();
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
      const remote = toEditorResume(response.data.resume);
      const local = readDraft(this.data.id);
      if (local?.resume && local.baseUpdatedAt === remote.updatedAt) {
        wx.showModal({
          title: "发现未保存内容",
          content: "是否恢复上次在这台设备上编辑的草稿？",
          confirmText: "恢复草稿",
          cancelText: "使用云端",
          success: (result) => {
            if (result.confirm) {
              this.setData({
                loading: false,
                resume: local.resume,
                dirty: true,
              });
            } else {
              removeDraft(this.data.id);
              this.applyRemoteResume(remote);
            }
          },
        });
        return;
      }
      if (local) removeDraft(this.data.id);
      this.applyRemoteResume(remote);
    } catch (error) {
      this.setData({
        loading: false,
        errorMessage:
          error instanceof Error ? error.message : "简历读取失败，请重试。",
      });
    }
  },

  applyRemoteResume(resume: EditorResume) {
    this.setData({
      loading: false,
      errorMessage: "",
      dirty: false,
      resume,
    });
    wx.setNavigationBarTitle({ title: resume.title || "编辑简历" });
  },

  onRetry() {
    void this.loadResume();
  },

  onSectionTap(event: WechatMiniprogram.TouchEvent) {
    this.setData({
      activeSection: String(event.currentTarget.dataset.id) as EditorSection,
    });
  },

  onFieldInput(event: WechatMiniprogram.Input) {
    const path = String(event.currentTarget.dataset.path || "");
    if (!path) return;
    this.setData({ [path]: event.detail.value, dirty: true });
    this.scheduleDraft();
  },

  onCurrentChange(event: WechatMiniprogram.CheckboxGroupChange) {
    const index = Number(event.currentTarget.dataset.index);
    if (!Number.isInteger(index)) return;
    this.setData({
      [`resume.content.work[${index}].current`]: event.detail.value.length > 0,
      dirty: true,
    });
    this.scheduleDraft();
  },

  onTemplateTap(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id || "");
    if (!TEMPLATE_OPTIONS.some((item) => item.id === id)) return;
    this.setData({ "resume.templateId": id, dirty: true });
    this.scheduleDraft();
  },

  onAddItem(event: WechatMiniprogram.TouchEvent) {
    const section = String(event.currentTarget.dataset.section) as EditorSection;
    const resume = this.data.resume;
    if (!resume) return;
    const list = getSectionList(resume.content, section);
    if (!list) return;
    this.setData({
      [`resume.content.${section}`]: [...list, createSectionItem(section)],
      dirty: true,
    });
    this.scheduleDraft();
  },

  onRemoveItem(event: WechatMiniprogram.TouchEvent) {
    const section = String(event.currentTarget.dataset.section) as EditorSection;
    const index = Number(event.currentTarget.dataset.index);
    const resume = this.data.resume;
    const list = resume ? getSectionList(resume.content, section) : null;
    if (!list || !Number.isInteger(index) || !list[index]) return;
    wx.showModal({
      title: "删除这条内容？",
      content: "删除后仍需点击“保存到云端”才会同步。",
      confirmText: "删除",
      confirmColor: "#9f2d3f",
      success: (result) => {
        if (!result.confirm) return;
        this.setData({
          [`resume.content.${section}`]: list.filter(
            (_, itemIndex) => itemIndex !== index,
          ),
          dirty: true,
        });
        this.scheduleDraft();
      },
    });
  },

  onMoveItem(event: WechatMiniprogram.TouchEvent) {
    const section = String(event.currentTarget.dataset.section) as EditorSection;
    const index = Number(event.currentTarget.dataset.index);
    const direction = Number(event.currentTarget.dataset.direction);
    const resume = this.data.resume;
    const list = resume ? getSectionList(resume.content, section) : null;
    const target = index + direction;
    if (
      !list ||
      !Number.isInteger(index) ||
      !Number.isInteger(target) ||
      target < 0 ||
      target >= list.length
    ) {
      return;
    }
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    this.setData({
      [`resume.content.${section}`]: next,
      dirty: true,
    });
    this.scheduleDraft();
  },

  onSave() {
    void this.saveResume(false);
  },

  async saveResume(force: boolean) {
    const resume = this.data.resume;
    if (!resume || this.data.saving) return false;
    this.setData({ saving: true, errorMessage: "" });
    try {
      const response = await apiRequest<ResumeUpdateResponse>(
        `/resumes/${encodeURIComponent(resume.id)}`,
        {
          method: "PUT",
          data: {
            title: resume.title,
            targetRole: resume.targetRole,
            jobTarget: resume.jobTarget,
            linkedJobId: resume.linkedJobId,
            templateId: resume.templateId,
            content: toApiContent(resume.content),
            baseUpdatedAt: resume.updatedAt,
            force,
          },
        },
      );
      removeDraft(resume.id);
      this.applyRemoteResume(toEditorResume(response.data.resume));
      wx.showToast({ title: "已保存到云端", icon: "success" });
      return true;
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.statusCode === 409 &&
        error.code === "RESUME_CONFLICT"
      ) {
        this.setData({ saving: false });
        wx.showModal({
          title: "云端已有新版本",
          content: "其他设备刚刚修改了这份简历。你可以覆盖云端，或重新读取云端版本。",
          confirmText: "覆盖云端",
          cancelText: "读取云端",
          success: (result) => {
            if (result.confirm) {
              void this.saveResume(true);
            } else {
              removeDraft(resume.id);
              void this.loadResume();
            }
          },
        });
        return false;
      }
      this.setData({
        errorMessage:
          error instanceof Error ? error.message : "保存失败，请稍后重试。",
      });
      this.persistDraft();
      return false;
    } finally {
      this.setData({ saving: false });
    }
  },

  async onPreview() {
    if (this.data.dirty) {
      const saved = await this.saveResume(false);
      if (!saved) return;
    }
    wx.navigateTo({
      url: `/pages/resumes/detail?id=${encodeURIComponent(this.data.id)}`,
    });
  },

  onMoreActions() {
    wx.showActionSheet({
      itemList: ["生成并预览 PDF", "复制为新简历", "删除简历"],
      success: (result) => {
        if (result.tapIndex === 0) void this.downloadPdf();
        if (result.tapIndex === 1) void this.duplicateResume();
        if (result.tapIndex === 2) this.confirmDelete();
      },
    });
  },

  async downloadPdf() {
    if (this.data.dirty) {
      const saved = await this.saveResume(false);
      if (!saved) return;
    }
    this.setData({ saving: true, errorMessage: "" });
    try {
      let token = await getValidAccessToken();
      if (!token) throw new Error("登录状态已失效，请重新登录。");
      let result = await downloadPdfFile(this.data.id, token);
      if (result.statusCode === 401) {
        const refreshed = await refreshSession();
        if (!refreshed) throw new Error("登录状态已失效，请重新登录。");
        token = refreshed.accessToken;
        result = await downloadPdfFile(this.data.id, token);
      }
      if (result.statusCode < 200 || result.statusCode >= 300) {
        throw new Error("PDF 生成失败，请稍后重试。");
      }
      await openPdf(result.tempFilePath);
    } catch (error) {
      this.setData({
        errorMessage:
          error instanceof Error ? error.message : "PDF 生成失败，请稍后重试。",
      });
    } finally {
      this.setData({ saving: false });
    }
  },

  async duplicateResume() {
    if (this.data.dirty) {
      const saved = await this.saveResume(false);
      if (!saved) return;
    }
    this.setData({ saving: true, errorMessage: "" });
    try {
      const response = await apiRequest<ResumeDuplicateResponse>(
        `/resumes/${encodeURIComponent(this.data.id)}`,
        { method: "POST", data: { action: "duplicate" } },
      );
      wx.redirectTo({
        url: `/pages/resumes/editor?id=${encodeURIComponent(response.data.resume.id)}`,
      });
    } catch (error) {
      this.setData({
        errorMessage:
          error instanceof Error ? error.message : "复制失败，请稍后重试。",
      });
    } finally {
      this.setData({ saving: false });
    }
  },

  confirmDelete() {
    wx.showModal({
      title: "删除这份简历？",
      content: "删除后网页端和小程序端都无法恢复。",
      confirmText: "确认删除",
      confirmColor: "#9f2d3f",
      success: (result) => {
        if (result.confirm) void this.deleteResume();
      },
    });
  },

  async deleteResume() {
    this.setData({ saving: true, errorMessage: "" });
    try {
      await apiRequest<ResumeDeleteResponse>(
        `/resumes/${encodeURIComponent(this.data.id)}`,
        { method: "DELETE" },
      );
      removeDraft(this.data.id);
      wx.showToast({ title: "简历已删除", icon: "success" });
      setTimeout(() => wx.navigateBack(), 500);
    } catch (error) {
      this.setData({
        errorMessage:
          error instanceof Error ? error.message : "删除失败，请稍后重试。",
      });
    } finally {
      this.setData({ saving: false });
    }
  },

  scheduleDraft() {
    if (draftTimer) clearTimeout(draftTimer);
    draftTimer = setTimeout(() => this.persistDraft(), 350);
  },

  persistDraft() {
    const resume = this.data.resume;
    if (!resume || !this.data.dirty) return;
    try {
      wx.setStorageSync(`${DRAFT_PREFIX}${resume.id}`, {
        baseUpdatedAt: resume.updatedAt,
        resume,
      });
    } catch {
      this.setData({
        errorMessage: "本地草稿空间不足，请尽快保存到云端。",
      });
    }
  },
});

function toEditorResume(resume: ResumeDetail): EditorResume {
  return {
    ...resume,
    content: {
      ...resume.content,
      work: resume.content.work.map((item) => ({
        ...item,
        bulletsText: item.bullets.join("\n"),
      })),
      projects: resume.content.projects.map((item) => ({
        ...item,
        bulletsText: item.bullets.join("\n"),
      })),
      skills: resume.content.skills.map((item) => ({
        ...item,
        skillsText: item.skills.join("、"),
      })),
      campus: toEditorTextSections(resume.content.campus),
      awards: toEditorTextSections(resume.content.awards),
      certifications: toEditorTextSections(resume.content.certifications),
      languages: toEditorTextSections(resume.content.languages),
      customSections: toEditorTextSections(resume.content.customSections),
    },
  };
}

function toEditorTextSections(items: ResumeTextSection[]) {
  return items.map((item) => ({
    ...item,
    bulletsText: item.bullets.join("\n"),
  }));
}

function toApiContent(content: EditorContent): ResumeContent {
  return {
    ...content,
    work: content.work.map(({ bulletsText, ...item }) => ({
      ...item,
      bullets: splitLines(bulletsText),
    })),
    projects: content.projects.map(({ bulletsText, ...item }) => ({
      ...item,
      bullets: splitLines(bulletsText),
    })),
    skills: content.skills.map(({ skillsText, ...item }) => ({
      ...item,
      skills: splitTags(skillsText),
    })),
    campus: stripTextSections(content.campus),
    awards: stripTextSections(content.awards),
    certifications: stripTextSections(content.certifications),
    languages: stripTextSections(content.languages),
    customSections: stripTextSections(content.customSections),
  };
}

function stripTextSections(items: EditorTextSection[]) {
  return items.map(({ bulletsText, ...item }) => ({
    ...item,
    bullets: splitLines(bulletsText),
  }));
}

function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitTags(value: string) {
  return value
    .split(/[、,，;\n；]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function readDraft(id: string) {
  try {
    return wx.getStorageSync(`${DRAFT_PREFIX}${id}`) as
      | { baseUpdatedAt: string; resume: EditorResume }
      | undefined;
  } catch {
    return undefined;
  }
}

function removeDraft(id: string) {
  try {
    wx.removeStorageSync(`${DRAFT_PREFIX}${id}`);
  } catch {
    // A stale local draft must never block the cloud workflow.
  }
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.round(Math.random() * 100_000)}`;
}

function getSectionList(content: EditorContent, section: EditorSection) {
  if (
    section === "overview" ||
    section === "basics"
  ) {
    return null;
  }
  return content[section] as Array<
    ResumeEducation | EditorExperience | EditorProject | EditorSkill | EditorTextSection
  >;
}

function createSectionItem(section: EditorSection) {
  if (section === "education") {
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
    } satisfies ResumeEducation;
  }
  if (section === "work") {
    return {
      id: createId("work"),
      company: "",
      title: "",
      location: "",
      startDate: "",
      endDate: "",
      current: false,
      bullets: [],
      bulletsText: "",
    } satisfies EditorExperience;
  }
  if (section === "projects") {
    return {
      id: createId("project"),
      name: "",
      role: "",
      startDate: "",
      endDate: "",
      bullets: [],
      bulletsText: "",
      keywords: "",
    } satisfies EditorProject;
  }
  if (section === "skills") {
    return {
      id: createId("skill"),
      category: "",
      skills: [],
      skillsText: "",
    } satisfies EditorSkill;
  }
  return {
    id: createId("section"),
    title: "",
    bullets: [],
    bulletsText: "",
  } satisfies EditorTextSection;
}

function downloadPdfFile(id: string, token: string) {
  return new Promise<WechatMiniprogram.DownloadFileSuccessCallbackResult>(
    (resolve, reject) => {
      wx.downloadFile({
        url: `${API_BASE_URL}/resumes/${encodeURIComponent(id)}/pdf`,
        header: { Authorization: `Bearer ${token}` },
        timeout: 30_000,
        success: resolve,
        fail: (error) =>
          reject(new Error(error.errMsg || "PDF 下载失败，请稍后重试。")),
      });
    },
  );
}

function openPdf(filePath: string) {
  return new Promise<void>((resolve, reject) => {
    wx.openDocument({
      filePath,
      fileType: "pdf",
      showMenu: true,
      success: () => resolve(),
      fail: (error) =>
        reject(new Error(error.errMsg || "PDF 无法打开，请稍后重试。")),
    });
  });
}
