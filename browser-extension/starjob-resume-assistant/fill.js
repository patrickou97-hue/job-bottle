(async () => {
  const stored = await chrome.storage.local.get(["starjobResumes", "activeResumeId", "fillMode", "analysisOnly", "aiOnly", "aiFieldMappings"]);
  const resumes = Array.isArray(stored.starjobResumes) ? stored.starjobResumes : [];
  const resume = resumes.find((item) => item.id === stored.activeResumeId) || resumes[0];
  const fillMode = stored.fillMode === "overwrite" ? "overwrite" : "merge";
  const analysisOnly = stored.analysisOnly === true;
  const aiOnly = stored.aiOnly === true;
  const aiFieldMappings = stored.aiFieldMappings && typeof stored.aiFieldMappings === "object" ? stored.aiFieldMappings : {};

  if (!resume?.content) {
    return { scanned: 0, filled: 0, preserved: 0, manual: 0, error: "missing_resume" };
  }

  const normalize = (value) => String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\-_./\\:：,，()（）\[\]【】{}<>《》?？*]+/g, "");
  const asText = (value) => Array.isArray(value) ? value.filter(Boolean).join("；") : String(value ?? "").trim();
  const joinBullets = (value) => Array.isArray(value) ? value.filter(Boolean).join("\n") : "";
  const content = resume.content;
  const basics = content.basics || {};
  const education = Array.isArray(content.education) ? content.education : [];
  const work = Array.isArray(content.work) ? content.work : [];
  const projects = Array.isArray(content.projects) ? content.projects : [];
  const campus = Array.isArray(content.campus) ? content.campus : [];
  const awards = Array.isArray(content.awards) ? content.awards : [];
  const certifications = Array.isArray(content.certifications) ? content.certifications : [];
  const languages = Array.isArray(content.languages) ? content.languages : [];

  const definitions = [
    { key: "basics.name", section: "basic", aliases: ["姓名", "中文姓名", "真实姓名", "name", "fullname", "legalname", "applicantname", "candidatename"], values: [basics.name] },
    { key: "basics.englishName", section: "basic", aliases: ["英文名", "英文姓名", "englishname", "preferredname"], values: [basics.englishName] },
    { key: "basics.phone", section: "basic", aliases: ["手机", "手机号", "联系电话", "电话", "mobile", "mobilephone", "phonenumber", "telephone", "tel"], values: [basics.phone], types: ["tel"] },
    { key: "basics.email", section: "basic", aliases: ["邮箱", "电子邮箱", "邮件地址", "email", "emailaddress"], values: [basics.email], types: ["email"] },
    { key: "basics.city", section: "basic", aliases: ["所在城市", "当前城市", "居住城市", "现居地", "城市", "currentcity", "city", "location"], values: [basics.city] },
    { key: "basics.linkedin", section: "basic", aliases: ["领英", "linkedin", "linkedinurl", "linkedinprofile"], values: [basics.linkedin], types: ["url"] },
    { key: "basics.github", section: "basic", aliases: ["github", "githuburl", "githubprofile", "代码仓库"], values: [basics.github], types: ["url"] },
    { key: "basics.website", section: "basic", aliases: ["个人网站", "作品集", "portfolio", "personalwebsite", "websiteurl"], values: [basics.website], types: ["url"] },
    { key: "basics.targetRole", section: "basic", aliases: ["目标岗位", "求职意向", "应聘职位", "申请职位", "targetrole", "desiredposition", "positionapplied"], values: [basics.targetRole || resume.targetRole] },

    { key: "education.school", section: "education", aliases: ["学校", "学校名称", "院校", "毕业院校", "大学", "school", "schoolname", "university", "college", "institution"], values: education.map((item) => item.school) },
    { key: "education.degree", section: "education", aliases: ["学历", "学位", "degree", "educationlevel", "highestdegree"], values: education.map((item) => item.degree) },
    { key: "education.major", section: "education", aliases: ["专业", "主修专业", "major", "fieldofstudy", "discipline"], values: education.map((item) => item.major) },
    { key: "education.startDate", section: "education", aliases: ["入学时间", "教育开始时间", "入学日期", "educationstartdate", "schoolstartdate", "startdate"], values: education.map((item) => item.startDate), date: true },
    { key: "education.endDate", section: "education", aliases: ["毕业时间", "预计毕业时间", "教育结束时间", "毕业日期", "educationenddate", "graduationdate", "enddate"], values: education.map((item) => item.endDate), date: true },
    { key: "education.gpa", section: "education", aliases: ["gpa", "绩点", "平均绩点", "gradepointaverage"], values: education.map((item) => item.gpa) },
    { key: "education.courses", section: "education", aliases: ["主修课程", "相关课程", "核心课程", "courses", "coursework", "relevantcourses"], values: education.map((item) => item.courses) },
    { key: "education.honors", section: "education", aliases: ["在校荣誉", "教育荣誉", "奖学金", "honors", "academichonors"], values: education.map((item) => item.honors) },
    { key: "education.description", section: "education", aliases: ["教育经历描述", "教育描述", "经历描述", "教育背景描述", "educationdescription", "academicdescription"], values: education.map((item) => [item.courses, item.honors].filter(Boolean).join("\n")), multiline: true },

    { key: "work.company", section: "work", aliases: ["公司", "公司名称", "单位名称", "雇主", "company", "companyname", "employer", "organization"], values: work.map((item) => item.company) },
    { key: "work.title", section: "work", aliases: ["职位", "岗位", "岗位名称", "职务", "职位名称", "jobtitle", "position", "role", "title"], values: work.map((item) => item.title) },
    { key: "work.location", section: "work", aliases: ["工作地点", "实习地点", "公司地点", "worklocation", "joblocation", "companylocation"], values: work.map((item) => item.location) },
    { key: "work.startDate", section: "work", aliases: ["开始日期", "开始时间", "工作开始日期", "工作开始时间", "实习开始时间", "任职开始时间", "workstartdate", "employmentstartdate", "startdate"], values: work.map((item) => item.startDate), date: true },
    { key: "work.endDate", section: "work", aliases: ["结束日期", "结束时间", "工作结束日期", "工作结束时间", "实习结束时间", "离职时间", "workenddate", "employmentenddate", "enddate"], values: work.map((item) => item.endDate), date: true },
    { key: "work.current", section: "work", aliases: ["至今", "仍在职", "当前任职", "currentlyworkhere", "currentposition", "present"], values: work.map((item) => Boolean(item.current)), checkbox: true },
    { key: "work.description", section: "work", aliases: ["经历描述", "工作描述", "工作内容", "工作职责", "职责描述", "工作职责描述", "岗位职责", "岗位描述", "实习描述", "实习内容", "主要职责", "主要工作", "主要工作内容", "工作业绩", "工作成果", "职责及业绩", "描述", "workdescription", "jobdescription", "responsibilities", "responsibility", "duties", "duty", "achievements", "description"], values: work.map((item) => joinBullets(item.bullets)), multiline: true },

    { key: "project.name", section: "project", aliases: ["项目名称", "项目名", "projectname", "projecttitle"], values: projects.map((item) => item.name) },
    { key: "project.role", section: "project", aliases: ["项目角色", "担任角色", "项目职务", "projectrole", "roleinproject"], values: projects.map((item) => item.role) },
    { key: "project.startDate", section: "project", aliases: ["项目开始时间", "项目开始日期", "projectstartdate", "startdate"], values: projects.map((item) => item.startDate), date: true },
    { key: "project.endDate", section: "project", aliases: ["项目结束时间", "项目结束日期", "projectenddate", "enddate"], values: projects.map((item) => item.endDate), date: true },
    { key: "project.description", section: "project", aliases: ["项目描述", "项目内容", "项目职责", "项目成果", "项目业绩", "项目详情", "项目介绍", "项目经历", "项目经历描述", "负责内容", "主要内容", "个人贡献", "职责描述", "经历描述", "描述", "projectdescription", "projectdetails", "projectresponsibilities", "projectduties", "projectachievements", "responsibilities", "responsibility", "duties", "duty", "achievements", "contribution", "description"], values: projects.map((item) => joinBullets(item.bullets)), multiline: true },
    { key: "project.keywords", section: "project", aliases: ["项目关键词", "项目技能", "技术栈", "projectskills", "technologies", "techstack"], values: projects.map((item) => item.keywords) },

    { key: "skills", section: "skills", aliases: ["技能", "专业技能", "技能特长", "skills", "technicalskills", "competencies"], values: [(content.skills || []).flatMap((group) => group.skills || []).filter(Boolean).join("、")], multiline: true },
    { key: "campus.title", section: "campus", aliases: ["校园经历名称", "学生工作名称", "社团名称", "活动名称", "campustitle", "activityname"], values: campus.map((item) => item.title) },
    { key: "campus.description", section: "campus", aliases: ["校园经历描述", "学生工作描述", "社团描述", "活动描述", "经历描述", "描述", "campusdescription", "activitydescription"], values: campus.map((item) => joinBullets(item.bullets)), multiline: true },
    { key: "awards.title", section: "awards", aliases: ["获奖名称", "奖项名称", "荣誉名称", "奖项", "获奖经历", "awardname", "awardtitle", "honortitle"], values: awards.map((item) => item.title) },
    { key: "awards.description", section: "awards", aliases: ["获奖描述", "奖项描述", "荣誉描述", "描述", "awarddescription", "honordescription"], values: awards.map((item) => joinBullets(item.bullets)), multiline: true },
    { key: "certifications.title", section: "certifications", aliases: ["证书", "证书名称", "资格证书", "认证名称", "certification", "certificationname", "license"], values: certifications.map((item) => item.title) },
    { key: "certifications.details", section: "certifications", aliases: ["证书描述", "认证描述", "成绩", "分数", "等级", "certificationdetails", "score", "grade"], values: certifications.map((item) => joinBullets(item.bullets)) },
    { key: "languages.title", section: "languages", aliases: ["语言名称", "外语名称", "语种", "languagename"], values: languages.map((item) => item.title) },
    { key: "languages.details", section: "languages", aliases: ["语言能力", "外语能力", "语言水平", "熟练程度", "languageproficiency"], values: languages.map((item) => joinBullets(item.bullets)), multiline: true },
  ];

  const sectionAliases = {
    education: ["教育", "学校", "education", "academic"],
    work: ["工作", "实习", "任职", "work", "employment", "experience"],
    project: ["项目", "project"],
    skills: ["技能", "skills"],
    campus: ["校园", "社团", "学生工作", "campus", "activities", "leadership"],
    awards: ["获奖", "荣誉", "award", "honor"],
    certifications: ["证书", "认证", "certification", "license"],
    languages: ["语言", "外语", "language"],
  };
  const sensitiveTerms = ["身份证", "身份证号", "idcard", "nationalid", "护照", "passport", "性别", "gender", "婚姻", "marital", "民族", "ethnicity", "残疾", "disability", "退伍", "veteran", "薪资", "salary", "期望薪资", "政治面貌", "宗教", "religion", "验证码", "captcha", "密码", "password"];
  const autocompleteMap = {
    name: "basics.name",
    "given-name": "basics.name",
    email: "basics.email",
    tel: "basics.phone",
    "tel-national": "basics.phone",
    "address-level2": "basics.city",
    organization: "work.company",
    "organization-title": "work.title",
  };

  function getFieldSignals(element) {
    const visible = [];
    const attributes = [];
    if (element.labels) visible.push(...Array.from(element.labels).map((label) => label.textContent || ""));
    visible.push(element.getAttribute("aria-label") || "");
    const labelledBy = element.getAttribute("aria-labelledby");
    if (labelledBy) {
      visible.push(...labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent || ""));
    }
    visible.push(element.getAttribute("placeholder") || "");
    const hasOwnLabel = visible.some((value) => String(value).trim().length > 0);
    if (!hasOwnLabel) {
      let container = element.parentElement;
      for (let depth = 0; container && depth < 4; depth += 1, container = container.parentElement) {
        const controlCount = container.querySelectorAll("input, textarea, select, [contenteditable='true']").length;
        if (controlCount > 3) continue;
        const nearbyLabels = Array.from(container.querySelectorAll("label, .ant-form-item-label, .el-form-item__label, .form-label, [class*='field-label']"))
          .filter((label) => !label.contains(element))
          .map((label) => label.textContent || "")
          .filter((text) => text.trim().length > 0 && text.trim().length <= 80);
        if (nearbyLabels.length) {
          visible.push(nearbyLabels[0]);
          break;
        }
      }
    }
    attributes.push(element.getAttribute("name") || "");
    attributes.push(element.id || "");
    attributes.push(element.getAttribute("data-testid") || "");
    return {
      visible: visible.filter(Boolean).map((value) => String(value).slice(0, 180)),
      attributes: attributes.filter(Boolean).map((value) => String(value).slice(0, 180)),
    };
  }

  function getContextText(element) {
    let container = element.parentElement;
    for (let depth = 0; container && depth < 7; depth += 1, container = container.parentElement) {
      const values = [container.getAttribute("aria-label") || "", container.getAttribute("data-section") || ""];
      values.push(...Array.from(container.children)
        .filter((child) => child.matches("legend, h1, h2, h3, h4, h5, [role='heading'], .section-title, .form-section-title"))
        .map((child) => child.textContent || ""));
      const controlCount = container.querySelectorAll("input, textarea, select, [contenteditable='true']").length;
      if (controlCount <= 14) {
        const nestedHeading = container.querySelector("legend, h1, h2, h3, h4, h5, [role='heading'], .section-title, .form-section-title");
        if (nestedHeading?.textContent) values.push(nestedHeading.textContent);
      }
      const context = values.filter(Boolean).join(" ").slice(0, 520);
      const normalizedContext = normalize(context);
      const hasSection = Object.values(sectionAliases).some((aliases) => aliases.some((alias) => normalizedContext.includes(normalize(alias))));
      if (hasSection) return context;
    }
    return "";
  }

  function detectSectionFromText(value) {
    const text = normalize(value);
    if (/获奖名称|奖项名称|荣誉名称|获奖时间|awardname|awardtitle/.test(text)) return "awards";
    if (/项目经历|项目名称|项目角色|项目链接|项目描述|项目内容|projectexperience|projectname|projectrole|projectdescription/.test(text)) return "project";
    if (/学校名称|毕业院校|入学时间|毕业时间|schoolname|educationlevel/.test(text)) return "education";
    if (/公司名称|工作经历|实习经历|任职经历|companyname|workexperience|employment/.test(text)) return "work";
    if (/校园经历名称|学生工作名称|社团名称|活动名称|campustitle|activityname/.test(text)) return "campus";
    if (/证书名称|资格证书|认证名称|certificationname/.test(text)) return "certifications";
    if (/语言名称|外语名称|语种|languagename/.test(text)) return "languages";
    return null;
  }

  function inferSectionHint(element, signals, contextText) {
    const directHint = detectSectionFromText(`${signals.visible.join(" ")} ${contextText}`);
    if (directHint) return directHint;

    let container = element.parentElement;
    for (let depth = 0; container && depth < 9; depth += 1, container = container.parentElement) {
      const controlCount = container.querySelectorAll("input, textarea, select, [contenteditable='true']").length;
      if (controlCount > 28) continue;
      const hint = detectSectionFromText((container.innerText || "").slice(0, 1_600));
      if (hint) return hint;
    }
    return null;
  }

  function looksLikeRecordContainer(container, section) {
    const text = normalize((container.innerText || "").slice(0, 2_000));
    if (section === "work") return /公司|company/.test(text) && /职位|岗位|起止时间|开始日期|描述|position|jobtitle/.test(text);
    if (section === "project") return /项目名称|projectname/.test(text) && /项目角色|项目链接|起止时间|描述|projectrole|projectdescription/.test(text);
    if (section === "education") return /学校|院校|school/.test(text) && /学历|专业|入学|毕业|degree|major/.test(text);
    if (section === "campus") return /校园经历名称|学生工作名称|社团名称|活动名称/.test(text) && /描述|时间|角色/.test(text);
    if (section === "awards") return /获奖名称|奖项名称|荣誉名称/.test(text) && /描述|获奖时间|奖项时间/.test(text);
    if (section === "certifications") return /证书|认证/.test(text) && /成绩|分数|等级|描述/.test(text);
    if (section === "languages") return /语言|外语|语种/.test(text) && /水平|熟练|描述/.test(text);
    return false;
  }

  function hasMultipleRecordHeadings(container) {
    const matches = (container.innerText || "")
      .slice(0, 4_000)
      .match(/(?:教育|学校|工作|实习|任职|项目|证书)?\s*经历\s*[-—_#第]?\s*\d+/gi) || [];
    return new Set(matches.map(normalize)).size > 1;
  }

  function findRecordContainer(element, sectionHint) {
    if (!sectionHint) return null;
    let container = element.parentElement;
    for (let depth = 0; container && depth < 10; depth += 1, container = container.parentElement) {
      const controlCount = container.querySelectorAll("input, textarea, select, [contenteditable='true']").length;
      if (controlCount >= 2
        && controlCount <= 24
        && !hasMultipleRecordHeadings(container)
        && looksLikeRecordContainer(container, sectionHint)) return container;
    }
    return null;
  }

  function inferPairedDateKey(element, sectionHint) {
    if (!["education", "work", "project"].includes(sectionHint)) return null;
    let container = element.parentElement;
    for (let depth = 0; container && depth < 6; depth += 1, container = container.parentElement) {
      const text = normalize((container.innerText || "").slice(0, 500));
      const dateRangeContainer = /起止时间|日期范围|任职时间|项目时间|教育时间|开始结束|起始结束|起讫时间|daterange/.test(text);
      if (!dateRangeContainer) continue;
      const controls = Array.from(container.querySelectorAll("input, select, [role='combobox']"))
        .filter((control) => control instanceof HTMLElement
          && !control.disabled
          && (!(control instanceof HTMLInputElement) || !["hidden", "checkbox", "radio"].includes(control.type)));
      if (controls.length !== 2) continue;
      const position = controls.indexOf(element);
      if (position === 0) return `${sectionHint}.startDate`;
      if (position === 1) return `${sectionHint}.endDate`;
    }
    return null;
  }

  function isLikelyDateControl(element) {
    const ownText = normalize([
      element.getAttribute("name") || "",
      element.id || "",
      element.getAttribute("placeholder") || "",
      element.getAttribute("aria-label") || "",
    ].join(" "));
    if (/日期|时间|年月|date|month|year|start|end/.test(ownText)) return true;

    let container = element.parentElement;
    for (let depth = 0; container && depth < 5; depth += 1, container = container.parentElement) {
      const controlCount = container.querySelectorAll("input, select, [role='combobox']").length;
      if (controlCount > 4) continue;
      const text = normalize(`${container.innerText || ""} ${container.className || ""}`);
      if (/起止时间|日期范围|任职时间|项目时间|教育时间|开始日期|结束日期|入学时间|毕业时间|datepicker|date-picker/.test(text)) return true;
    }
    return false;
  }

  function isVisible(element) {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  }

  function isDefinitionControlCompatible(definition, element) {
    const inputType = element instanceof HTMLInputElement ? element.type.toLowerCase() : "";
    if (Boolean(definition.checkbox) !== (inputType === "checkbox")) return false;
    if (element instanceof HTMLTextAreaElement && !definition.multiline) return false;
    if (["date", "month", "datetime-local"].includes(inputType) && !definition.date) return false;
    return true;
  }

  function scoreDefinition(definition, element, signals, contextText, sectionHint) {
    const visibleSignals = signals.visible.map(normalize).filter(Boolean);
    const attributeSignals = signals.attributes.map(normalize).filter(Boolean);
    const context = normalize(contextText);
    const inputType = element instanceof HTMLInputElement ? element.type.toLowerCase() : "";
    let score = 0;

    if (sectionHint && definition.section !== sectionHint) return 0;
    if (!isDefinitionControlCompatible(definition, element)) return 0;

    for (const alias of definition.aliases) {
      const normalizedAlias = normalize(alias);
      if (!normalizedAlias) continue;
      if (["描述", "description"].includes(normalizedAlias)
        && (!sectionHint || definition.section !== sectionHint)) continue;
      for (const signal of visibleSignals) {
        if (signal === normalizedAlias) score = Math.max(score, 0.99);
        else if (signal.includes(normalizedAlias) && normalizedAlias.length >= 2) score = Math.max(score, 0.91);
        else if (normalizedAlias.includes(signal) && signal.length >= 4) score = Math.max(score, 0.8);
      }
      for (const signal of attributeSignals) {
        if (signal === normalizedAlias) score = Math.max(score, 0.9);
        else if (signal.includes(normalizedAlias) && normalizedAlias.length >= 5) score = Math.max(score, 0.78);
        else if (normalizedAlias.includes(signal) && signal.length >= 5) score = Math.max(score, 0.7);
      }
    }

    if (definition.types?.includes(inputType) && score >= 0.65) score += 0.08;
    const expectedSection = sectionAliases[definition.section] || [];
    const detectedSections = Object.entries(sectionAliases)
      .filter(([, aliases]) => aliases.some((alias) => context.includes(normalize(alias))))
      .map(([section]) => section);
    if (expectedSection.some((alias) => context.includes(normalize(alias)))) score += 0.08;
    else if (detectedSections.length && !detectedSections.includes(definition.section)) score -= 0.18;
    if (definition.section === "basic" && detectedSections.some((section) => ["education", "work", "project"].includes(section))) score -= 0.22;
    if (definition.multiline && element instanceof HTMLTextAreaElement) score += 0.06;
    if (definition.date && visibleSignals.some((signal) => /日期|时间|date|month|year/.test(signal))) score += 0.05;
    if (definition.checkbox && inputType === "checkbox") score += 0.08;
    return Math.max(0, Math.min(score, 1));
  }

  function formatDate(value, element) {
    const text = asText(value);
    const match = text.match(/(19|20)\d{2}[^0-9]?([01]?\d)?[^0-9]?([0-3]?\d)?/);
    if (!match) return text;
    const year = match[0].slice(0, 4);
    const monthMatch = text.slice(4).match(/([01]?\d)/);
    const month = monthMatch ? monthMatch[1].padStart(2, "0") : "01";
    if (element instanceof HTMLInputElement && element.type === "month") return `${year}-${month}`;
    if (element instanceof HTMLInputElement && element.type === "date") return `${year}-${month}-01`;
    if (element instanceof HTMLInputElement) {
      const dateSignal = normalize(`${element.placeholder} ${element.getAttribute("aria-label") || ""}`);
      if (/日期|年月日|yyyymmdd|date/.test(dateSignal)) return `${year}-${month}-01`;
      if (/月份|年月|yyyymm|month/.test(dateSignal)) return `${year}-${month}`;
    }
    return text;
  }

  function setNativeValue(element, value) {
    const prototype = element instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    if (setter) setter.call(element, value);
    else element.value = value;
  }

  function dispatchEvents(element) {
    element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.dispatchEvent(new Event("blur", { bubbles: true }));
  }

  function dispatchActivation(element) {
    element.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse" }));
    element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    element.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerType: "mouse" }));
    element.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }

  const wait = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

  function isVisibleDatePickerNode(element) {
    if (!(element instanceof HTMLElement)) return false;
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  }

  function datePickerTargetTokens(rawValue) {
    const match = asText(rawValue).match(/((?:19|20)\d{2})[^0-9]?([01]?\d)?[^0-9]?([0-3]?\d)?/);
    if (!match) return [];
    const year = match[1];
    const month = (match[2] || "1").padStart(2, "0");
    const day = (match[3] || "1").padStart(2, "0");
    return [`${year}-${month}-${day}`, `${year}/${month}/${day}`, `${year}年${Number(month)}月${Number(day)}日`, `${year}-${month}`, `${year}/${month}`, `${year}年${Number(month)}月`];
  }

  function parseDateParts(rawValue) {
    const match = asText(rawValue).match(/((?:19|20)\d{2})[^0-9]?([01]?\d)?[^0-9]?([0-3]?\d)?/);
    if (!match) return null;
    return {
      year: Number(match[1]),
      month: Math.max(1, Math.min(12, Number(match[2] || 1))),
      day: Math.max(1, Math.min(31, Number(match[3] || 1))),
    };
  }

  function findActiveDatePickerPanel() {
    const panels = Array.from(document.querySelectorAll([
      ".ant-picker-dropdown:not(.ant-picker-dropdown-hidden)",
      ".el-picker-panel",
      ".arco-picker-container",
      ".semi-datepicker",
      ".ivu-date-picker-transfer",
      "[role='dialog'][class*='picker']",
      "[class*='datepicker-popup']",
      "[class*='date-picker-dropdown']",
      "[class*='calendar-panel']",
    ].join(", "))).filter((panel) => isVisibleDatePickerNode(panel)
      && panel.querySelector("[data-date], [role='grid'], [role='gridcell'], .ant-picker-cell, .el-date-table, .el-month-table"));
    return panels.at(-1) || null;
  }

  function findExactDatePickerOption(rawValue, root) {
    if (!root) return null;
    const tokens = datePickerTargetTokens(rawValue).map(normalize);
    if (!tokens.length) return null;
    const options = Array.from(root.querySelectorAll("[data-date], [data-value], [title], [aria-label], [role='gridcell'], [role='option']"))
      .filter(isVisibleDatePickerNode);
    return options.find((option) => {
      const attributes = ["data-date", "data-value", "title", "aria-label"]
        .map((name) => option.getAttribute(name) || "")
        .filter(Boolean)
        .map(normalize);
      return attributes.some((attribute) => tokens.some((token) => attribute === token || attribute.endsWith(token)));
    }) || null;
  }

  function readVisiblePickerMonth(root) {
    if (!root) return null;
    const datedNodes = Array.from(root.querySelectorAll("[data-date], [data-value], [title], [aria-label]"))
      .filter(isVisibleDatePickerNode)
      .flatMap((node) => ["data-date", "data-value", "title", "aria-label"].map((name) => node.getAttribute(name) || ""))
      .map((value) => value.match(/((?:19|20)\d{2})[-/]([01]?\d)(?:[-/]([0-3]?\d))?/))
      .filter(Boolean)
      .map((match) => ({ year: Number(match[1]), month: Number(match[2]), day: Number(match[3] || 15) }))
      .sort((left, right) => (left.year * 372 + left.month * 31 + left.day) - (right.year * 372 + right.month * 31 + right.day));
    if (datedNodes.length) {
      const middle = datedNodes[Math.floor(datedNodes.length / 2)];
      return { year: middle.year, month: middle.month };
    }

    const headers = Array.from(root.querySelectorAll(".ant-picker-year-btn, .ant-picker-month-btn, .el-date-picker__header-label, [class*='picker-header']"))
      .filter(isVisibleDatePickerNode)
      .map((node) => (node.textContent || "").trim());
    const year = headers.map((text) => text.match(/(?:19|20)\d{2}/)?.[0]).find(Boolean);
    const month = headers.map((text) => text.match(/(?:^|\D)(1[0-2]|0?[1-9])\s*月?(?:\D|$)/)?.[1]).find(Boolean);
    return year ? { year: Number(year), month: Number(month || 1) } : null;
  }

  function findDatePickerNavigation(root, direction, unit) {
    if (!root) return null;
    const controls = Array.from(root.querySelectorAll("button, [role='button']")).filter(isVisibleDatePickerNode);
    return controls.find((control) => {
      if (control.disabled) return false;
      const text = normalize([
        control.className || "",
        control.getAttribute("title") || "",
        control.getAttribute("aria-label") || "",
        control.textContent || "",
      ].join(" "));
      const previous = direction === "previous";
      if (unit === "year") {
        return previous
          ? /superprev|darrowleft|prevyear|previousyear|上一年|前一年/.test(text)
          : /supernext|darrowright|nextyear|后一年|下一年/.test(text);
      }
      if (/superprev|supernext|darrowleft|darrowright|prevyear|nextyear|previousyear/.test(text)) return false;
      return previous
        ? /headerprevbtn|arrowleft|prevmonth|previousmonth|上个月|上一月/.test(text)
        : /headernextbtn|arrowright|nextmonth|下个月|下一月/.test(text);
    }) || null;
  }

  async function navigateDatePickerToTarget(rawValue, root) {
    const target = parseDateParts(rawValue);
    let current = readVisiblePickerMonth(root);
    if (!target || !current) return null;

    let yearSteps = Math.min(12, Math.abs(target.year - current.year));
    while (yearSteps > 0 && target.year !== current.year) {
      const direction = target.year < current.year ? "previous" : "next";
      const control = findDatePickerNavigation(root, direction, "year");
      if (!control) break;
      dispatchActivation(control);
      await wait(24);
      const exact = findExactDatePickerOption(rawValue, root);
      if (exact) return exact;
      current = readVisiblePickerMonth(root) || { year: current.year + (direction === "next" ? 1 : -1), month: current.month };
      yearSteps -= 1;
    }

    current = readVisiblePickerMonth(root) || current;
    let monthDelta = (target.year - current.year) * 12 + target.month - current.month;
    let monthSteps = Math.min(18, Math.abs(monthDelta));
    while (monthSteps > 0 && monthDelta !== 0) {
      const direction = monthDelta < 0 ? "previous" : "next";
      const control = findDatePickerNavigation(root, direction, "month");
      if (!control) break;
      dispatchActivation(control);
      await wait(24);
      const exact = findExactDatePickerOption(rawValue, root);
      if (exact) return exact;
      current = readVisiblePickerMonth(root) || current;
      monthDelta = (target.year - current.year) * 12 + target.month - current.month;
      monthSteps -= 1;
    }
    return findExactDatePickerOption(rawValue, root);
  }

  function findDatePickerTrigger(element) {
    const wrapper = element.closest([
      ".ant-picker",
      ".el-date-editor",
      ".arco-picker",
      ".semi-datepicker",
      ".ivu-date-picker",
      "[class*='datepicker']",
      "[class*='date-picker']",
      "[data-testid*='date-picker']",
    ].join(", "));
    if (wrapper instanceof HTMLElement) return wrapper;
    if (element.getAttribute("aria-haspopup") === "dialog" || element.getAttribute("aria-haspopup") === "grid") return element;
    return null;
  }

  async function tryExactDatePickerSelection(element, rawValue) {
    if (!(element instanceof HTMLInputElement) || !element.readOnly) return false;
    const trigger = findDatePickerTrigger(element);
    if (!trigger) return false;

    dispatchActivation(element);
    await wait(60);
    const panel = findActiveDatePickerPanel();
    const option = findExactDatePickerOption(rawValue, panel) || await navigateDatePickerToTarget(rawValue, panel);
    if (!option) {
      element.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));
      return false;
    }

    dispatchActivation(option);
    await wait(40);
    return Boolean(currentValue(element));
  }

  async function fillElement(element, rawValue, definition) {
    const value = definition.date ? formatDate(rawValue, element) : asText(rawValue);
    if (definition.checkbox && element instanceof HTMLInputElement && element.type === "checkbox") {
      if (!rawValue) return false;
      element.checked = Boolean(rawValue);
      dispatchEvents(element);
      return true;
    }
    if (!value) return false;

    if (element instanceof HTMLSelectElement) {
      const target = normalize(value);
      const option = Array.from(element.options).find((item) => normalize(item.value) === target || normalize(item.textContent) === target)
        || Array.from(element.options).find((item) => normalize(item.textContent).includes(target) || target.includes(normalize(item.textContent)));
      if (!option) return false;
      element.value = option.value;
      dispatchEvents(element);
      return true;
    }
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      if (definition.date && await tryExactDatePickerSelection(element, rawValue)) return true;
      setNativeValue(element, value);
      dispatchEvents(element);
      return true;
    }
    if (element instanceof HTMLElement && element.isContentEditable) {
      element.textContent = value;
      dispatchEvents(element);
      return true;
    }
    return false;
  }

  function currentValue(element) {
    if (element instanceof HTMLInputElement && element.type === "checkbox") return element.checked ? "checked" : "";
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) return element.value.trim();
    return element.textContent?.trim() || "";
  }

  function markFilled(element, label) {
    element.dataset.starjobFilled = "true";
    element.style.outline = "2px solid rgba(53, 100, 71, 0.72)";
    element.style.outlineOffset = "2px";
    element.title = `拾星已填写：${label}`;
  }

  function createFieldKey(index, element, signals, contextText) {
    const inputType = element instanceof HTMLInputElement ? element.type : element.tagName.toLowerCase();
    return [
      window.location.origin,
      window.location.pathname,
      index,
      inputType,
      normalize(signals.visible.join(" ")).slice(0, 100),
      normalize(signals.attributes.join(" ")).slice(0, 100),
      normalize(contextText).slice(0, 100),
    ].join("|");
  }

  function getExplicitRecordNumber(element, signals, contextText) {
    let container = element.parentElement;
    for (let depth = 0; container && depth < 8; depth += 1, container = container.parentElement) {
      const controlCount = container.querySelectorAll("input, textarea, select, [contenteditable='true']").length;
      if (controlCount > 16) continue;
      const humanMatch = (container.innerText || "").slice(0, 600)
        .match(/(?:教育|学校|工作|实习|任职|项目|证书)?\s*经历\s*[-—_#第]?\s*(\d+)/i);
      if (humanMatch) return Number(humanMatch[1]);
    }

    const contextMatch = contextText.match(/(?:教育|学校|工作|实习|任职|项目|证书)?\s*经历\s*[-—_#第]?\s*(\d+)/i);
    if (contextMatch) return Number(contextMatch[1]);

    const attributes = signals.attributes.join(" ");
    const pathMatch = attributes.match(/(?:\[|\.)(\d+)(?:\]|\.|$)/);
    if (pathMatch) return Number(pathMatch[1]);
    return null;
  }

  function getRepeatableOccurrenceKey(definition, signals) {
    const label = signals.visible.find(Boolean) || signals.attributes.find(Boolean) || definition.key;
    const normalizedLabel = normalize(String(label));
    const aliasFamily = [...definition.aliases]
      .map(normalize)
      .filter((alias) => alias && normalizedLabel.includes(alias))
      .sort((left, right) => right.length - left.length)[0];
    return `${definition.key}|${aliasFamily || normalizedLabel.slice(0, 80)}`;
  }

  function takeNextOccurrenceIndex(occurrences, key) {
    const index = occurrences.get(key) || 0;
    occurrences.set(key, index + 1);
    return index;
  }

  function isUsableRecordIndex(index, definition) {
    return Number.isInteger(index) && index >= 0 && index < definition.values.length;
  }

  function toAnalysisField(field) {
    return {
      fieldKey: field.fieldKey,
      label: field.label,
      attributes: field.attributes,
      context: field.context,
      inputType: field.inputType,
      deterministicKey: field.deterministicKey,
      deterministicConfidence: field.deterministicConfidence,
    };
  }

  if (!aiOnly) {
    document.querySelectorAll("[data-starjob-filled='true']").forEach((element) => {
      element.style.outline = "";
      element.style.outlineOffset = "";
      delete element.dataset.starjobFilled;
    });
  }

  const candidates = Array.from(document.querySelectorAll("input, textarea, select, [contenteditable='true']"))
    .filter((element) => {
      if (!(element instanceof HTMLElement) || !isVisible(element)) return false;
      if (element instanceof HTMLInputElement) {
        if (["hidden", "password", "submit", "button", "reset", "image", "radio"].includes(element.type)) return false;
        if (element.readOnly && !isLikelyDateControl(element)) return false;
      }
      return !element.disabled;
    });
  const extractedFields = [];
  const plans = [];
  let sensitiveCount = 0;

  for (const [candidateIndex, element] of candidates.entries()) {
    const signals = getFieldSignals(element);
    const labelText = [...signals.visible, ...signals.attributes].join(" ");
    const contextText = getContextText(element);
    const sectionHint = inferSectionHint(element, signals, contextText);
    const recordContainer = findRecordContainer(element, sectionHint);
    const pairedDateKey = inferPairedDateKey(element, sectionHint);
    const normalizedSignals = normalize(`${labelText} ${contextText}`);
    const fieldKey = createFieldKey(candidateIndex, element, signals, contextText);
    const inputType = element instanceof HTMLInputElement ? element.type.toLowerCase() : element.tagName.toLowerCase();
    const sensitive = !labelText || sensitiveTerms.some((term) => normalizedSignals.includes(normalize(term)));

    let matchedDefinition = null;
    let bestScore = 0;
    const autocomplete = element.getAttribute("autocomplete")?.toLowerCase().trim();
    const autocompleteKey = autocompleteMap[autocomplete];

    if (!sensitive) {
      for (const definition of definitions) {
        let score = scoreDefinition(definition, element, signals, contextText, sectionHint);
        if (pairedDateKey === definition.key && isDefinitionControlCompatible(definition, element)) score = 1;
        if (autocompleteKey === definition.key && (!sectionHint || definition.section === sectionHint)) score = 1;
        if (score > bestScore) {
          bestScore = score;
          matchedDefinition = definition;
        }
      }
    }

    const aiMapping = aiFieldMappings[fieldKey];
    if (!sensitive && aiMapping && typeof aiMapping === "object" && Number(aiMapping.confidence) >= 0.78) {
      const aiDefinition = definitions.find((definition) => definition.key === aiMapping.key);
      if (aiDefinition && (!sectionHint || aiDefinition.section === sectionHint) && isDefinitionControlCompatible(aiDefinition, element)) {
        matchedDefinition = aiDefinition;
        bestScore = Math.max(bestScore, Number(aiMapping.confidence));
      }
    }

    if (sensitive) sensitiveCount += 1;
    extractedFields.push({
      fieldKey,
      label: signals.visible.find(Boolean)?.replace(/\s+/g, " ").trim().slice(0, 80) || "",
      attributes: signals.attributes.join(" ").slice(0, 160),
      context: [sectionHint, contextText].filter(Boolean).join(" ").replace(/\s+/g, " ").trim().slice(0, 160),
      inputType,
      deterministicKey: matchedDefinition && bestScore >= 0.74 ? matchedDefinition.key : null,
      deterministicConfidence: Number(bestScore.toFixed(2)),
      sensitive,
    });
    plans.push({
      element,
      signals,
      fieldKey,
      matchedDefinition,
      bestScore,
      sensitive,
      sectionHint,
      recordContainer,
      pairedDateKey,
      explicitRecordNumber: getExplicitRecordNumber(element, signals, contextText),
    });
  }

  if (analysisOnly) {
    return {
      scanned: candidates.length,
      identified: plans.filter((plan) => !plan.sensitive && plan.matchedDefinition && plan.bestScore >= 0.74).length,
      fields: extractedFields
        .filter((field) => !field.sensitive)
        .slice(0, 100)
        .map(toAnalysisField),
      sensitive: sensitiveCount,
    };
  }

  const occurrence = new Map();
  const repeatableSections = new Set(["education", "work", "project", "campus", "awards", "certifications", "languages"]);
  const anchorKeys = {
    education: "education.school",
    work: "work.company",
    project: "project.name",
    campus: "campus.title",
    awards: "awards.title",
    certifications: "certifications.title",
    languages: "languages.title",
  };
  const sectionsWithAnchors = new Set(
    plans
      .filter((plan) => plan.matchedDefinition && anchorKeys[plan.matchedDefinition.section] === plan.matchedDefinition.key)
      .map((plan) => plan.matchedDefinition.section),
  );
  const currentRecordBySection = new Map();
  const nextRecordBySection = new Map();
  const lastMatchedKeyBySection = new Map();
  const recordNumberMaps = new Map();
  const recordContainerMaps = new Map();

  for (const section of repeatableSections) {
    const containers = [];
    for (const plan of plans) {
      if (plan.matchedDefinition?.section === section && plan.recordContainer && !containers.includes(plan.recordContainer)) {
        containers.push(plan.recordContainer);
      }
    }
    if (containers.length) recordContainerMaps.set(section, new Map(containers.map((container, index) => [container, index])));

    const recordNumbers = [...new Set(plans
      .filter((plan) => plan.matchedDefinition?.section === section && Number.isInteger(plan.explicitRecordNumber))
      .map((plan) => plan.explicitRecordNumber))]
      .sort((left, right) => left - right);
    if (recordNumbers.length) recordNumberMaps.set(section, new Map(recordNumbers.map((number, index) => [number, index])));
  }
  const unmatchedLabels = [];
  let filled = 0;
  let preserved = 0;
  let empty = 0;
  let matched = 0;
  let manual = aiOnly ? 0 : document.querySelectorAll("input[type='file']").length;

  function rememberUnmatched(signals) {
    const label = signals.visible.find(Boolean) || signals.attributes.find(Boolean);
    const cleanLabel = String(label || "").replace(/\s+/g, " ").trim().slice(0, 48);
    if (cleanLabel && !unmatchedLabels.includes(cleanLabel)) unmatchedLabels.push(cleanLabel);
  }

  for (const plan of plans) {
    const { element, signals, fieldKey, matchedDefinition, bestScore, sensitive, recordContainer, explicitRecordNumber } = plan;
    if (aiOnly && !aiFieldMappings[fieldKey]) continue;
    if (sensitive) {
      manual += 1;
      rememberUnmatched(signals);
      continue;
    }

    if (!matchedDefinition || bestScore < 0.74) {
      manual += 1;
      rememberUnmatched(signals);
      continue;
    }

    const repeatable = repeatableSections.has(matchedDefinition.section);
    const containerRecordIndex = recordContainerMaps.get(matchedDefinition.section)?.get(recordContainer);
    const normalizedRecordIndex = recordNumberMaps.get(matchedDefinition.section)?.get(explicitRecordNumber);
    let index;
    if (repeatable && isUsableRecordIndex(normalizedRecordIndex, matchedDefinition)) {
      index = normalizedRecordIndex;
      currentRecordBySection.set(matchedDefinition.section, index);
      nextRecordBySection.set(matchedDefinition.section, Math.max(nextRecordBySection.get(matchedDefinition.section) || 0, index + 1));
    } else if (repeatable && isUsableRecordIndex(containerRecordIndex, matchedDefinition)) {
      index = containerRecordIndex;
      currentRecordBySection.set(matchedDefinition.section, index);
      nextRecordBySection.set(matchedDefinition.section, Math.max(nextRecordBySection.get(matchedDefinition.section) || 0, index + 1));
    } else if (repeatable && sectionsWithAnchors.has(matchedDefinition.section)
      && anchorKeys[matchedDefinition.section] === matchedDefinition.key) {
      const duplicateAdjacentAnchor = lastMatchedKeyBySection.get(matchedDefinition.section) === matchedDefinition.key;
      index = duplicateAdjacentAnchor
        ? currentRecordBySection.get(matchedDefinition.section) ?? 0
        : nextRecordBySection.get(matchedDefinition.section) || 0;
      if (!duplicateAdjacentAnchor) nextRecordBySection.set(matchedDefinition.section, index + 1);
      currentRecordBySection.set(matchedDefinition.section, index);
    } else if (repeatable) {
      index = takeNextOccurrenceIndex(occurrence, getRepeatableOccurrenceKey(matchedDefinition, signals));
      currentRecordBySection.set(matchedDefinition.section, index);
    } else {
      index = takeNextOccurrenceIndex(occurrence, matchedDefinition.key);
    }
    if (repeatable) lastMatchedKeyBySection.set(matchedDefinition.section, matchedDefinition.key);
    matched += 1;
    if (fillMode === "merge" && currentValue(element)) {
      preserved += 1;
      continue;
    }

    const value = repeatable ? matchedDefinition.values[index] : matchedDefinition.values[index] ?? matchedDefinition.values[0];
    if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
      empty += 1;
      manual += 1;
      rememberUnmatched(signals);
      continue;
    }
    if (await fillElement(element, value, matchedDefinition)) {
      filled += 1;
      markFilled(element, matchedDefinition.aliases[0]);
    } else {
      manual += 1;
      rememberUnmatched(signals);
    }
  }

  return { scanned: candidates.length, matched, filled, preserved, empty, manual, unmatched: unmatchedLabels.slice(0, 12) };
})();
