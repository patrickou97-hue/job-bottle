import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const [indexTs, indexWxml, editorTs, editorWxml, requestSource, importRoute, translateRoute] = await Promise.all([
  readFile(new URL("starjob-miniprogram/miniprogram/pages/resumes/index.ts", root), "utf8"),
  readFile(new URL("starjob-miniprogram/miniprogram/pages/resumes/index.wxml", root), "utf8"),
  readFile(new URL("starjob-miniprogram/miniprogram/pages/resumes/editor.ts", root), "utf8"),
  readFile(new URL("starjob-miniprogram/miniprogram/pages/resumes/editor.wxml", root), "utf8"),
  readFile(new URL("starjob-miniprogram/miniprogram/services/request.ts", root), "utf8"),
  readFile(new URL("src/app/api/miniprogram/resumes/import/route.ts", root), "utf8"),
  readFile(new URL("src/app/api/miniprogram/resumes/[id]/translate/route.ts", root), "utf8"),
]);

test("小程序导入展示诚实的不定进度、已用时和取消", () => {
  assert.match(indexTs, /timeout:\s*mode === "ai" \? 105_000 : 25_000/);
  assert.match(indexTs, /onRequestTask/);
  assert.match(indexTs, /onCancelImport/);
  assert.doesNotMatch(indexTs, /getImportProgress|importProgress:/);
  assert.match(indexWxml, /\{\{importStage\}\}/);
  assert.match(indexWxml, /已用 \{\{importElapsedSeconds\}\} 秒/);
  assert.match(indexWxml, /aria-role="progressbar"/);
  assert.doesNotMatch(indexWxml, /importProgress|%/);
  assert.match(indexWxml, /取消本次导入/);
});

test("小程序润色和整份翻译使用独立可取消进度", () => {
  assert.match(editorTs, /timeout:\s*65_000/);
  assert.match(editorTs, /timeout:\s*190_000/);
  assert.match(editorTs, /startAiTask\("polish"\)/);
  assert.match(editorTs, /startAiTask\("translate"\)/);
  assert.match(editorTs, /onCancelAiTask/);
  assert.doesNotMatch(editorTs, /getAiTaskProgress|aiTaskProgress:/);
  assert.match(editorWxml, /aiTaskKind === 'translate'/);
  assert.match(editorWxml, /aria-role="progressbar"/);
  assert.doesNotMatch(editorWxml, /aiTaskProgress|%/);
  assert.match(editorWxml, /取消本次翻译/);
});

test("小程序取消覆盖鉴权等待、页面离开和服务端保存边界", () => {
  assert.match(requestSource, /onRequestTask\?: \(task: WechatMiniprogram\.RequestTask\)/);
  assert.match(requestSource, /isCancelled\?: \(\) => boolean/);
  assert.match(requestSource, /throwIfCancelled\(options\)/);
  assert.match(requestSource, /options\.onRequestTask\?\.\(requestTask\)/);
  assert.match(indexTs, /onHide\(\) \{\s*this\.cancelImportTask\(false\)/);
  assert.match(indexTs, /else \{\s*task\.abort\(\)/);
  assert.match(editorTs, /onHide\(\) \{\s*this\.cancelAiTask\(false\)/);
  assert.match(editorTs, /else \{\s*task\.abort\(\)/);
  assert.match(importRoute, /request\.signal\.aborted/);
  assert.match(importRoute, /\.abortSignal\(request\.signal\)/);
  assert.match(translateRoute, /request\.signal\.aborted/);
  assert.equal((translateRoute.match(/\.abortSignal\(request\.signal\)/g) ?? []).length, 2);
});
