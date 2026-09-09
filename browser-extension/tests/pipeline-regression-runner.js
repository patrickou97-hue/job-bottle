(async () => {
  const scenario = document.body.dataset.scenario;
  const marker = document.body.dataset.marker;
  const resultNode = document.querySelector("#result");
  const work = [
    ["甲方科技", "产品实习生", "2026-01", "2026-02", "甲方经历"],
    ["乙方咨询", "商业分析实习生", "2025-09", "2025-12", "乙方经历"],
    ["丙方银行", "投行实习生", "2025-05", "2025-08", "丙方经历"],
    ["丁方消费", "运营实习生", "2025-01", "2025-04", "丁方经历"],
  ].map(([company, title, startDate, endDate, bullet], index) => ({
    id: `work-${index}`,
    experienceType: "internship",
    company,
    title,
    location: "上海",
    startDate,
    endDate,
    current: false,
    bullets: [bullet],
  }));
  const projects = [
    { id: "project-0", name: "星图项目", role: "项目经理", startDate: "2024-01", endDate: "2024-04", bullets: ["星图项目经历"], keywords: "React" },
    { id: "project-1", name: "星瓶项目", role: "项目负责人", startDate: "2024-06", endDate: "2024-10", bullets: ["星瓶项目经历"], keywords: "TypeScript" },
  ];
  const resume = {
    id: "resume-regression",
    title: "P0 回归简历",
    content: {
      basics: { name: "王小星", email: "star@example.com", phone: "13800000000" },
      education: [], work, projects, skills: [], campus: [], awards: [], certifications: [], languages: [],
    },
  };
  const storage = {
    starjobResumes: [resume], activeResumeId: resume.id, fillMode: "merge", analysisOnly: true,
    aiOnly: false, aiFieldMappings: {}, aiAutofillOnly: false, aiValueMappings: {},
  };
  window.chrome = { storage: { local: { get: async () => ({ ...storage }) } } };
  const fillSource = await fetch("../starjob-resume-assistant/fill.js").then((response) => response.text());

  const field = (label, kind = "input", attrs = "") => `<label>${label}<${kind} ${attrs}></${kind}></label>`;
  const workRecord = (split = false) => `<article class="record" data-section="work">
    ${field("公司")}${field("职位")}
    ${split
      ? `${field("开始年份", "select", "data-part='start-year'")} ${field("开始月份", "select", "data-part='start-month'")} ${field("结束年份", "select", "data-part='end-year'")} ${field("结束月份", "select", "data-part='end-month'")}`
      : `${field("开始时间", "input", "type='month'")} ${field("结束时间", "input", "type='month'")}`}
    ${field("经历描述", "textarea")}
  </article>`;
  const projectRecord = () => `<article class="record" data-section="project">
    ${field("项目名称")}${field("项目角色")}${field("项目开始时间", "input", "type='month'")}${field("项目结束时间", "input", "type='month'")}${field("项目描述", "textarea")}
  </article>`;
  const options = (select, from, to) => {
    select.add(new Option("请选择", ""));
    for (let value = from; value <= to; value += 1) select.add(new Option(String(value).padStart(2, "0"), String(value).padStart(2, "0")));
  };
  const setupSplitOptions = () => {
    document.querySelectorAll("select[data-part$='year']").forEach((select) => options(select, 2024, 2026));
    document.querySelectorAll("select[data-part$='month']").forEach((select) => options(select, 1, 12));
  };
  const mokaDateControl = (part) => `<div class="picker-a"><div class="picker-b"><div class="picker-c"><div role="combobox">${field(part.endsWith("year") ? "年" : "月", "select", `data-part='${part}'`)}</div></div></div></div>`;
  const mokaDateRange = () => `<div class="apply-field"><span>起止时间</span><div class="ctrl"><div class="date-range">
    ${mokaDateControl("start-year")}
    ${mokaDateControl("start-month")}
    <span>-</span>
    ${mokaDateControl("end-year")}
    ${mokaDateControl("end-month")}
  </div></div></div>`;
  const unique = (values) => new Set(values).size === values.length;
  const evaluate = () => window.eval(fillSource);
  const aiValueForField = (item) => {
    const [section, property] = (item.deterministicKey || "").split(".");
    const source = section === "work" ? work[item.recordIndex] : section === "project" ? projects[item.recordIndex] : null;
    if (!source) return "";
    if (property === "description") return source.bullets.join("\n");
    return source[property] ?? "";
  };
  const analyseThenAiFill = async ({ localExactOnly = false } = {}) => {
    storage.analysisOnly = true;
    storage.aiAutofillOnly = false;
    const analysis = await evaluate();
    if (analysis.pipelineDiagnostics?.duplicateFieldKeyCount || analysis.pipelineDiagnostics?.duplicateElementIdentityCount) throw new Error("identity collision");
    if (!analysis.fields.every((item) => item.fieldKey && item.elementIdentity)) throw new Error("missing field identity");
    const repeated = analysis.fields.filter((item) => ["work", "project"].includes(item.sectionType));
    if (!repeated.every((item) => item.pageRecordId && Number.isInteger(item.recordIndex) && item.resumePath)) throw new Error("missing record identity");
    storage.analysisOnly = false;
    storage.aiAutofillOnly = true;
    storage.fillMode = "ai";
    storage.aiValueMappings = Object.fromEntries(analysis.fields.map((item) => [item.fieldKey, {
      value: localExactOnly ? null : aiValueForField(item),
      confidence: 0.99,
      basis: localExactOnly ? "exact_fact" : "resume",
      localExactOnly,
    }]));
    const summary = await evaluate();
    return { analysis, summary };
  };

  let actual = {};
  if (scenario === "local-exact-fallback") {
    document.querySelector("#form").innerHTML = `<section><p>请确保证件信息准确无误；中国籍请选择身份证。</p>${field("姓名")}${field("手机号", "input", "type='tel'")}</section><h2>实习经历</h2>${work.slice(0, 2).map(() => workRecord()).join("")}`;
    const { summary } = await analyseThenAiFill({ localExactOnly: true });
    const basics = [...document.querySelectorAll("#form > section label input")].map((input) => input.value);
    const records = [...document.querySelectorAll(".record")];
    actual = {
      basics,
      companies: records.map((record) => record.querySelector("input").value),
      titles: records.map((record) => record.querySelectorAll("input")[1].value),
      summary,
    };
    actual.passed = basics.join("|") === "王小星|13800000000"
      && actual.companies.join("|") === work.slice(0, 2).map((item) => item.company).join("|")
      && actual.titles.join("|") === work.slice(0, 2).map((item) => item.title).join("|")
      && summary.filled >= 6;
  } else if (scenario === "four-internships") {
    document.querySelector("#form").innerHTML = `<h2>实习经历</h2>${work.map(() => workRecord()).join("")}`;
    const { analysis, summary } = await analyseThenAiFill();
    const records = [...document.querySelectorAll(".record")];
    actual = {
      companies: records.map((record) => record.querySelector("input").value),
      descriptions: records.map((record) => record.querySelector("textarea").value),
      recordIds: analysis.fields.filter((item) => item.semanticKey === "company").map((item) => item.pageRecordId),
      resumePaths: analysis.fields.filter((item) => item.semanticKey === "company").map((item) => item.resumePath),
      summary,
    };
    actual.passed = actual.companies.join("|") === work.map((item) => item.company).join("|")
      && actual.descriptions.join("|") === work.map((item) => item.bullets[0]).join("|")
      && unique(actual.recordIds) && unique(actual.resumePaths) && summary.invalidDatesUnresolved === 0;
  } else if (scenario === "two-projects") {
    document.querySelector("#form").innerHTML = `<h2>项目经历</h2>${projects.map(() => projectRecord()).join("")}`;
    const { analysis, summary } = await analyseThenAiFill();
    const records = [...document.querySelectorAll(".record")];
    actual = {
      names: records.map((record) => record.querySelector("input").value),
      roles: records.map((record) => record.querySelectorAll("input")[1].value),
      recordIds: analysis.fields.filter((item) => item.semanticKey === "name").map((item) => item.pageRecordId),
      summary,
    };
    actual.passed = actual.names.join("|") === projects.map((item) => item.name).join("|")
      && actual.roles.join("|") === projects.map((item) => item.role).join("|") && unique(actual.recordIds);
  } else if (scenario === "repeated-record-dates") {
    document.querySelector("#form").innerHTML = `<h2>实习经历</h2>${work.map(() => workRecord()).join("")}`;
    const { summary } = await analyseThenAiFill();
    const records = [...document.querySelectorAll(".record")];
    actual = {
      dates: records.map((record) => [...record.querySelectorAll("input[type='month']")].map((input) => input.value)),
      summary,
    };
    actual.passed = actual.dates.every((range, index) => range[0] === work[index].startDate && range[1] === work[index].endDate)
      && summary.pipelineDiagnostics?.verifiedFillCount !== 0 && summary.invalidDatesUnresolved === 0;
  } else if (scenario === "split-year-month") {
    document.querySelector("#form").innerHTML = `<h2>实习经历</h2>${work.slice(0, 2).map(() => workRecord(true)).join("")}`;
    setupSplitOptions();
    const { analysis, summary } = await analyseThenAiFill();
    const records = [...document.querySelectorAll(".record")];
    actual = { values: records.map((record) => [...record.querySelectorAll("select")].map((select) => select.value)), dateParts: analysis.fields.filter((item) => item.datePart).map((item) => item.datePart), summary };
    actual.passed = actual.values[0].join("|") === "2026|01|2026|02"
      && actual.values[1].join("|") === "2025|09|2025|12"
      && actual.dateParts.join("|") === "year|month|year|month|year|month|year|month";
  } else if (scenario === "moka-nested-date-range") {
    document.querySelector("#form").innerHTML = `<div class="moka-section-header"><span>实习经历</span><button type="button">添加</button></div><article class="record">${mokaDateRange()}${field("公司名称")}${field("职位名称")}</article>`;
    setupSplitOptions();
    const { analysis, summary } = await analyseThenAiFill({ localExactOnly: true });
    const dateFields = analysis.fields.filter((item) => item.deterministicKey === "work.startDate" || item.deterministicKey === "work.endDate");
    actual = {
      values: [...document.querySelectorAll("select")].map((select) => select.value),
      keys: dateFields.map((item) => item.deterministicKey),
      dateParts: dateFields.map((item) => item.datePart),
      recordIndices: dateFields.map((item) => item.recordIndex),
      summary,
    };
    actual.passed = actual.values.join("|") === "2026|01|2026|02"
      && actual.keys.join("|") === "work.startDate|work.startDate|work.endDate|work.endDate"
      && actual.dateParts.join("|") === "year|month|year|month"
      && actual.recordIndices.every((value) => value === 0)
      && summary.filled >= 6;
  } else if (scenario === "rerender-after-first-record") {
    document.querySelector("#form").innerHTML = `<h2>实习经历</h2>${work.slice(0, 2).map(() => workRecord()).join("")}`;
    const form = document.querySelector("#form");
    let rerendered = false;
    form.addEventListener("input", () => {
      if (rerendered) return;
      rerendered = true;
      const second = form.querySelectorAll(".record")[1];
      second.replaceWith(second.cloneNode(true));
    });
    const { summary } = await analyseThenAiFill();
    const records = [...document.querySelectorAll(".record")];
    actual = { companies: records.map((record) => record.querySelector("input").value), summary };
    actual.passed = rerendered && actual.companies.join("|") === work.slice(0, 2).map((item) => item.company).join("|");
  } else if (scenario === "late-hydration-form") {
    await new Promise((resolve) => setTimeout(resolve, 180));
    document.querySelector("#form").innerHTML = `<h2>实习经历</h2>${work.slice(0, 2).map(() => workRecord()).join("")}`;
    const first = await evaluate();
    await new Promise((resolve) => setTimeout(resolve, 80));
    const second = await evaluate();
    actual = { firstCount: first.fields.length, secondCount: second.fields.length, firstFingerprint: first.fields.map((item) => item.fieldKey).join("|"), secondFingerprint: second.fields.map((item) => item.fieldKey).join("|") };
    actual.passed = actual.firstCount === 10 && actual.secondCount === 10 && actual.firstFingerprint === actual.secondFingerprint;
  } else {
    throw new Error(`unknown scenario ${scenario}`);
  }

  resultNode.textContent = JSON.stringify(actual);
  document.title = actual.passed ? marker : `${marker}_FAIL`;
})().catch((error) => {
  document.querySelector("#result").textContent = JSON.stringify({ passed: false, error: String(error), stack: error?.stack });
  document.title = `${document.body.dataset.marker}_FAIL`;
});
