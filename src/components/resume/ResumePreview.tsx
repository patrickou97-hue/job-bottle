import type {
  ResumeCustomSection,
  ResumeDocument,
  ResumeExperience,
  ResumeProject,
  ResumeSkillGroup,
} from "@/lib/resume";

export function ResumePreview({ resume }: { resume: ResumeDocument }) {
  return (
    <div
      id="resume-print-area"
      className="resume-paper mx-auto min-h-[1123px] w-full max-w-[794px] bg-white px-12 py-11 text-[#151822] shadow-[0_24px_90px_rgba(0,0,0,0.28)]"
    >
      {resume.templateId === "modern" ? (
        <ResumeTemplateModern resume={resume} />
      ) : (
        <ResumeTemplateClassic resume={resume} />
      )}
    </div>
  );
}

function ResumeTemplateClassic({ resume }: { resume: ResumeDocument }) {
  const basics = resume.content.basics;
  return (
    <article className="resume-classic font-sans">
      <header className="border-b border-[#1d2433] pb-4 text-center">
        <h1 className="text-3xl font-bold tracking-wide">{basics.name || "姓名"}</h1>
        {basics.englishName ? <p className="mt-1 text-sm">{basics.englishName}</p> : null}
        <p className="mt-3 text-[12px] leading-5 text-[#3c4350]">
          {[basics.phone, basics.email, basics.city, basics.linkedin, basics.github, basics.website]
            .filter(Boolean)
            .join(" | ")}
        </p>
        {(basics.targetRole || resume.targetRole) ? (
          <p className="mt-2 text-sm font-semibold">{basics.targetRole || resume.targetRole}</p>
        ) : null}
      </header>

      <ResumeSections resume={resume} tone="classic" />
    </article>
  );
}

function ResumeTemplateModern({ resume }: { resume: ResumeDocument }) {
  const basics = resume.content.basics;
  return (
    <article className="resume-modern font-sans">
      <header className="grid gap-4 border-b border-[#d7dbe3] pb-5 sm:grid-cols-[1fr_auto]">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#20283a]">{basics.name || "姓名"}</h1>
          {basics.englishName ? <p className="mt-1 text-sm text-[#596273]">{basics.englishName}</p> : null}
          {(basics.targetRole || resume.targetRole) ? (
            <p className="mt-3 text-sm font-semibold text-[#313b59]">
              {basics.targetRole || resume.targetRole}
            </p>
          ) : null}
        </div>
        <p className="max-w-[300px] whitespace-pre-line text-right text-[12px] leading-5 text-[#4c5567]">
          {[basics.phone, basics.email, basics.city, basics.linkedin, basics.github, basics.website]
            .filter(Boolean)
            .join("\n")}
        </p>
      </header>

      <ResumeSections resume={resume} tone="modern" />
    </article>
  );
}

