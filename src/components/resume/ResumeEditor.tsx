"use client";

import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  createBlankCustomSection,
  createBlankEducation,
  createBlankExperience,
  createBlankProject,
  createBlankSkillGroup,
  touchResume,
  type ResumeContent,
  type ResumeDocument,
  type ResumeEducation,
  type ResumeExperience,
  type ResumeProject,
  type ResumeSkillGroup,
  type ResumeCustomSection,
} from "@/lib/resume";
import type { Job } from "@/lib/types";

type EditorSection = "basic" | "education" | "work" | "projects" | "skills" | "other" | "target";

const EDITOR_SECTIONS: { id: EditorSection; label: string }[] = [
  { id: "basic", label: "基础" },
  { id: "education", label: "教育" },
  { id: "work", label: "经历" },
  { id: "projects", label: "项目" },
  { id: "skills", label: "技能" },
  { id: "other", label: "其他" },
  { id: "target", label: "岗位版本" },
];

export function ResumeEditor({
  resume,
  jobs,
  activeSection,
  onSectionChange,
  onChange,
}: {
  resume: ResumeDocument;
  jobs: Job[];
  activeSection: EditorSection;
  onSectionChange: (section: EditorSection) => void;
  onChange: (resume: ResumeDocument) => void;
}) {
  function patchResume(patch: Partial<ResumeDocument>) {
    onChange(touchResume({ ...resume, ...patch }));
  }

  function patchContent(patch: Partial<ResumeContent>) {
    patchResume({ content: { ...resume.content, ...patch } });
  }

  function patchBasics(key: keyof ResumeContent["basics"], value: string) {
    patchContent({
      basics: {
        ...resume.content.basics,
        [key]: value,
      },
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {EDITOR_SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            className={`px-1 py-2 text-sm font-medium transition ${
              activeSection === section.id
                ? "border-b-2 border-[rgba(242,209,109,0.52)] text-ink-primary"
                : "text-ink-muted hover:text-ink-secondary"
            }`}
            onClick={() => onSectionChange(section.id)}
          >
            {section.label}
          </button>
        ))}
      </div>

      {activeSection === "basic" ? (
        <section className="space-y-4">
          <PhotoField
            value={resume.content.basics.photoDataUrl}
            onChange={(value) => patchBasics("photoDataUrl", value)}
          />
          <FieldGrid>
            <TextField label="简历名称" value={resume.title} onChange={(value) => patchResume({ title: value })} />
            <TextField label="姓名" value={resume.content.basics.name} onChange={(value) => patchBasics("name", value)} />
            <TextField label="英文名" value={resume.content.basics.englishName} onChange={(value) => patchBasics("englishName", value)} />
            <TextField label="手机号" value={resume.content.basics.phone} onChange={(value) => patchBasics("phone", value)} />
            <TextField label="邮箱" value={resume.content.basics.email} onChange={(value) => patchBasics("email", value)} />
            <TextField label="所在城市" value={resume.content.basics.city} onChange={(value) => patchBasics("city", value)} />
            <TextField label="求职方向（可选）" value={resume.content.basics.targetRole} onChange={(value) => patchBasics("targetRole", value)} />
            <TextField label="LinkedIn（可选）" value={resume.content.basics.linkedin} onChange={(value) => patchBasics("linkedin", value)} />
            <TextField label="GitHub（可选）" value={resume.content.basics.github} onChange={(value) => patchBasics("github", value)} />
            <TextField label="个人网站（可选）" value={resume.content.basics.website} onChange={(value) => patchBasics("website", value)} />
          </FieldGrid>
        </section>
      ) : null}

      {activeSection === "education" ? (
        <CollectionEditor
          title="教育经历"
          addLabel="新增教育经历"
          items={resume.content.education}
          onAdd={() => patchContent({ education: [...resume.content.education, createBlankEducation()] })}
          onRemove={(id) => patchContent({ education: resume.content.education.filter((item) => item.id !== id) })}
          renderItem={(item) => (
            <EducationEditor
              item={item}
              onChange={(next) => patchContent({ education: replaceById(resume.content.education, next) })}
            />
          )}
        />
      ) : null}

      {activeSection === "work" ? (
        <CollectionEditor
          title="实习 / 工作经历"
          addLabel="新增经历"
          items={resume.content.work}
          onAdd={() => patchContent({ work: [...resume.content.work, createBlankExperience()] })}
          onRemove={(id) => patchContent({ work: resume.content.work.filter((item) => item.id !== id) })}
          renderItem={(item) => (
            <ExperienceEditor
              item={item}
              onChange={(next) => patchContent({ work: replaceById(resume.content.work, next) })}
            />
          )}
        />
      ) : null}

      {activeSection === "projects" ? (
        <CollectionEditor
          title="项目经历"
          addLabel="新增项目"
          items={resume.content.projects}
          onAdd={() => patchContent({ projects: [...resume.content.projects, createBlankProject()] })}
          onRemove={(id) => patchContent({ projects: resume.content.projects.filter((item) => item.id !== id) })}
          renderItem={(item) => (
            <ProjectEditor
              item={item}
              onChange={(next) => patchContent({ projects: replaceById(resume.content.projects, next) })}
            />
          )}
        />
      ) : null}

      {activeSection === "skills" ? (
        <CollectionEditor
          title="技能"
          addLabel="新增技能分类"
          items={resume.content.skills}
          onAdd={() => patchContent({ skills: [...resume.content.skills, createBlankSkillGroup()] })}
          onRemove={(id) => patchContent({ skills: resume.content.skills.filter((item) => item.id !== id) })}
          renderItem={(item) => (
            <SkillEditor
              item={item}
              onChange={(next) => patchContent({ skills: replaceById(resume.content.skills, next) })}
            />
          )}
        />
      ) : null}

      {activeSection === "other" ? (
        <div className="space-y-6">
          <CustomSectionGroup
            title="校园经历"
            items={resume.content.campus}
            onChange={(items) => patchContent({ campus: items })}
          />
          <CustomSectionGroup
            title="获奖经历"
            items={resume.content.awards}
            onChange={(items) => patchContent({ awards: items })}
          />
          <CustomSectionGroup
            title="证书"
            items={resume.content.certifications}
            onChange={(items) => patchContent({ certifications: items })}
          />
          <CustomSectionGroup
            title="语言能力"
            items={resume.content.languages}
            onChange={(items) => patchContent({ languages: items })}
          />
          <CustomSectionGroup
            title="自定义模块"
            items={resume.content.customSections}
            onChange={(items) => patchContent({ customSections: items })}
          />
        </div>
      ) : null}

      {activeSection === "target" ? (
        <section className="space-y-4">
          <FieldGrid>
            <TextField label="目标岗位" value={resume.targetRole} onChange={(value) => patchResume({ targetRole: value })} />
            <TextField label="岗位版本说明" value={resume.jobTarget} onChange={(value) => patchResume({ jobTarget: value })} />
            <SelectField
              label="绑定岗位"
              value={resume.linkedJobId ?? ""}
              onChange={(value) => patchResume({ linkedJobId: value || null })}
              options={[
                { label: "暂不绑定", value: "" },
                ...jobs.slice(0, 120).map((job) => ({
                  label: `${job.company_name} ${job.job_titles ?? ""}`.trim(),
                  value: job.id,
                })),
              ]}
            />
          </FieldGrid>
          <p className="border-l border-[color:var(--star-apricot)] pl-3 text-sm leading-6 text-ink-secondary">
            复制通用简历后，在这里选择要关联的岗位。
          </p>
        </section>
      ) : null}
    </div>
  );
}

