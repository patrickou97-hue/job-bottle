import assert from "node:assert/strict";
import test from "node:test";
const { resolveSearch, searchIntent } = await import(new URL("../src/lib/job-search-assistant.ts", import.meta.url).href);
const input = {
  message: "只看我还没投的", current: { keyword: "", location: "city:上海", industry: "", batchType: "", categories: ["产品类"], tags: [], sortBy: "start_date_desc", scope: "all", view: "all" },
  options: { locations: ["city:上海"], industries: [], batchTypes: [], categories: ["产品类"], hasPreferences: false },
};
test("找岗位追问继承地点与类别，重开搜索会清除旧条件", () => {
  const before = structuredClone(input.current);
  assert.deepEqual(resolveSearch(input, { action: "filter", changes: { view: "unapplied" } }).state, { ...before, view: "unapplied" });
  assert.equal(resolveSearch(input, { action: "filter", reset: true, changes: {} }).state.location, "");
  assert.deepEqual(before, input.current);
});
test("不存在的条件、尚未填写的求职偏好需要澄清，模型不能提供虚构岗位链接", () => {
  for (const changes of [{ location: "city:虚构" }, { categories: ["不存在"] }, { industry: "不存在" }, { scope: "recent_preference" }]) {
    assert.equal(resolveSearch(input, { action: "filter", changes }).action, "clarify");
  }
  assert.equal(searchIntent.safeParse({ action: "filter", changes: {}, jobs: [{ url: "fictional" }] }).success, false);
  assert.equal(searchIntent.safeParse({ action: "filter", changes: { salary: 20000 } }).success, false);
});

test("个性化推荐保留条件，公司追问不改变筛选", () => {
  const ranked = searchIntent.parse({ action: "recommend", changes: {} });
  assert.deepEqual(resolveSearch(input, ranked), { action: "recommend", state: input.current });
  const company = { action: "company", name: "东吴证券", topic: "overview" };
  assert.deepEqual(resolveSearch(input, searchIntent.parse(company)), company);
});

test("岗位库地区选项超过 200 项时仍能提问", async () => {
  const { searchQuestion } = await import(new URL("../src/lib/job-search-assistant.ts", import.meta.url).href);
  const locations = Array.from({ length: 278 }, (_, index) => "city:地区" + index);
  assert.ok(searchQuestion.safeParse({ ...input, options: { ...input.options, locations } }).success);
});

test("直接询问公司概况时按名称识别，指代与薪资追问交给对话模型", async () => {
  const { namedCompanyOverview, verifiedCompanyProfile, companyRecruitmentFacts } = await import(new URL("../src/lib/company-overview.ts", import.meta.url).href);
  assert.equal(namedCompanyOverview("请问君乐宝这家公司怎么样？"), "君乐宝");
  assert.equal(namedCompanyOverview("东吴证券这家企业如何"), "东吴证券");
  assert.equal(namedCompanyOverview("这家公司怎么样"), undefined);
  assert.equal(namedCompanyOverview("君乐宝这家公司的待遇怎么样？"), undefined);
  assert.equal(verifiedCompanyProfile("君乐宝乳业集团股份有限公司")?.catalogueName, "君乐宝");
  assert.equal(verifiedCompanyProfile("君乐宝供应商"), undefined);
  assert.deepEqual(companyRecruitmentFacts([{ industry: null, batch_type: null, locations: "上海", job_titles: null }]), [{ label: "招聘地点", value: "上海" }]);
});

