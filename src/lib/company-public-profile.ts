import "server-only";
import { verifiedCompanyProfile, type CompanyProfile } from "@/lib/company-overview";

type Entity = { id?: string; label?: string; description?: string; match?: { text?: string } };

export async function readCompanyProfile(name: string, signal: AbortSignal): Promise<CompanyProfile | undefined> {
  const known = verifiedCompanyProfile(name);
  if (known) return known;
  const options = {
    headers: { "User-Agent": "StarJob/1.0 (https://www.starjob.space/feedback)" },
    next: { revalidate: 86400 }, signal: AbortSignal.any([signal, AbortSignal.timeout(4500)]),
  };
  async function query(host: string, params: Record<string, string>) {
    const response = await fetch("https://" + host + "/w/api.php?" + new URLSearchParams({ ...params, format: "json" }), options);
    if (!response.ok) throw Error("Company directory unavailable");
    return response.json();
  }
  try {
    const wiki = "www.wikidata.org";
    const { search } = await query(wiki, { action: "wbsearchentities", search: name, language: "zh", uselang: "zh-hans", type: "item", limit: "8" }) as { search?: Entity[] };
    const exact = (search ?? []).filter(entity => /^Q\d+$/.test(entity.id ?? "") && (entity.label === name || entity.match?.text === name));
    if (exact.length !== 1) return;
    const [entity] = exact;
    if (!entity.id || !/(?:公司|集团|企業|企业|集團|银行|銀行|证券|證券|事务所|事務所|制造商|製造商|投资银行)/u.test(entity.description ?? "")) return;
    const { entities } = await query(wiki, { action: "wbgetentities", ids: entity.id, props: "sitelinks", sitefilter: "zhwiki" });
    const title = entities?.[entity.id]?.sitelinks?.zhwiki?.title;
    if (!title) return;
    const { query: articles } = await query("zh.wikipedia.org", {
      action: "query", prop: "extracts|pageprops", titles: title, exintro: "1", explaintext: "1", exsentences: "3", variant: "zh-cn", formatversion: "2",
    });
    const page = articles?.pages?.[0];
    if (!page || page.pageprops?.wikibase_item !== entity.id || page.pageprops?.disambiguation !== undefined) return;
    const sentences = String(page.extract ?? "").trim().split(/(?<=[。！？])\s*/u);
    const summary = sentences.filter(Boolean).slice(0, 2).join("");
    if (summary.length < 30 || summary.length > 500) return;
    return { catalogueName: name, displayName: entity.label || name, summary, sourceLabel: "维基百科 · 公司简介",
      sourceUrl: "https://zh.wikipedia.org/wiki/" + encodeURIComponent(title) };
  } catch {
    return undefined;
  }
}