function PhotoField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  async function handleFile(file: File | undefined) {
    if (!file) return;
    const dataUrl = await cropPhotoToPortrait(file);
    onChange(dataUrl);
  }

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-[22px] bg-white/[0.035] p-4">
      <div className="flex h-28 w-[86px] items-center justify-center overflow-hidden rounded-[14px] bg-white/[0.07] ring-1 ring-white/[0.08]">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="简历照片预览" className="h-full w-full object-cover" />
        ) : (
          <ImagePlus aria-hidden="true" className="size-7 text-ink-muted" />
        )}
      </div>
      <div className="min-w-[220px] flex-1">
        <p className="text-sm font-semibold text-ink-primary">简历照片</p>
        <p className="mt-1 text-xs leading-5 text-ink-muted">
          上传后自动居中裁剪为证件照比例，适合中文简历放在右上角。
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="muted-button pressable inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm">
            <ImagePlus aria-hidden="true" className="size-4" />
            上传照片
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                void handleFile(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
          </label>
          {value ? (
            <button
              type="button"
              className="muted-button pressable inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-red-100"
              onClick={() => onChange("")}
            >
              <X aria-hidden="true" className="size-4" />
              移除
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

async function cropPhotoToPortrait(file: File) {
  const image = await loadImageFromFile(file);
  const outputWidth = 360;
  const outputHeight = 450;
  const outputRatio = outputWidth / outputHeight;
  const inputRatio = image.naturalWidth / image.naturalHeight;
  let sourceWidth = image.naturalWidth;
  let sourceHeight = image.naturalHeight;
  let sourceX = 0;
  let sourceY = 0;

  if (inputRatio > outputRatio) {
    sourceWidth = image.naturalHeight * outputRatio;
    sourceX = (image.naturalWidth - sourceWidth) / 2;
  } else {
    sourceHeight = image.naturalWidth / outputRatio;
    sourceY = Math.max(0, (image.naturalHeight - sourceHeight) * 0.32);
  }

  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext("2d");
  if (!context) return "";
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, outputWidth, outputHeight);
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    outputWidth,
    outputHeight,
  );
  return canvas.toDataURL("image/jpeg", 0.88);
}

function loadImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("照片读取失败，请换一张图片。"));
    reader.onload = () => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("照片格式无法识别，请换一张图片。"));
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-ink-muted">{label}</span>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-ink-muted">{label}</span>
      <Select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value || "empty"} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </label>
  );
}

