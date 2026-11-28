export type CompanyProfile = {
  catalogueName: string;
  displayName: string;
  summary: string;
  sourceLabel: string;
  sourceUrl: string;
  globalTechRank?: number;
};

const junlebao: CompanyProfile = {
  catalogueName: "君乐宝",
  displayName: "君乐宝乳业集团",
  summary: "君乐宝总部位于河北石家庄，业务从牧草种植、奶牛养殖延伸到乳制品加工。面向消费者的产品包括奶粉、酸奶、鲜奶和常温奶。",
  sourceLabel: "农业农村部 · 君乐宝企业资料",
  sourceUrl: "https://jhs.moa.gov.cn/lsfz/202512/t20251215_6479718.htm",
};

export const globalRanking = {
  year: 2026,
  url: "https://www.fortunechina.com/fortune500/c/2026-07/28/content_475298.htm",
};

// Only explicitly identified employers can inherit a ranking; partners and similar names cannot.
const profiles = new Map<string, CompanyProfile>();
function register(profile: CompanyProfile, aliases: string[] = []) {
  for (const name of [profile.catalogueName, profile.displayName, ...aliases]) profiles.set(name.toLowerCase(), profile);
}
register(junlebao, ["君乐宝乳业", "君乐宝乳业集团股份有限公司"]);
register({
  catalogueName: "中金公司", displayName: "中国国际金融股份有限公司",
  summary: "中金公司成立于 1995 年，总部在北京。它为企业提供上市融资和并购顾问服务，也为机构和个人投资者提供证券研究、资产管理和财富管理服务。",
  sourceLabel: "中金公司 · 公司介绍", sourceUrl: "https://www.cicc.com/about",
}, ["中金", "CICC", "中国国际金融有限公司"]);
register({
  catalogueName: "腾讯", displayName: "腾讯控股有限公司", globalTechRank: 97,
  summary: "腾讯通过微信和 WeChat 提供通讯与社交服务。用户可以在同一个应用里聊天、使用小程序、支付和观看视频号。",
  sourceLabel: "腾讯 · 微信与 WeChat", sourceUrl: "https://www.tencent.com/zh-cn/products/weixin-wechat/",
}, ["腾讯公司", "腾讯控股", "Tencent"]);
register({
  catalogueName: "阿里巴巴集团", displayName: "阿里巴巴集团控股有限公司", globalTechRank: 56,
  summary: "阿里巴巴的业务涵盖电商、云计算和人工智能。电商平台连接消费者和商家，阿里云则为企业和开发者提供算力与模型服务。",
  sourceLabel: "阿里巴巴 · 集团介绍", sourceUrl: "https://www.alibabagroup.com/zh-HK/about-alibaba",
}, ["阿里巴巴", "阿里", "Alibaba"]);
register({
  catalogueName: "小米", displayName: "小米集团", globalTechRank: 232,
  summary: "小米从智能手机起步，如今也开发智能家居设备和电动汽车。它通过物联网平台连接这些设备，让用户在手机、车和家之间使用同一套服务。",
  sourceLabel: "小米 · 公司介绍", sourceUrl: "https://www.mi.com/global/about/",
}, ["Xiaomi"]);
register({
  catalogueName: "京东", displayName: "京东集团股份有限公司", globalTechRank: 41,
  summary: "京东经营电商零售，也向品牌和商家提供供应链服务。除了消费者看到的购物平台，仓储、配送和商家经营工具也是其业务的一部分。",
  sourceLabel: "京东 · 公司介绍", sourceUrl: "https://ir.jd.com/about-JD",
}, ["京东集团", "JD.com"]);
register({
  catalogueName: "联想", displayName: "联想集团有限公司", globalTechRank: 153,
  summary: "联想为个人与企业开发电脑和平板等设备，也向企业提供服务器、存储设备以及配套的技术服务。",
  sourceLabel: "联想 · 公司介绍", sourceUrl: "https://www.lenovo.com/us/en/about/",
}, ["联想集团", "Lenovo"]);
register({
  catalogueName: "华为", displayName: "华为投资控股有限公司", globalTechRank: 81,
  summary: "华为面向运营商和企业提供通信网络、计算与云服务，也为消费者开发手机、穿戴设备等智能终端。",
  sourceLabel: "华为 · 公司介绍", sourceUrl: "https://www.huawei.com/cn/corporate-information",
}, ["Huawei"]);
register({
  catalogueName: "亚马逊", displayName: "亚马逊", globalTechRank: 1,
  summary: "亚马逊经营在线零售平台，为商家提供销售与配送服务。旗下 AWS 面向企业和开发者提供云计算，此外还有智能设备和数字内容业务。",
  sourceLabel: "亚马逊 · 主要业务", sourceUrl: "https://www.aboutamazon.com/what-we-do",
}, ["Amazon", "Amazon.com"]);

export function verifiedCompanyProfile(name: string) {
  return profiles.get(name.trim().toLowerCase());
}

export function namedCompanyOverview(question: string) {
  const text = question.trim().replace(/^(?:请问|请帮我)\s*/u, "").replace(/[啊呢吗嘛？?。！!]+$/u, "");
  const name = (/^(.{1,64}?)这家(?:公司|企业)(?:怎么样|如何|是做什么的)$/u.exec(text)?.[1]
    ?? /^(?:介绍一下|介绍下)(.{1,64})$/u.exec(text)?.[1])?.trim();
  if (name && !/(?:这家|那家|第.+家|刚才|上面|前面|推荐的|岗位|待遇|薪资|截止|招聘|[和与跟]|相比)/u.test(name)) return name;
  const plain = /^(.+?)(?:怎么样|如何|是做什么的)$/u.exec(text)?.[1]?.trim();
  return plain && verifiedCompanyProfile(plain) ? plain : undefined;
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
