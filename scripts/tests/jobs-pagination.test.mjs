import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const jobsSource = await readFile(resolve(import.meta.dirname, "../../src/lib/jobs.ts"), "utf8");

test("岗位列表使用 1000 条分页并持续读取后续页面", () => {
  assert.match(jobsSource, /const PUBLIC_JOB_PAGE_SIZE = 1000;/);
  assert.match(jobsSource, /for \(let from = 0; ; from \+= PUBLIC_JOB_PAGE_SIZE\)/);
  assert.match(jobsSource, /\.range\(from, from \+ PUBLIC_JOB_PAGE_SIZE - 1\)/);
  assert.match(jobsSource, /if \(\(data\?\.length \?\? 0\) < PUBLIC_JOB_PAGE_SIZE\) return rows;/);
});
