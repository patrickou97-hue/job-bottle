import type { ResumeTranslationDraft } from "@/lib/resume-translation";

export const MAX_TRANSLATION_CHUNK_SOURCE_CHARS = 1_800;
export const MAX_TRANSLATION_CHUNK_ENTRIES = 24;

export type TranslationEntry = {
  key: string;
  kind: string;
  value: string;
  maxLength: number;
  path: Array<string | number>;
};

export type TranslationChunk = {
  index: number;
  label: string;
  entries: TranslationEntry[];
};

export type TranslationPlan = {
  source: ResumeTranslationDraft;
  chunks: TranslationChunk[];
  leafCount: number;
};

type TranslationGroup = {
  label: string;
  entries: TranslationEntry[];
};

type CustomSectionKey = "campus" | "awards" | "certifications" | "languages" | "customSections";

export function createTranslationPlan(source: ResumeTranslationDraft): TranslationPlan {
  const groups: TranslationGroup[] = [];
  let keyIndex = 0;

  const addGroup = (label: string, collect: (entries: TranslationEntry[]) => void) => {
    const entries: TranslationEntry[] = [];
    collect(entries);
    if (entries.length > 0) groups.push({ label, entries });
  };
  const addEntry = (
    entries: TranslationEntry[],
    path: Array<string | number>,
    kind: string,
    value: string | undefined,
    maxLength: number,
  ) => {
    if (!value?.trim()) return;
    entries.push({
      key: `t${keyIndex++}`,
      kind,
      value,
      maxLength,
      path,
    });
  };

  addGroup("基本信息", (entries) => {
    addEntry(entries, ["title"], "resume_title", source.title, 180);
    addEntry(entries, ["targetRole"], "target_role", source.targetRole, 180);
    addEntry(entries, ["jobTarget"], "job_target", source.jobTarget, 500);
    addEntry(entries, ["basics", "city"], "city", source.basics.city, 120);
    addEntry(entries, ["basics", "targetRole"], "target_role", source.basics.targetRole, 180);
  });

  source.education.forEach((item, index) => {
    addGroup(`教育经历 ${index + 1}`, (entries) => {
      addEntry(entries, ["education", index, "school"], "school", item.school, 180);
      addEntry(entries, ["education", index, "degree"], "degree", item.degree, 100);
      addEntry(entries, ["education", index, "major"], "major", item.major, 180);
      addEntry(entries, ["education", index, "courses"], "courses", item.courses, 800);
      addEntry(entries, ["education", index, "honors"], "honors", item.honors, 800);
    });
  });

  source.work.forEach((item, index) => {
    addGroup(`工作经历 ${index + 1}`, (entries) => {
      addEntry(entries, ["work", index, "company"], "company", item.company, 180);
      addEntry(entries, ["work", index, "title"], "position", item.title, 180);
      addEntry(entries, ["work", index, "location"], "location", item.location, 120);
      item.bullets.forEach((bullet, bulletIndex) => {
        addEntry(entries, ["work", index, "bullets", bulletIndex], "work_bullet", bullet, 1_000);
      });
    });
  });

  source.projects.forEach((item, index) => {
    addGroup(`项目经历 ${index + 1}`, (entries) => {
      addEntry(entries, ["projects", index, "name"], "project", item.name, 180);
      addEntry(entries, ["projects", index, "role"], "project_role", item.role, 180);
      item.bullets.forEach((bullet, bulletIndex) => {
        addEntry(entries, ["projects", index, "bullets", bulletIndex], "project_bullet", bullet, 1_000);
      });
      addEntry(entries, ["projects", index, "keywords"], "keywords", item.keywords, 500);
    });
  });

  addGroup("技能", (entries) => {
    source.skills.forEach((item, index) => {
      addEntry(entries, ["skills", index, "category"], "skill_category", item.category, 120);
      item.skills.forEach((skill, skillIndex) => {
        addEntry(entries, ["skills", index, "skills", skillIndex], "skill", skill, 120);
      });
    });
  });

  const customCollections: Array<{ key: CustomSectionKey; label: string }> = [
    { key: "campus", label: "校园经历" },
    { key: "awards", label: "奖项" },
    { key: "certifications", label: "证书" },
    { key: "languages", label: "语言" },
    { key: "customSections", label: "自定义模块" },
  ];
  customCollections.forEach(({ key, label }) => {
    source[key].forEach((item, index) => {
      addGroup(`${label} ${index + 1}`, (entries) => {
        addEntry(entries, [key, index, "title"], "section_title", item.title, 180);
        addEntry(entries, [key, index, "role"], "section_role", item.role, 180);
        item.bullets.forEach((bullet, bulletIndex) => {
          addEntry(entries, [key, index, "bullets", bulletIndex], "section_bullet", bullet, 1_000);
        });
      });
    });
  });

  const chunks: TranslationChunk[] = [];
  let currentEntries: TranslationEntry[] = [];
  let currentLabels: string[] = [];
  let currentSourceChars = 0;
  const flush = () => {
    if (currentEntries.length === 0) return;
    chunks.push({
      index: chunks.length,
      label: currentLabels.length === 1
        ? currentLabels[0]
        : `${currentLabels[0]}等 ${currentLabels.length} 个部分`,
      entries: currentEntries,
    });
    currentEntries = [];
    currentLabels = [];
    currentSourceChars = 0;
  };

  groups.forEach((group) => {
    group.entries.forEach((entry) => {
      const exceedsEntryLimit = currentEntries.length >= MAX_TRANSLATION_CHUNK_ENTRIES;
      const exceedsCharacterLimit = currentEntries.length > 0
        && currentSourceChars + entry.value.length > MAX_TRANSLATION_CHUNK_SOURCE_CHARS;
      if (exceedsEntryLimit || exceedsCharacterLimit) flush();
      currentEntries.push(entry);
      currentSourceChars += entry.value.length;
      if (!currentLabels.includes(group.label)) currentLabels.push(group.label);
    });
  });
  flush();

  return {
    source,
    chunks,
    leafCount: keyIndex,
  };
}

export function applyTranslationValues(
  plan: TranslationPlan,
  values: ReadonlyMap<string, string>,
): ResumeTranslationDraft {
  if (values.size !== plan.leafCount) {
    throw new Error("translation values do not match the plan");
  }
  const translated = structuredClone(plan.source);
  const knownKeys = new Set<string>();
  plan.chunks.forEach((chunk) => {
    chunk.entries.forEach((entry) => {
      knownKeys.add(entry.key);
      const value = values.get(entry.key);
      if (value === undefined || value.length > entry.maxLength) {
        throw new Error(`invalid translation for ${entry.key}`);
      }
      setPathValue(translated, entry.path, value);
    });
  });
  if (knownKeys.size !== values.size || Array.from(values.keys()).some((key) => !knownKeys.has(key))) {
    throw new Error("translation values contain unknown keys");
  }
  return translated;
}

function setPathValue(target: ResumeTranslationDraft, path: Array<string | number>, value: string) {
  let cursor: unknown = target;
  for (const segment of path.slice(0, -1)) {
    if (!cursor || typeof cursor !== "object") throw new Error("invalid translation path");
    cursor = Array.isArray(cursor)
      ? cursor[Number(segment)]
      : (cursor as Record<string, unknown>)[String(segment)];
  }
  if (!cursor || typeof cursor !== "object") throw new Error("invalid translation path");
  const finalSegment = path[path.length - 1];
  if (Array.isArray(cursor)) {
    cursor[Number(finalSegment)] = value;
  } else {
    (cursor as Record<string, unknown>)[String(finalSegment)] = value;
  }
}
