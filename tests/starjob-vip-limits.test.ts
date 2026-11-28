import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
// Node runs these tests directly with TypeScript stripping.
const {
  resolveVipCard,
  BASIC_POLISH_HOURLY_LIMIT, BASIC_POLISH_WEEKLY_LIMIT, VIP_BASIC_POLISH_HOURLY_LIMIT,
  VIP_BASIC_POLISH_WEEKLY_LIMIT, VIP_ADVANCED_HOURLY_LIMIT, VIP_ADVANCED_WEEKLY_LIMIT,
  VIP_COMPOSE_DAILY_LIMIT, VIP_COMPOSE_WEEKLY_LIMIT,
} = await import(new URL("../src/lib/starjob-vip.ts", import.meta.url).href);

test("管理页与会员权益页展示的六组限额与数据库执行规则一致", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20261128032038_starjob_vip_free_launch.sql", import.meta.url), "utf8");
  const rules = [
    ["basicHourlyRemaining", VIP_BASIC_POLISH_HOURLY_LIMIT, BASIC_POLISH_HOURLY_LIMIT],
    ["basicWeeklyRemaining", VIP_BASIC_POLISH_WEEKLY_LIMIT, BASIC_POLISH_WEEKLY_LIMIT],
    ["advancedHourlyRemaining", VIP_ADVANCED_HOURLY_LIMIT, 0],
    ["advancedWeeklyRemaining", VIP_ADVANCED_WEEKLY_LIMIT, 0],
    ["composeRemaining", VIP_COMPOSE_DAILY_LIMIT, 0],
    ["composeWeeklyRemaining", VIP_COMPOSE_WEEKLY_LIMIT, 0],
  ] as const;
  for (const [field, member, ordinary] of rules) {
    const condition = field.startsWith("advanced") ? "e.plan = 'full'" : "e.vip";
    assert.ok(migration.includes(`'${field}', greatest(0, (case when ${condition} then ${member} else ${ordinary} end)`), field);
    assert.ok(migration.includes(`(quota ->> '${field}')::integer = 0`), `reservation checks ${field}`);
  }
});

test("VIP 划线价与新订单默认金额一致", async () => {
  const { VIP_PRICE, VIP_PRICE_FEN } = await import(new URL("../src/lib/starjob-vip.ts", import.meta.url).href);
  const migration = await readFile(new URL("../supabase/migrations/20261128075455_starjob_vip_price_8990.sql", import.meta.url), "utf8");
  assert.equal(VIP_PRICE, "89.9");
  assert.equal(VIP_PRICE_FEN, 8990);
  assert.match(migration, new RegExp(`alter column amount_fen set default ${VIP_PRICE_FEN}\\b`));
});

test("收藏卡默认跟随权益，指派卡面不产生会员或管理员权限", () => {
  assert.equal(resolveVipCard(false, false, null, "jade"), null);
  assert.equal(resolveVipCard(true, false, "free_launch", null), "vip");
  assert.equal(resolveVipCard(true, false, "full", null), "premium");
  assert.equal(resolveVipCard(true, false, "free_launch", "jade"), "jade");
  assert.equal(resolveVipCard(true, false, "full", "vip"), "vip");
  assert.equal(resolveVipCard(true, false, "free_launch", "legend"), "vip");
  assert.equal(resolveVipCard(true, true, "full", "jade"), "legend");
});
