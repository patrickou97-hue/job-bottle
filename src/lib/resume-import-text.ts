const PDF_BULLET_GLYPHS = "ü";

export function normalizeResumeImportText(value: string, maxLength = 24_000) {
  const bulletGlyphPattern = new RegExp(`(^|\\n)\\s*[-•·▪◦*]\\s*[${PDF_BULLET_GLYPHS}]\\s*`, "g");
  const bareBulletGlyphPattern = new RegExp(`(^|\\n)\\s*[${PDF_BULLET_GLYPHS}]\\s+(?=\\S)`, "g");
  return value
    .replace(/\u0000/g, "")
    .replace(/\u00ad/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(bulletGlyphPattern, "$1• ")
    .replace(bareBulletGlyphPattern, "$1• ")
    .replace(/[\t\f\v]+/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}

export function cleanResumeBullet(value: string) {
  const bareBulletGlyphPattern = new RegExp(`^[${PDF_BULLET_GLYPHS}]\\s+`, "i");
  return value
    .replace(/\u00ad/g, "")
    .replace(/^[-•·▪◦*]+\s*/, "")
    .replace(bareBulletGlyphPattern, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}
