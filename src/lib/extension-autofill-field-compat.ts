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

export function isAutofillFieldValueSemanticallyCompatible(input: {
  value: string;
  deterministicKey: string;
  descriptor: string;
  hasDatePart: boolean;
}) {
  const { value, deterministicKey: key, descriptor, hasDatePart } = input;
  const dateField = hasDatePart
    || /\.(?:startDate|endDate|date)$/.test(key)
    || /开始时间|结束时间|入学时间|毕业时间|日期|年月|date|year|month/.test(descriptor);
  if (dateField && !isAutofillDateLike(value)) return false;
  if (!dateField && ["education.school", "education.major", "education.degree", "work.company", "work.title", "project.name", "project.role"].includes(key) && isAutofillDateLike(value)) return false;
  if (key === "basics.phone" || /手机号|联系电话|mobile|phone|telephone/.test(descriptor)) return isAutofillPhoneLike(value);
  if (key === "basics.email" || /邮箱|email/.test(descriptor)) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  if (["basics.linkedin", "basics.github", "basics.website", "project.url"].includes(key)
    || /作品链接|作品网址|项目链接|个人网站|portfolio|website|url|github|linkedin/.test(descriptor)) return isAutofillUrlLike(value);
  return true;
}
