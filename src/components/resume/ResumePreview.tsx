import type {
  ResumeCustomSection,
  ResumeDocument,
  ResumeExperience,
  ResumeProject,
  ResumeSkillGroup,
  ResumeTemplateId,
} from "@/lib/resume";
import { getResumeTargetLine, isEnglishResumeTemplate } from "@/lib/resume";

export function ResumePreview({ resume }: { resume: ResumeDocument }) {
  const paperClass =
    resume.templateId === "modern" || resume.templateId === "english_modern"
      ? "px-[52px] py-[42px]"
      : resume.templateId === "classic" || resume.templateId === "english_classic"
        ? "px-[50px] py-[40px]"
        : "px-[48px] py-[38px]";

  return (
    <div
      id="resume-print-area"
      className={`resume-paper mx-auto min-h-[1123px] w-full max-w-[794px] bg-white text-[#111111] shadow-[0_24px_90px_rgba(0,0,0,0.28)] ${paperClass}`}
    >
      <ResumeTemplate resume={resume} />
    </div>
  );
}

function ResumeTemplate({ resume }: { resume: ResumeDocument }) {
  const basics = resume.content.basics;
  const contactLine = [basics.phone, basics.email, basics.city].map(cleanText).filter(Boolean).join(" | ");
  const targetLine = getResumeTargetLine(resume);
  const isEnglish = isEnglishResumeTemplate(resume.templateId);
  const linkLine = formatLinks(basics, isEnglish);
  const isModern = resume.templateId === "modern" || resume.templateId === "english_modern";
  const isClassic = resume.templateId === "classic" || resume.templateId === "english_classic";
  const isLeftAligned = isModern;
  const accent = isModern ? "#203a5f" : "#111111";
  const displayName = isEnglish ? basics.englishName || basics.name || "Your Name" : addNameSpacing(basics.name || "姓名");
  const photo = isEnglish ? "" : basics.photoDataUrl;

  return (
    <article className="resume-compact text-[13px] leading-[1.18]">
      <header
        className={`relative ${isLeftAligned ? "border-b pb-3 text-left" : "pb-1 text-center"}`}
        style={isLeftAligned ? { borderColor: accent, borderBottomWidth: 1 } : undefined}
      >
        <div className={photo ? "px-[82px]" : ""}>
          <h1
            className={
              isLeftAligned
                ? "text-[25px] font-bold leading-none"
                : isClassic
                  ? "text-[25px] font-bold leading-none"
                  : "text-[24px] font-bold leading-none"
            }
            style={isLeftAligned ? { color: accent } : undefined}
          >
            {displayName}
          </h1>
          {basics.englishName && !isEnglish ? (
            <p className={`mt-1 text-[12px] ${isLeftAligned ? "tracking-[0.08em] text-[#374151]" : ""}`}>
              {basics.englishName}
            </p>
          ) : null}
          {contactLine ? (
            <p className="mt-2 text-[13px] leading-[1.22] text-[#111111]">{contactLine}</p>
          ) : null}
          {targetLine ? (
            <p className="mt-1 text-[13px] font-semibold">{targetLine}</p>
          ) : null}
          {linkLine ? (
            <p className="mt-1 break-words text-[11.5px] leading-[1.2] text-[#222222]">{linkLine}</p>
          ) : null}
        </div>
        <ResumePhoto src={photo} />
      </header>
      <ResumeSections resume={resume} templateId={resume.templateId} />
    </article>
  );
}

function ResumePhoto({ src }: { src: string }) {
  if (!src) return null;

  return (
    <div className="absolute right-0 top-[-8px] h-[86px] w-[68px] overflow-hidden border border-[#d7dbe3] bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="简历照片" className="h-full w-full object-cover" />
    </div>
  );
}

