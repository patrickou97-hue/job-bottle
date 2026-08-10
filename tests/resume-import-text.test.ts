import assert from "node:assert/strict";
import test from "node:test";
const importTextModulePath = "../src/lib/resume-import-text." + "ts";
const { cleanResumeBullet, normalizeResumeImportText } = await import(importTextModulePath);

test("PDF Wingdings 项目符号乱码只在行首被规范化", () => {
  const normalized = normalizeResumeImportText([
    "EXPERIENCE",
    "· ü Conducted data analysis",
    " Applied SQL and Excel",
    " Evaluated category growth",
    "München office",
  ].join("\n"));

  assert.equal(normalized.includes("ü Conducted"), false);
  assert.equal(normalized.includes(" Applied"), false);
  assert.equal(normalized.includes(" Evaluated"), false);
  assert.match(normalized, /• Conducted data analysis/);
  assert.match(normalized, /• Applied SQL and Excel/);
  assert.match(normalized, /• Evaluated category growth/);
  assert.match(normalized, /München office/);
});

test("导入 bullet 清理排版噪声但保留正文字符", () => {
  assert.equal(cleanResumeBullet("· ü Acquired 100+ users"), "Acquired 100+ users");
  assert.equal(cleanResumeBullet("ü Directed product design"), "Directed product design");
  assert.equal(cleanResumeBullet("München market research"), "München market research");
});
