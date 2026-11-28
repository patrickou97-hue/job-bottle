import "server-only";
import { verifiedCompanyProfile, type CompanyProfile } from "@/lib/company-overview";

type Entity = { id?: string; label?: string; description?: string; match?: { text?: string } };

export async function readCompanyProfile(name: string, signal: AbortSignal): Promise<CompanyProfile | undefined> {
  const known = verifiedCompanyProfile(name);
  if (known) return known;
  const params = new URLSearchParams({
    action: "wbsearchentities", search: name, language: "zh", uselang: "zh-hans", type: "item", limit: "8", format: "json",
  });
  try {
    const response = await fetch("https://www.wikidata.org/w/api.php?" + params, {
      headers: { "User-Agent": "StarJob/1.0 (https://www.starjob.space/feedback)" },
      next: { revalidate: 86400 }, signal: AbortSignal.any([signal, AbortSignal.timeout(2500)]),
    });
    if (!response.ok) return;
    const { search } = await response.json() as { search?: Entity[] };
    const exact = (search ?? []).filter(entity => /^Q\d+$/.test(entity.id ?? "") &&
      (entity.label === name || entity.match?.text === name));
    if (exact.length !== 1) return;
    const [entity] = exact;
    if (!entity.description || !/(?:公司|集团|企業|企业|集團|银行|銀行|事务所|事務所|制造商|製造商)/u.test(entity.description)) return;
    return { catalogueName: name, displayName: entity.label || name, summary: entity.description,
      sourceLabel: "维基数据 · 公司资料", sourceUrl: "https://www.wikidata.org/wiki/" + entity.id };
  } catch {
    // Recruitment records remain available if the public directory has no usable response.
    return undefined;
  }
}