function ResumeSections({ resume, templateId }: { resume: ResumeDocument; templateId: ResumeTemplateId }) {
  const isEnglish = isEnglishResumeTemplate(templateId);
  const labels = getSectionLabels(isEnglish);
  const sectionClass = templateId === "modern" || templateId === "english_modern" ? "mt-[13px]" : "mt-[12px]";
  return (
    <div>
      {resume.content.education.length > 0 ? (
        <section className={sectionClass}>
          <SectionTitle templateId={templateId} title={labels.education} />
          {resume.content.education.map((item) => (
            <div key={item.id} className="mt-[5px]">
              <ResumeRow
                title={item.school || (isEnglish ? "School" : "学校")}
                meta={[item.major, item.degree, item.gpa].filter(Boolean).join(" · ")}
                time={[item.startDate, item.endDate].filter(Boolean).join(" - ")}
              />
              {item.courses ? (
                <p className="mt-[1px] text-[13px] leading-[1.18]">
                  <span className="font-semibold">{labels.courses}</span>
                  {item.courses}
                </p>
              ) : null}
              {item.honors ? (
                <p className="mt-[1px] text-[13px] leading-[1.18]">
                  <span className="font-semibold">{labels.honors}</span>
                  {item.honors}
                </p>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}

      {resume.content.work.length > 0 ? (
        <section className={sectionClass}>
          <SectionTitle templateId={templateId} title={labels.experience} />
          {resume.content.work.map((item) => (
            <ExperienceBlock key={item.id} item={item} isEnglish={isEnglish} />
          ))}
        </section>
      ) : null}

      {resume.content.projects.length > 0 ? (
        <section className={sectionClass}>
          <SectionTitle templateId={templateId} title={labels.projects} />
          {resume.content.projects.map((item) => (
            <ProjectBlock key={item.id} item={item} isEnglish={isEnglish} />
          ))}
        </section>
      ) : null}

      {resume.content.skills.length > 0 ? (
        <section className={sectionClass}>
          <SectionTitle templateId={templateId} title={labels.skills} />
          {resume.content.languages
            .flatMap((section) => section.bullets)
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line, index) => (
              <p key={`language-${index}`} className="mt-[3px] text-[13px] leading-[1.18]">
                {labels.language}{line}
              </p>
            ))}
          {resume.content.skills.map((group) => (
            <SkillLine key={group.id} group={group} fallbackLabel={isEnglish ? "Skills" : "技能"} />
          ))}
        </section>
      ) : null}

      <CustomSections sections={resume.content.campus} title={labels.campus} sectionClass={sectionClass} templateId={templateId} />
      <CustomSections sections={resume.content.awards} title={labels.awards} sectionClass={sectionClass} templateId={templateId} />
      <CustomSections sections={resume.content.certifications} title={labels.certifications} sectionClass={sectionClass} templateId={templateId} />
      {resume.content.customSections.map((section) => (
        <section key={section.id} className={sectionClass}>
          <SectionTitle templateId={templateId} title={section.title || labels.additional} />
          <BulletList bullets={section.bullets} />
        </section>
      ))}
    </div>
  );
}

function SectionTitle({ templateId, title }: { templateId: ResumeTemplateId; title: string }) {
  if (templateId === "modern" || templateId === "english_modern") {
    const accent = "#203a5f";
    return (
      <h2
        className="mb-[7px] border-b pb-[4px] text-[13px] font-bold leading-[1.1] tracking-normal"
        style={{ borderColor: "#cfd6df", color: accent }}
      >
        {title}
      </h2>
    );
  }

  return (
    <h2 className={`mt-[2px] flex items-center gap-[6px] pb-[6px] font-bold leading-[1.1] tracking-normal text-[#111111] ${templateId === "classic" || templateId === "english_classic" ? "text-[16.5px]" : "text-[16px]"}`}>
      <span>{title}</span>
      <span className={`flex-1 bg-[#111111] ${templateId === "classic" || templateId === "english_classic" ? "h-[1.5px]" : "h-px"}`} />
    </h2>
  );
}

function ResumeRow({ title, meta, time }: { title: string; meta?: string; time?: string }) {
  return (
    <div className="flex gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold leading-[1.18]">{title}</p>
        {meta ? <p className="text-[13px] leading-[1.18] text-[#111111]">{meta}</p> : null}
      </div>
      {time ? <p className="shrink-0 text-right text-[13px] leading-[1.18] text-[#111111]">{time}</p> : null}
    </div>
  );
}

function ExperienceBlock({ item, isEnglish }: { item: ResumeExperience; isEnglish: boolean }) {
  const time = item.current ? `${item.startDate} - ${isEnglish ? "Present" : "至今"}` : [item.startDate, item.endDate].filter(Boolean).join(" - ");
  return (
    <div className="mt-[5px]">
      <ResumeRow
        title={item.company || (isEnglish ? "Company" : "公司")}
        meta={[item.title, item.location].filter(Boolean).join(" · ")}
        time={time}
      />
      <BulletList bullets={item.bullets} />
    </div>
  );
}

function ProjectBlock({ item, isEnglish }: { item: ResumeProject; isEnglish: boolean }) {
  return (
    <div className="mt-[5px]">
      <ResumeRow
        title={[item.name || (isEnglish ? "Project" : "项目名称"), item.role].filter(Boolean).join(" - ")}
        meta={item.keywords}
        time={[item.startDate, item.endDate].filter(Boolean).join(" - ")}
      />
      <BulletList bullets={item.bullets} />
    </div>
  );
}

function SkillLine({ group, fallbackLabel }: { group: ResumeSkillGroup; fallbackLabel: string }) {
  const skills = group.skills.map((skill) => skill.trim()).filter(Boolean);
  if (!group.category && skills.length === 0) return null;
  return (
    <p className="mt-[3px] text-[13px] leading-[1.18]">
      <span className="font-semibold">{group.category || fallbackLabel}：</span>
      {skills.join("、")}
    </p>
  );
}

function CustomSections({
  sections,
  title,
  sectionClass,
  templateId,
}: {
  sections: ResumeCustomSection[];
  title: string;
  sectionClass: string;
  templateId: ResumeTemplateId;
}) {
  if (sections.length === 0) return null;
  return (
    <section className={sectionClass}>
      <SectionTitle templateId={templateId} title={title} />
      {sections.map((section) => (
        <div key={section.id} className="mt-[5px]">
          {section.title && section.title !== title ? (
            <p className="text-[13px] font-bold leading-[1.18]">{section.title}</p>
          ) : null}
          <BulletList bullets={section.bullets} />
        </div>
      ))}
    </section>
  );
}

function BulletList({ bullets }: { bullets: string[] }) {
  const clean = bullets.map((bullet) => bullet.trim()).filter(Boolean);
  if (clean.length === 0) return null;
  return (
    <ul className="mt-[1px] list-disc space-y-0 pl-4 text-[13px] leading-[1.18] marker:text-[9px]">
      {clean.map((bullet, index) => (
        <li key={`${bullet}-${index}`}>{bullet}</li>
      ))}
    </ul>
  );
}

function formatLinks(basics: ResumeDocument["content"]["basics"], isEnglish: boolean) {
  return [
    basics.linkedin ? `LinkedIn${isEnglish ? ":" : "："}${cleanText(basics.linkedin)}` : "",
    basics.github ? `GitHub${isEnglish ? ":" : "："}${cleanText(basics.github)}` : "",
    basics.website ? `${isEnglish ? "Website" : "个人网站"}${isEnglish ? ":" : "："}${cleanText(basics.website)}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function addNameSpacing(name: string) {
  const clean = cleanText(name);
  return /^[\u4e00-\u9fff]{2,4}$/.test(clean) ? Array.from(clean).join("  ") : clean;
}

function getSectionLabels(isEnglish: boolean) {
  return isEnglish
    ? {
        additional: "ADDITIONAL",
        awards: "HONORS & AWARDS",
        campus: "ACTIVITIES",
        certifications: "CERTIFICATIONS",
        courses: "Relevant Coursework: ",
        education: "EDUCATION",
        experience: "EXPERIENCE",
        honors: "Honors: ",
        language: "Languages: ",
        projects: "PROJECTS",
        skills: "SKILLS",
      }
    : {
        additional: "自定义模块",
        awards: "获奖经历",
        campus: "校园经历",
        certifications: "证书",
        courses: "核心课程：",
        education: "教育背景",
        experience: "实习经历",
        honors: "荣誉奖项：",
        language: "语言：",
        projects: "项目经历",
        skills: "技能/兴趣",
      };
}
