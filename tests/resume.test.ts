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

test("最后一份简历删除后，旧访客缓存、另一页的旧副本和重新登录都不能恢复它", async () => {
  const { loadLocalResumes, forgetLocalResume, initialResumeList, markResumeSynced, resumeRecordState } = await import(resumeModulePath);
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k,v),
    removeItem: (k: string) => store.delete(k),
  } } });
  try {
    const doc = touchResume({ ...createSampleResume(), title: "测试版本" });
    store.set("job_bottle_resumes_v1", JSON.stringify([doc]));
    assert.equal(loadLocalResumes()[0]?.id, doc.id);
    saveLocalResumes([]);
    assert.deepEqual(loadLocalResumes(), []);
    assert.ok(forgetLocalResume(null, doc.id));
    assert.deepEqual(initialResumeList(loadLocalResumes()), []);
    saveLocalResumes([doc], "owner");
    markResumeSynced("owner", doc.id);
    assert.equal(resumeRecordState("owner", doc.id), "synced");
    assert.ok(forgetLocalResume("owner", doc.id));
    saveLocalResumes([doc], "owner");
    assert.deepEqual(adoptLocalResumesForUser("owner", []), []);
    assert.deepEqual(loadLocalResumes("owner"), []);
    assert.equal(resumeRecordState("owner", doc.id), "deleted");
    saveLocalResumes([doc], "another-user");
    assert.equal(loadLocalResumes("another-user")[0]?.id, doc.id);
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
