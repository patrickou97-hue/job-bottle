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
      className="resume-paper mx-auto min-h-[1123px] w-full max-w-[794px] bg-white px-10 py-8 text-[#11141c] shadow-[0_24px_90px_rgba(0,0,0,0.28)]"
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
    <article className="resume-classic font-sans text-[11.5px] leading-[1.42]">
      <header className="border-b border-[#141923] pb-2 text-center">
        <h1 className="text-[25px] font-bold leading-none tracking-[0.18em]">{basics.name || "姓名"}</h1>
        {basics.englishName ? <p className="mt-1 text-[11px]">{basics.englishName}</p> : null}
        <p className="mt-2 text-[11.5px] leading-[1.45] text-[#303846]">
          {[basics.phone, basics.email, basics.city, basics.linkedin, basics.github, basics.website]
            .filter(Boolean)
            .join(" | ")}
        </p>
        {(basics.targetRole || resume.targetRole) ? (
          <p className="mt-1 text-[12px] font-semibold">{basics.targetRole || resume.targetRole}</p>
        ) : null}
      </header>

      <ResumeSections resume={resume} tone="classic" />
    </article>
  );
}

function ResumeTemplateModern({ resume }: { resume: ResumeDocument }) {
  const basics = resume.content.basics;
  return (
    <article className="resume-modern font-sans text-[11.5px] leading-[1.42]">
      <header className="grid gap-3 border-b border-[#cfd4de] pb-3 sm:grid-cols-[1fr_auto]">
        <div>
          <h1 className="text-[25px] font-bold leading-none tracking-tight text-[#20283a]">{basics.name || "姓名"}</h1>
          {basics.englishName ? <p className="mt-1 text-[11px] text-[#596273]">{basics.englishName}</p> : null}
          {(basics.targetRole || resume.targetRole) ? (
            <p className="mt-2 text-[12px] font-semibold text-[#313b59]">
              {basics.targetRole || resume.targetRole}
            </p>
          ) : null}
        </div>
        <p className="max-w-[300px] whitespace-pre-line text-right text-[11.5px] leading-[1.45] text-[#4c5567]">
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
      ? "mt-3 border-l-2 border-[#69648c]/30 pl-3"
      : "mt-3";

  return (
    <div>
      {resume.content.education.length > 0 ? (
        <section className={sectionClass}>
          <SectionTitle title="教育经历" />
          {resume.content.education.map((item) => (
            <div key={item.id} className="mt-2">
              <ResumeRow
                title={`${item.school || "学校"}${item.major ? ` · ${item.major}` : ""}`}
                meta={[item.degree, item.gpa].filter(Boolean).join(" | ")}
                time={[item.startDate, item.endDate].filter(Boolean).join(" - ")}
              />
              {item.courses ? (
                <p className="mt-0.5 text-[11.5px] leading-[1.42]">
                  <span className="font-semibold">相关课程：</span>
                  {item.courses}
                </p>
              ) : null}
              {item.honors ? (
                <p className="mt-0.5 text-[11.5px] leading-[1.42]">
                  <span className="font-semibold">荣誉奖项：</span>
                  {item.honors}
                </p>
              ) : null}
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
    <h2 className="border-b border-[#1d2433] pb-0.5 text-[14px] font-bold leading-[1.25] tracking-wide text-[#111827]">
      {title}
    </h2>
  );
}

function ResumeRow({ title, meta, time }: { title: string; meta?: string; time?: string }) {
  return (
    <div className="flex gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-bold leading-[1.35]">{title}</p>
        {meta ? <p className="text-[11.5px] leading-[1.35] text-[#3f4858]">{meta}</p> : null}
      </div>
      {time ? <p className="shrink-0 text-right text-[11.5px] leading-[1.35] text-[#3f4858]">{time}</p> : null}
    </div>
  );
}

function ExperienceBlock({ item }: { item: ResumeExperience }) {
  const time = item.current ? `${item.startDate} - 至今` : [item.startDate, item.endDate].filter(Boolean).join(" - ");
  return (
    <div className="mt-2">
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
    <div className="mt-2">
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
    <p className="mt-1.5 text-[11.5px] leading-[1.45]">
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
        <div key={section.id} className="mt-2">
          {section.title && section.title !== title ? (
            <p className="text-[12px] font-bold leading-[1.35]">{section.title}</p>
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
    <ul className="mt-0.5 list-disc space-y-0 pl-4 text-[11.5px] leading-[1.42] marker:text-[9px]">
      {clean.map((bullet, index) => (
        <li key={`${bullet}-${index}`}>{bullet}</li>
      ))}
    </ul>
  );
}
