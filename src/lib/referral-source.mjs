const SOURCE_BATCH_PATTERN = /^27秋招(?:\s|$|提前批|正式批)/;
const SOURCE_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{1,62}={0,2}$/;
const ANT_HOSTNAME = "hrrecommend.antgroup.com";

/**
 * Only parameters whose names are used by the employer's referral flow are
 * eligible. Generic campaign, routing and analytics parameters are excluded.
 */
export function extractReferralCodeFromUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return null;

  let url;
  try {
    url = new URL(rawUrl.replaceAll("&amp;", "&").replaceAll("&#38;", "&"));
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  const recommendationCode = url.searchParams.get("recommendationCode");
  if (url.searchParams.get("isRecommendation")?.toLowerCase() === "true" && isSourceCode(recommendationCode)) {
    return {
      code: recommendationCode,
      parameter: "recommendationCode",
      sourceUrl: url.toString(),
    };
  }

  const referralCode = url.searchParams.get("referralCode");
  if (isSourceCode(referralCode)) {
    return {
      code: referralCode,
      parameter: "referralCode",
      sourceUrl: url.toString(),
    };
  }

  const antCode = url.searchParams.get("code");
  if (url.hostname.toLowerCase() === ANT_HOSTNAME && isSourceCode(antCode)) {
    return {
      code: antCode,
      parameter: "code",
      sourceUrl: url.toString(),
    };
  }

  return null;
}

export function deriveTencentReferralCodes(jobs) {
  const grouped = new Map();
  for (const job of jobs ?? []) {
    if (!job || job.is_active === false || !SOURCE_BATCH_PATTERN.test(String(job.batch_type ?? "").trim())) continue;
    const extracted = extractReferralCodeFromUrl(job.apply_url);
    if (!extracted || !job.company_name) continue;

    const companyName = String(job.company_name).trim();
    const key = `${companyName.toLocaleLowerCase("zh-CN")}\u0000${extracted.code.toLocaleLowerCase("en-US")}`;
    const current = grouped.get(key) ?? {
      company_name: companyName,
      code: extracted.code,
      parameters: new Set(),
      job_ids: new Set(),
      roles: new Set(),
      batches: new Set(),
      source_urls: new Set(),
      created_at: null,
      updated_at: null,
    };
    current.parameters.add(extracted.parameter);
    current.job_ids.add(job.id);
    for (const title of splitRoles(job.job_titles)) current.roles.add(title);
    if (job.batch_type) current.batches.add(String(job.batch_type).trim());
    current.source_urls.add(extracted.sourceUrl);
    current.created_at = pickLatest(current.created_at, job.created_at);
    current.updated_at = pickLatest(current.updated_at, job.updated_at ?? job.created_at);
    grouped.set(key, current);
  }

  return [...grouped.values()]
    .sort((left, right) => String(right.updated_at ?? "").localeCompare(String(left.updated_at ?? "")))
    .map((entry) => {
      const jobIds = [...entry.job_ids];
      const batches = [...entry.batches];
      const roles = [...entry.roles];
      const parameterText = [...entry.parameters].join("、");
      const coverage = jobIds.length > 1 ? `，覆盖 ${jobIds.length} 个岗位` : "";
      return {
        id: `tencent-referral-${stableKey(entry.company_name, entry.code)}`,
        company_name: entry.company_name,
        job_id: jobIds.length === 1 ? jobIds[0] : null,
        applicable_roles: truncate([batches.join("、"), roles.join("、")].filter(Boolean).join("；"), 160),
        code: entry.code,
        usage_note: `来源同步：腾讯文档岗位链接中的 ${parameterText} 参数${coverage}。使用前请在公司官方投递页核对。`,
        expires_at: null,
        created_at: entry.created_at ?? entry.updated_at ?? new Date(0).toISOString(),
        updated_at: entry.updated_at ?? entry.created_at ?? new Date(0).toISOString(),
        source_type: "tencent_job_link",
        source_job_ids: jobIds,
        source_urls: [...entry.source_urls],
      };
    });
}

export function isSourceReferralCode(value) {
  return isSourceCode(value);
}

function isSourceCode(value) {
  return typeof value === "string" && SOURCE_CODE_PATTERN.test(value);
}

function splitRoles(value) {
  return String(value ?? "")
    .split(/[，,、；;|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function pickLatest(current, next) {
  if (!next) return current;
  if (!current || String(next) > String(current)) return next;
  return current;
}

function truncate(value, maxLength) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;
}

function stableKey(companyName, code) {
  return `${encodeURIComponent(companyName)}-${encodeURIComponent(code)}`.replace(/%/g, "_");
}