function CollectionEditor<T extends { id: string }>({
  title,
  addLabel,
  items,
  onAdd,
  onRemove,
  renderItem,
}: {
  title: string;
  addLabel: string;
  items: T[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  renderItem: (item: T) => React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="section-title">{title}</h2>
        <Button variant="secondary" className="gap-2" onClick={onAdd}>
          <Plus aria-hidden="true" className="size-4" />
          {addLabel}
        </Button>
      </div>
      {items.length === 0 ? <p className="text-sm text-ink-muted">暂无内容。</p> : null}
      {items.map((item, index) => (
        <div key={item.id} className="space-y-4 border-t border-white/[0.08] pt-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-ink-muted">第 {index + 1} 条</span>
            <button
              type="button"
              className="text-action pressable rounded-full px-3 py-1 text-xs text-red-200"
              onClick={() => onRemove(item.id)}
            >
              删除
            </button>
          </div>
          {renderItem(item)}
        </div>
      ))}
    </section>
  );
}

function EducationEditor({ item, onChange }: { item: ResumeEducation; onChange: (item: ResumeEducation) => void }) {
  const patch = (patchValue: Partial<ResumeEducation>) => onChange({ ...item, ...patchValue });
  return (
    <FieldGrid>
      <TextField label="学校" value={item.school} onChange={(value) => patch({ school: value })} />
      <TextField label="学位" value={item.degree} onChange={(value) => patch({ degree: value })} />
      <TextField label="专业" value={item.major} onChange={(value) => patch({ major: value })} />
      <TextField label="GPA" value={item.gpa} onChange={(value) => patch({ gpa: value })} />
      <TextField label="开始时间" value={item.startDate} onChange={(value) => patch({ startDate: value })} />
      <TextField label="结束时间" value={item.endDate} onChange={(value) => patch({ endDate: value })} />
      <TextField label="相关课程" value={item.courses} onChange={(value) => patch({ courses: value })} />
      <TextField label="荣誉奖项" value={item.honors} onChange={(value) => patch({ honors: value })} />
    </FieldGrid>
  );
}

function ExperienceEditor({ item, onChange }: { item: ResumeExperience; onChange: (item: ResumeExperience) => void }) {
  const patch = (patchValue: Partial<ResumeExperience>) => onChange({ ...item, ...patchValue });
  return (
    <div className="space-y-4">
      <FieldGrid>
        <TextField label="公司名称" value={item.company} onChange={(value) => patch({ company: value })} />
        <TextField label="岗位名称" value={item.title} onChange={(value) => patch({ title: value })} />
        <TextField label="地点" value={item.location} onChange={(value) => patch({ location: value })} />
        <TextField label="开始时间" value={item.startDate} onChange={(value) => patch({ startDate: value })} />
        <TextField label="结束时间" value={item.endDate} onChange={(value) => patch({ endDate: value })} />
        <label className="flex items-end gap-2 pb-2 text-sm text-ink-secondary">
          <input
            type="checkbox"
            checked={item.current}
            onChange={(event) => patch({ current: event.target.checked })}
          />
          至今
        </label>
      </FieldGrid>
      <BulletEditor bullets={item.bullets} onChange={(bullets) => patch({ bullets })} />
    </div>
  );
}

function ProjectEditor({ item, onChange }: { item: ResumeProject; onChange: (item: ResumeProject) => void }) {
  const patch = (patchValue: Partial<ResumeProject>) => onChange({ ...item, ...patchValue });
  return (
    <div className="space-y-4">
      <FieldGrid>
        <TextField label="项目名称" value={item.name} onChange={(value) => patch({ name: value })} />
        <TextField label="角色" value={item.role} onChange={(value) => patch({ role: value })} />
        <TextField label="开始时间" value={item.startDate} onChange={(value) => patch({ startDate: value })} />
        <TextField label="结束时间" value={item.endDate} onChange={(value) => patch({ endDate: value })} />
        <TextField label="技术栈或关键词" value={item.keywords} onChange={(value) => patch({ keywords: value })} />
      </FieldGrid>
      <BulletEditor bullets={item.bullets} onChange={(bullets) => patch({ bullets })} />
    </div>
  );
}

function SkillEditor({ item, onChange }: { item: ResumeSkillGroup; onChange: (item: ResumeSkillGroup) => void }) {
  const patch = (patchValue: Partial<ResumeSkillGroup>) => onChange({ ...item, ...patchValue });
  return (
    <div className="space-y-4">
      <TextField label="分类" value={item.category} onChange={(value) => patch({ category: value })} />
      <BulletEditor label="技能列表" bullets={item.skills} onChange={(skills) => patch({ skills })} compact />
    </div>
  );
}

function CustomSectionGroup({
  title,
  items,
  onChange,
}: {
  title: string;
  items: ResumeCustomSection[];
  onChange: (items: ResumeCustomSection[]) => void;
}) {
  return (
    <CollectionEditor
      title={title}
      addLabel="新增"
      items={items}
      onAdd={() => onChange([...items, createBlankCustomSection(title)])}
      onRemove={(id) => onChange(items.filter((item) => item.id !== id))}
      renderItem={(item) => (
        <div className="space-y-4">
          <TextField
            label="标题"
            value={item.title}
            onChange={(value) => onChange(replaceById(items, { ...item, title: value }))}
          />
          <BulletEditor
            bullets={item.bullets}
            onChange={(bullets) => onChange(replaceById(items, { ...item, bullets }))}
          />
        </div>
      )}
    />
  );
}

function BulletEditor({
  label = "描述要点",
  bullets,
  onChange,
  compact = false,
}: {
  label?: string;
  bullets: string[];
  onChange: (bullets: string[]) => void;
  compact?: boolean;
}) {
  function update(index: number, value: string) {
    onChange(bullets.map((bullet, bulletIndex) => (bulletIndex === index ? value : bullet)));
  }

  function move(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= bullets.length) return;
    const next = [...bullets];
    const current = next[index];
    next[index] = next[nextIndex];
    next[nextIndex] = current;
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-ink-muted">{label}</span>
        <button
          type="button"
          className="text-action pressable rounded-full px-3 py-1 text-xs"
          onClick={() => onChange([...bullets, ""])}
        >
          新增
        </button>
      </div>
      {bullets.map((bullet, index) => (
        <div key={index} className="grid grid-cols-[1fr_auto] items-center gap-2">
          <Input
            value={bullet}
            placeholder={compact ? "例如 SQL" : "用一句话写清动作、方法和结果"}
            onChange={(event) => update(index, event.target.value)}
          />
          <div className="flex items-center gap-1">
            <IconButton label="上移" onClick={() => move(index, -1)}>
              <ArrowUp aria-hidden="true" className="size-3.5" />
            </IconButton>
            <IconButton label="下移" onClick={() => move(index, 1)}>
              <ArrowDown aria-hidden="true" className="size-3.5" />
            </IconButton>
            <IconButton label="删除" onClick={() => onChange(bullets.filter((_, bulletIndex) => bulletIndex !== index))}>
              <Trash2 aria-hidden="true" className="size-3.5" />
            </IconButton>
          </div>
        </div>
      ))}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="muted-button pressable inline-flex size-8 items-center justify-center rounded-full"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function replaceById<T extends { id: string }>(items: T[], nextItem: T) {
  return items.map((item) => (item.id === nextItem.id ? nextItem : item));
}

export type { EditorSection };