test("公司概况使用正式名称，世界500强推荐按上榜企业匹配并保留追问地点", async () => {
  const { directRankedProductIntent } = await import(new URL("../src/lib/job-search-assistant.ts", import.meta.url).href);
  const { namedCompanyOverview, verifiedCompanyProfile } = await import(new URL("../src/lib/company-overview.ts", import.meta.url).href);
  assert.equal(namedCompanyOverview("中金公司怎么样？"), "中金公司");
  assert.match(verifiedCompanyProfile("CICC").displayName, /股份/);
  assert.equal(verifiedCompanyProfile("京东方"), undefined);
  assert.equal(verifiedCompanyProfile("小米生态链供应商"), undefined);
  assert.equal(verifiedCompanyProfile("腾讯").globalTechRank, 97);
  const query = { ...input, message: "给我找一些世界五百强科技公司产品岗" };
  const result = resolveSearch(query, directRankedProductIntent(query.message));
  assert.equal(result.state.employerGroup, "global500_tech");
  assert.deepEqual(result.state.categories, ["产品类"]);
  assert.equal(result.state.location, "city:上海");
  assert.equal(resolveSearch({ ...input, current: result.state }, { action: "filter", changes: { view: "unapplied" } }).state.employerGroup, "global500_tech");
  assert.equal(resolveSearch(query, { action: "recommend", changes: {} }).action, "clarify");
  assert.equal(directRankedProductIntent("找一些上海的世界五百强科技公司产品岗"), undefined);
  assert.equal(directRankedProductIntent("2025年世界五百强科技公司产品岗"), undefined);
});

test("语义找岗位只接受当前资料里出现的字段，追问城市沿用同一个方向", () => {
  const role = { name: "看数据做业务判断", exact: ["数据分析师", "虚构头衔"], related: ["商分", "经营分析", "数据分析师"] };
  const question = { ...input, options: { ...input.options, roleTerms: ["数据分析师", "经营分析", "商分"] } };
  const first = resolveSearch(question, searchIntent.parse({ action: "recommend", changes: { role, categories: [] } }));
  assert.deepEqual(first.state.role, { name: role.name, exact: ["数据分析师"], related: ["商分", "经营分析"] });
  const next = resolveSearch({ ...question, current: first.state }, { action: "filter", changes: { location: "city:上海" } });
  assert.deepEqual(next.state.role, first.state.role);
  assert.equal(resolveSearch({ ...question, current: next.state }, { action: "filter", reset: true, changes: {} }).state.role, undefined);
});

test("公司词干及模型给出的别名仅用作候选检索，已知全称对应实际库名", async () => {
  const { companyLookupTerms, verifiedCompanyProfile } = await import(new URL("../src/lib/company-overview.ts", import.meta.url).href);
  assert.deepEqual(companyLookupTerms("星盛集团"), ["星盛集团", "星盛"]);
  assert.equal(verifiedCompanyProfile("星盛集团"), undefined);
  assert.equal(verifiedCompanyProfile("中国国际金融有限公司").catalogueName, "中金公司");
  assert.ok(companyLookupTerms("示例企业", ["某品牌"]).includes("某品牌"));
});

test("模型可直接选择招聘大类和职责原文，外企条件与岗位判断分别生效", () => {
  const options = { ...input.options, industries: ["外企"], roleEvidence: [
    { source: "岗位大类", term: "产品类" },
    { source: "岗位职责", term: "整理访谈结果，梳理用户需求并参与产品迭代" },
  ] };
  const result = resolveSearch({ ...input, options }, searchIntent.parse({ action: "recommend", changes: {
    industry: "外企", categories: [], role: { name: "产品经理", decisions: [1, 0, 99, 1], direct: [1, 0, 99] },
  } }));
  assert.equal(result.state.industry, "外企");
  assert.deepEqual(result.state.role.judgments.map(({ term, level }: { term: string; level: string }) => [term, level]),
    [[options.roleEvidence[1].term, "related"], ["产品类", "category"]]);
  assert.deepEqual(resolveSearch({ ...input, options, current: result.state }, { action: "filter", changes: { location: "" } }).state.role, result.state.role);
});

test("咨询可按要求推荐十家企业，也可只作答，两种情况都保留当前岗位筛选", () => {
  for (const count of [0, 10]) {
    const advice = { action: "advice", count, query: count ? "外企 校招 雇主评价" : "" };
    assert.deepEqual(resolveSearch(input, searchIntent.parse(advice)), advice);
  }
});
