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
      className="resume-paper mx-auto min-h-[1056px] w-full max-w-[816px] bg-white px-[48px] py-[38px] text-[#111111] shadow-[0_24px_90px_rgba(0,0,0,0.28)]"
    >
      <ResumeTemplateCompact resume={resume} />
    </div>
  );
}

function ResumeTemplateCompact({ resume }: { resume: ResumeDocument }) {
  const basics = resume.content.basics;
  return (
    <article className="resume-compact font-serif text-[13px] leading-[1.18]">
      <header className="relative pb-1 text-center">
        <div className={basics.photoDataUrl ? "px-[82px]" : ""}>
          <h1 className="text-[24px] font-bold leading-none tracking-[0.18em]">{basics.name || "姓名"}</h1>
          {basics.englishName ? <p className="mt-1 text-[12px]">{basics.englishName}</p> : null}
          <p className="mt-2 text-[13px] leading-[1.22] text-[#111111]">
            {[basics.phone, basics.email, basics.city]
              .filter(Boolean)
              .join(" | ")}
          </p>
          {(basics.targetRole || resume.targetRole) ? (
            <p className="mt-1 text-[13px] font-semibold">{basics.targetRole || resume.targetRole}</p>
          ) : null}
        </div>
        <ResumePhoto src={basics.photoDataUrl} />
      </header>
      <ResumeSections resume={resume} />
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

function ResumeSections({ resume }: { resume: ResumeDocument }) {
  const sectionClass = "mt-[10px]";
  return (
    <div>
      {resume.content.education.length > 0 ? (
        <section className={sectionClass}>
          <SectionTitle title="教育背景" />
          {resume.content.education.map((item) => (
            <div key={item.id} className="mt-[5px]">
              <ResumeRow
                title={item.school || "学校"}
                meta={[item.major, item.degree, item.gpa].filter(Boolean).join(" · ")}
                time={[item.startDate, item.endDate].filter(Boolean).join(" - ")}
              />
              {item.courses ? (
                <p className="mt-[1px] text-[13px] leading-[1.18]">
                  <span className="font-semibold">核心课程：</span>
                  {item.courses}
                </p>
              ) : null}
              {item.honors ? (
                <p className="mt-[1px] text-[13px] leading-[1.18]">
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
          <SectionTitle title="实习经历" />
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
          <SectionTitle title="技能/兴趣" />
          {resume.content.languages
            .flatMap((section) => section.bullets)
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line, index) => (
              <p key={`language-${index}`} className="mt-[3px] text-[13px] leading-[1.18]">
                语言：{line}
              </p>
            ))}
          {resume.content.skills.map((group) => (
            <SkillLine key={group.id} group={group} />
          ))}
        </section>
      ) : null}

      <CustomSections sections={resume.content.campus} title="校园经历" sectionClass={sectionClass} />
      <CustomSections sections={resume.content.awards} title="获奖经历" sectionClass={sectionClass} />
      <CustomSections sections={resume.content.certifications} title="证书" sectionClass={sectionClass} />
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
    <h2 className="mt-[2px] flex items-center gap-[6px] pb-0 text-[16px] font-bold leading-[1.1] tracking-normal text-[#111111]">
      <span>{title}</span>
      <span className="h-px flex-1 bg-[#111111]" />
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

function ExperienceBlock({ item }: { item: ResumeExperience }) {
  const time = item.current ? `${item.startDate} - 至今` : [item.startDate, item.endDate].filter(Boolean).join(" - ");
  return (
    <div className="mt-[5px]">
      <ResumeRow
        title={item.company || "公司"}
        meta={[item.title, item.location].filter(Boolean).join(" · ")}
        time={time}
      />
      <BulletList bullets={item.bullets} />
    </div>
  );
}

function ProjectBlock({ item }: { item: ResumeProject }) {
  return (
    <div className="mt-[5px]">
      <ResumeRow
        title={[item.name || "项目名称", item.role].filter(Boolean).join(" - ")}
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
    <p className="mt-[3px] text-[13px] leading-[1.18]">
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
