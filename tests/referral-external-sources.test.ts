import assert from "node:assert/strict";
import test from "node:test";

const modulePath = "../src/lib/referral-external-sources." + "ts";
const { EXTERNAL_REFERRAL_SOURCES, buildExternalReferralRows } = await import(modulePath);

type ExternalRow = {
  company_name: string;
  code: string;
  job_id: string | null;
  source_type: string;
  source_url: string;
};

test("外部来源记录均有可追溯链接并明确标注 27/2027 批次", () => {
  assert.ok(EXTERNAL_REFERRAL_SOURCES.length >= 30);
  for (const record of EXTERNAL_REFERRAL_SOURCES) {
    assert.match(record.source_url, /^https:\/\//);
    assert.match(`${record.applicable_roles} ${record.usage_note}`, /(27|2027)/);
    assert.match(record.code, /^[A-Za-z0-9][A-Za-z0-9_-]{1,62}$/);
    assert.ok(record.source_verified_at);
  }
});

test("只为当前 27 秋招岗位库中的公司生成虚拟来源行", () => {
  const rows = buildExternalReferralRows(["腾讯", "拼多多", "不存在的公司"], "2026-09-01T00:00:00.000Z") as ExternalRow[];
  assert.ok(rows.length > 1);
  assert.ok(rows.every((row) => row.job_id === null));
  assert.ok(rows.every((row) => row.source_type === "public_post"));
  assert.ok(rows.every((row) => row.company_name === "腾讯" || row.company_name === "拼多多"));
  assert.ok(rows.every((row) => row.source_url.startsWith("https://")));
});

test("同一公司不同来源码可并列，代码自身不因大小写而被改写", () => {
  const rows = buildExternalReferralRows(["网易互娱"]) as ExternalRow[];
  const codes = rows.map((row) => row.code);
  assert.ok(codes.includes("HPyu1u"));
  assert.ok(codes.includes("XVZ8LnR"));
  assert.equal(codes.find((code) => code === "HPyu1u"), "HPyu1u");
  assert.ok(!codes.includes("HPYU1U"));
});
