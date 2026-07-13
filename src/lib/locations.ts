export type LocationFilterLevel = "all" | "nationwide" | "province" | "city";

export type LocationGroup = {
  province: string;
  cities: string[];
};

const NATIONWIDE_TOKENS = ["全国", "全球"];
const OVERSEAS_TOKENS = ["海外", "新加坡", "东京", "首尔", "西雅图", "泰国", "瑞士", "马来西亚", "德国"];

export const PROVINCE_CITIES: Record<string, string[]> = {
  北京: ["北京"],
  上海: ["上海"],
  天津: ["天津"],
  重庆: ["重庆"],
  河北: ["石家庄", "正定"],
  山西: ["太原"],
  内蒙古: ["呼和浩特"],
  辽宁: ["沈阳", "大连"],
  吉林: ["长春"],
  黑龙江: ["哈尔滨"],
  江苏: ["南京", "苏州", "常州", "无锡", "南通", "宿迁", "昆山"],
  浙江: ["杭州", "宁波", "温州", "嘉兴", "金华", "义乌"],
  安徽: ["合肥"],
  福建: ["福州", "厦门"],
  江西: ["南昌"],
  山东: ["济南", "青岛", "烟台", "潍坊", "日照", "菏泽"],
  河南: ["郑州"],
  湖北: ["武汉", "襄阳", "宜昌"],
  湖南: ["长沙", "衡阳", "株洲"],
  广东: ["广州", "深圳", "珠海", "佛山", "中山", "江门", "韶关"],
  广西: ["南宁"],
  海南: ["海口"],
  四川: ["成都"],
  贵州: ["贵阳"],
  云南: ["昆明"],
  西藏: ["拉萨"],
  陕西: ["西安"],
  甘肃: ["兰州"],
  青海: ["西宁"],
  宁夏: ["银川"],
  新疆: ["乌鲁木齐"],
  香港: ["香港"],
  澳门: ["澳门"],
  台湾: ["台北"],
  海外: OVERSEAS_TOKENS.filter((token) => token !== "海外"),
};

export const PROVINCE_ORDER = Object.keys(PROVINCE_CITIES);

export function normalizeProvinceName(value: string) {
  return value
    .trim()
    .replace(/(维吾尔自治区|壮族自治区|回族自治区|特别行政区|自治区|省|市)$/u, "");
}

export function getProvinceFromLocationFilter(filter: string) {
  if (filter.startsWith("province:")) return normalizeProvinceName(filter.slice("province:".length));
  if (!filter.startsWith("city:")) return null;
  const city = filter.slice("city:".length);
  return PROVINCE_ORDER.find((province) =>
    PROVINCE_CITIES[province].some((candidate) => city === candidate || city.startsWith(candidate)),
  ) ?? null;
}

export function buildLocationGroups(rawLocations: string[]): LocationGroup[] {
  const tokens = new Set(rawLocations.flatMap(splitLocationTokens).map(normalizeLocationToken));
  const recognized = new Set<string>();
  const groups = PROVINCE_ORDER.map((province) => {
    if (tokens.has(province)) recognized.add(province);
    const cities = PROVINCE_CITIES[province].filter((city) => {
      const matched = Array.from(tokens).some((token) => token === city || token.startsWith(city));
      if (matched) recognized.add(city);
      return matched;
    });
    return { province, cities };
  }).filter(({ province, cities }) => tokens.has(province) || cities.length > 0);

  const unclassified = Array.from(tokens)
    .filter((token) => token && !NATIONWIDE_TOKENS.includes(token) && !recognized.has(token))
    .filter((token) => !OVERSEAS_TOKENS.includes(token))
    .sort((a, b) => a.localeCompare(b, "zh-CN"));
  if (unclassified.length > 0) groups.push({ province: "其他", cities: unclassified });
  return groups;
}

export function matchesLocationFilter(jobLocations: string | null, filter: string) {
  if (!filter) return true;
  const tokens = splitLocationTokens(jobLocations ?? "").map(normalizeLocationToken);
  if (filter === "scope:nationwide") return tokens.some((token) => NATIONWIDE_TOKENS.includes(token));
  if (filter.startsWith("province:")) {
    const province = filter.slice("province:".length);
    const cities = PROVINCE_CITIES[province] ?? [];
    return tokens.some((token) => token === province || cities.some((city) => token === city || token.startsWith(city)));
  }
  if (filter.startsWith("city:")) {
    const city = filter.slice("city:".length);
    return tokens.some((token) => token === city || token.startsWith(city));
  }
  return (jobLocations ?? "").includes(filter);
}

export function getLocationFilterLevel(filter: string): LocationFilterLevel {
  if (filter === "scope:nationwide") return "nationwide";
  if (filter.startsWith("province:")) return "province";
  if (filter.startsWith("city:")) return "city";
  return filter ? "city" : "all";
}

export function getLocationFilterLabel(filter: string) {
  if (filter === "scope:nationwide") return "全国岗位";
  if (filter.startsWith("province:")) return `${filter.slice("province:".length)}省级`;
  if (filter.startsWith("city:")) return filter.slice("city:".length);
  return filter;
}

export function getProvinceForCity(city: string, groups: LocationGroup[]) {
  return groups.find((group) => group.cities.includes(city))?.province ?? groups[0]?.province ?? "";
}

function normalizeLocationToken(value: string) {
  return value.trim().replace(/等$/, "");
}

function splitLocationTokens(value: string) {
  return value.split(/[,，、/|｜\s]+/g).map((item) => item.trim()).filter(Boolean);
}
