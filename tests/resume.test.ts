import assert from "node:assert/strict";
import test from "node:test";

const resumeModulePath = "../src/lib/resume." + "ts";
const {
  adoptLocalResumesForUser,
  createSampleResume,
  isSampleResume,
  saveLocalResumes,
  touchResume,
} = await import(resumeModulePath);

test("示例简历仅作为预览，用户编辑后才成为可同步简历", () => {
  const sample = createSampleResume();
  assert.equal(sample.isSample, true);
  assert.equal(isSampleResume(sample), true);

  const edited = touchResume({ ...sample, title: "我的简历" });
  assert.equal(edited.isSample, false);
  assert.equal(isSampleResume(edited), false);
});

test("登录时不会把访客示例简历重新认领为云端简历", () => {
  const originalWindow = globalThis.window;
  const values = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage },
  });

  try {
    saveLocalResumes([createSampleResume()]);
    assert.deepEqual(adoptLocalResumesForUser("00000000-0000-4000-8000-000000000001", []), []);
  } finally {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
  }
});