function ResumeSections({ resume, tone }: { resume: ResumeDocument; tone: "classic" | "modern" }) {
  const sectionClass =
    tone === "modern"
      ? "mt-5 border-l-2 border-[#69648c]/35 pl-4"
      : "mt-5";

  return (
    <div>
      {resume.content.education.length > 0 ? (
        <section className={sectionClass}>
          <SectionTitle title="教育经历" />
          {resume.content.education.map((item) => (
            <div key={item.id} className="mt-3">
              <ResumeRow
                title={`${item.school || "学校"}${item.major ? ` · ${item.major}` : ""}`}
                meta={[item.degree, item.gpa].filter(Boolean).join(" | ")}
                time={[item.startDate, item.endDate].filter(Boolean).join(" - ")}
              />
              {item.courses ? <p className="mt-1 text-[12px] leading-5">相关课程：{item.courses}</p> : null}
              {item.honors ? <p className="mt-1 text-[12px] leading-5">荣誉奖项：{item.honors}</p> : null}
            </div>
          ))}
        </section>
      ) : null}

      {resume.content.work.length > 0 ? (
        <section className={sectionClass}>
          <SectionTitle title="实习 / 工作经历" />
          {resume.content.work.map((item) => (
            <ExperienceBlock key={item.id} item={item} />
          ))}
        </section>
      ) : null}

      {resume.content.projects.length > 0 ? (
        <section className={sectionClass}>
          <SectionTitle title="项目经历" />
          {resume.content.projects.map((item) => (
            <ProjectBlock key={item.id} item={item} />
          ))}
        </section>
      ) : null}

      {resume.content.skills.length > 0 ? (
        <section className={sectionClass}>
          <SectionTitle title="技能" />
          {resume.content.skills.map((group) => (
            <SkillLine key={group.id} group={group} />
          ))}
        </section>
      ) : null}

      <CustomSections sections={resume.content.campus} title="校园经历" sectionClass={sectionClass} />
      <CustomSections sections={resume.content.awards} title="获奖经历" sectionClass={sectionClass} />
      <CustomSections sections={resume.content.certifications} title="证书" sectionClass={sectionClass} />
      <CustomSections sections={resume.content.languages} title="语言能力" sectionClass={sectionClass} />
      {resume.content.customSections.map((section) => (
        <section key={section.id} className={sectionClass}>
          <SectionTitle title={section.title || "自定义模块"} />
          <BulletList bullets={section.bullets} />
        </section>
      ))}
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <h2 className="border-b border-[#d7dbe3] pb-1 text-[15px] font-bold tracking-wide text-[#1f2634]">
      {title}
    </h2>
  );
}

function ResumeRow({ title, meta, time }: { title: string; meta?: string; time?: string }) {
  return (
    <div className="flex gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold leading-5">{title}</p>
        {meta ? <p className="text-[12px] leading-5 text-[#4f5868]">{meta}</p> : null}
      </div>
      {time ? <p className="shrink-0 text-right text-[12px] leading-5 text-[#4f5868]">{time}</p> : null}
    </div>
  );
}

function ExperienceBlock({ item }: { item: ResumeExperience }) {
  const time = item.current ? `${item.startDate} - 至今` : [item.startDate, item.endDate].filter(Boolean).join(" - ");
  return (
    <div className="mt-3">
      <ResumeRow
        title={`${item.company || "公司"}${item.title ? ` · ${item.title}` : ""}`}
        meta={item.location}
        time={time}
      />
      <BulletList bullets={item.bullets} />
    </div>
  );
}

function ProjectBlock({ item }: { item: ResumeProject }) {
  return (
    <div className="mt-3">
      <ResumeRow
        title={`${item.name || "项目名称"}${item.role ? ` · ${item.role}` : ""}`}
        meta={item.keywords}
        time={[item.startDate, item.endDate].filter(Boolean).join(" - ")}
      />
      <BulletList bullets={item.bullets} />
    </div>
  );
}

function SkillLine({ group }: { group: ResumeSkillGroup }) {
  const skills = group.skills.map((skill) => skill.trim()).filter(Boolean);
  if (!group.category && skills.length === 0) return null;
  return (
    <p className="mt-2 text-[12px] leading-5">
      <span className="font-semibold">{group.category || "技能"}：</span>
      {skills.join("、")}
    </p>
  );
}

function CustomSections({
  sections,
  title,
  sectionClass,
}: {
  sections: ResumeCustomSection[];
  title: string;
  sectionClass: string;
}) {
  if (sections.length === 0) return null;
  return (
    <section className={sectionClass}>
      <SectionTitle title={title} />
      {sections.map((section) => (
        <div key={section.id} className="mt-3">
          {section.title && section.title !== title ? (
            <p className="text-[13px] font-bold leading-5">{section.title}</p>
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
    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[12px] leading-5">
      {clean.map((bullet, index) => (
        <li key={`${bullet}-${index}`}>{bullet}</li>
      ))}
    </ul>
  );
}
