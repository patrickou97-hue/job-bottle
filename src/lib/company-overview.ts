export type CompanyProfile = {
  catalogueName: string;
  displayName: string;
  summary: string;
  sourceLabel: string;
  sourceUrl: string;
};

const junlebao: CompanyProfile = {
  catalogueName: "君乐宝",
  displayName: "君乐宝乳业集团",
  summary: "君乐宝总部位于河北石家庄，业务从牧草种植、奶牛养殖延伸到乳制品加工。面向消费者的产品包括奶粉、酸奶、鲜奶和常温奶。",
  sourceLabel: "农业农村部 · 君乐宝企业资料",
  sourceUrl: "https://jhs.moa.gov.cn/lsfz/202512/t20251215_6479718.htm",
};

const verifiedProfiles = new Map(["君乐宝", "君乐宝乳业", "君乐宝乳业集团", "君乐宝乳业集团股份有限公司"].map(name => [name, junlebao]));

export function verifiedCompanyProfile(name: string) {
  return verifiedProfiles.get(name.trim());
}

// Explicit questions about a named company can go straight to its public records.
// Leave pronouns, comparisons and follow-ups to the conversation model.
export function namedCompanyOverview(question: string) {
  const match = /^(?:请问\s*)?([\p{L}\d·&（）() -]{1,64}?)\s*这家(?:公司|企业)\s*(?:怎么样|如何|是做什么的)[啊呢吗嘛]?[？?。！!]*$/u.exec(question.trim());
  const name = match?.[1].trim();
  return name && !/^(?:刚才|上面|前面|第.+|你推荐的|我选的)$|[和与跟]|相比/u.test(name) ? name : undefined;
}

type Posting = { industry: string | null; batch_type: string | null; locations: string | null; job_titles: string | null };

export function companyRecruitmentFacts(rows: Posting[]) {
  function collect(field: keyof Posting) {
    return [...new Set(rows.map(row => row[field]?.trim()).filter((value): value is string => Boolean(value)))].join(" / ");
  }
  return [
    { label: "所属行业", value: collect("industry") },
    { label: "招聘批次", value: collect("batch_type") },
    { label: "招聘地点", value: collect("locations") },
    { label: "岗位方向", value: collect("job_titles") },
  ].filter(fact => fact.value);
}
