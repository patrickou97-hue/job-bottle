import { normalizeResumeFontId, normalizeResumeLatinFontId, type ResumeDocument, type ResumeLanguage } from "@/lib/resume";

const FONT_META_KEY = "__job_bottle_font_id";
const LATIN_FONT_META_KEY = "__job_bottle_latin_font_id";

type FontPreferences = Pick<ResumeDocument, "fontId" | "latinFontId">;

export function getStoredResumeFonts(content: unknown, language: ResumeLanguage): FontPreferences {
  const metadata = content && typeof content === "object" ? content as Record<string, unknown> : {};
  return {
    fontId: normalizeResumeFontId(metadata[FONT_META_KEY], language),
    latinFontId: language === "zh-CN" ? normalizeResumeLatinFontId(metadata[LATIN_FONT_META_KEY]) : undefined,
  };
}

export function resumeFontMetadata(preferences: FontPreferences, language: ResumeLanguage) {
  const fontId = normalizeResumeFontId(preferences.fontId, language);
  const latinFontId = normalizeResumeLatinFontId(preferences.latinFontId);
  return {
    ...(fontId === "default" ? {} : { [FONT_META_KEY]: fontId }),
    ...(language === "zh-CN" && latinFontId !== "default" ? { [LATIN_FONT_META_KEY]: latinFontId } : {}),
  };
}
