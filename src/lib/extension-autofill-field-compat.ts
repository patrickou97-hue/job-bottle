export function isAutofillUrlLike(value: string) {
  const candidate = value.trim();
  if (!candidate || /[\s；，。]/.test(candidate)) return false;
  try {
    const parsed = new URL(/^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`);
    return Boolean(parsed.hostname && parsed.hostname.includes("."));
  } catch {
    return false;
  }
}

export function isAutofillDateLike(value: string) {
  return /(?:19|20)\d{2}(?:\D+(?:0?[1-9]|1[0-2]))?(?:\D+(?:0?[1-9]|[12]\d|3[01]))?/.test(value.trim());
}

export function isAutofillPhoneLike(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

const RECORD_PATH_PATTERN = /^(education|work|projects|campus|awards|certifications|languages)\[(\d+)\](?:\.|$)/;
const GENERIC_NARRATIVE_BIGRAMS = new Set([
  "参与", "负责", "协助", "完成", "通过", "基于", "进行", "相关", "工作", "项目", "支持", "提供", "分析", "数据", "能力", "以及",
]);

export function getAutofillRecordRoot(path: string | null | undefined) {
  const match = String(path || "").match(RECORD_PATH_PATTERN);
  return match ? `${match[1]}[${match[2]}]` : null;
}

function narrativeBigrams(value: string) {
  const compact = value.normalize("NFKC").toLocaleLowerCase("zh-CN").replace(/[^\p{L}\p{N}]+/gu, "");
  const result = new Set<string>();
  for (let index = 0; index + 1 < compact.length; index += 1) {
    const token = compact.slice(index, index + 2);
    if (!GENERIC_NARRATIVE_BIGRAMS.has(token)) result.add(token);
  }
  return result;
}

export function hasAutofillRecordNarrativeAnchor(value: string, scopedFacts: string[]) {
  const valueTokens = narrativeBigrams(value);
  if (!valueTokens.size) return false;
  const factTokens = new Set(scopedFacts.flatMap((fact) => [...narrativeBigrams(fact)]));
  let shared = 0;
  for (const token of valueTokens) {
    if (factTokens.has(token)) shared += 1;
    if (shared >= 3) return true;
  }
  return false;
}

export function isAutofillRecordNarrativeMappingCompatible(input: {
  deterministicKey: string | null | undefined;
  resumePath: string | null | undefined;
  evidence: string[];
  value: string;
  scopedFacts: string[];
}) {
  if (!/^(?:work|project|campus|awards)\.description$/.test(input.deterministicKey || "")) return true;
  const expectedRoot = getAutofillRecordRoot(input.resumePath);
  if (!expectedRoot || input.evidence.length === 0) return false;
  const evidenceRoots = input.evidence.map(getAutofillRecordRoot);
  if (evidenceRoots.some((root) => root !== expectedRoot)) return false;
  return hasAutofillRecordNarrativeAnchor(input.value, input.scopedFacts);
}

export function isAutofillFieldValueSemanticallyCompatible(input: {
  value: string;
  deterministicKey: string;
  descriptor: string;
  hasDatePart: boolean;
}) {
  const { value, deterministicKey: key, descriptor, hasDatePart } = input;
  const normalizedDescriptor = descriptor.toLowerCase();
  const compactDescriptor = normalizedDescriptor.replace(/[\s\-_./\\:：,，()（）\[\]【】{}<>《》?？*]+/g, "");
  const structuralField = ["education.school", "education.major", "education.degree", "work.company", "work.title", "project.name", "project.role"].includes(key)
    || /学校名称|毕业院校|院校名称|专业名称|学历|公司名称|职位名称|项目名称|项目角色|school\s*name|company\s*name|job\s*title|project\s*name/.test(normalizedDescriptor);
  const ownDateLabel = /开始时间|结束时间|起止时间|就读时间|入学时间|毕业时间|日期|年月|date|year|month/.test(normalizedDescriptor);
  const dateField = hasDatePart
    || /\.(?:startDate|endDate|date)$/.test(key)
    || (!key && ownDateLabel);
  if (structuralField && isAutofillDateLike(value)) return false;
  if (dateField && !isAutofillDateLike(value)) return false;
  if (key === "work.company" && /公司类型|公司性质|所在行业|行业类型|company\s*type|industry/.test(normalizedDescriptor)) return false;
  if (key === "basics.phone" && /国家地区|国家代码|区号|country|callingcode/.test(compactDescriptor)) return false;
  if (key === "basics.phone" || /手机号|联系电话|mobile|phone|telephone/.test(descriptor)) return isAutofillPhoneLike(value);
  if (key === "basics.email" || /邮箱|email/.test(descriptor)) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  if (["basics.linkedin", "basics.github", "basics.website", "project.url"].includes(key)
    || /作品链接|作品网址|项目链接|个人网站|portfolio|website|url|github|linkedin/.test(descriptor)) return isAutofillUrlLike(value);
  return true;
}
