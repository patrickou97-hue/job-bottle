(async () => {
  const stored = await chrome.storage.local.get(["starjobResumes", "activeResumeId", "fillMode", "analysisOnly", "aiOnly", "aiFieldMappings", "aiAutofillOnly", "aiValueMappings"]);
  const resumes = Array.isArray(stored.starjobResumes) ? stored.starjobResumes : [];
  const resume = resumes.find((item) => item.id === stored.activeResumeId) || resumes[0];
  const requestedFillMode = stored.fillMode;
  const fillMode = stored.fillMode === "overwrite" ? "overwrite" : "merge";
  const analysisOnly = stored.analysisOnly === true;
  const aiOnly = stored.aiOnly === true;
  const aiFieldMappings = stored.aiFieldMappings && typeof stored.aiFieldMappings === "object" ? stored.aiFieldMappings : {};
  const aiAutofillOnly = stored.aiAutofillOnly === true;
  const aiValueMappings = stored.aiValueMappings && typeof stored.aiValueMappings === "object" ? stored.aiValueMappings : {};

  if (!resume?.content) {
    return { scanned: 0, filled: 0, preserved: 0, manual: 0, error: "missing_resume" };
  }

  const normalize = (value) => String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\-_./\\:：,，()（）\[\]【】{}<>《》?？*]+/g, "");
  const asText = (value) => Array.isArray(value) ? value.filter(Boolean).join("；") : String(value ?? "").trim();
  const joinBullets = (value) => Array.isArray(value) ? value.filter(Boolean).join("\n") : "";
  function getOpenRoots(root = document) {
    const roots = [root];
    for (let index = 0; index < roots.length; index += 1) {
      const current = roots[index];
      for (const node of current.querySelectorAll?.("*") || []) {
        if (node.shadowRoot && !roots.includes(node.shadowRoot)) roots.push(node.shadowRoot);
      }
    }
    return roots;
  }
  const queryAllRoots = (selector) => getOpenRoots().flatMap((root) => Array.from(root.querySelectorAll?.(selector) || []));
  const content = resume.content;
  const basics = content.basics || {};
  const education = Array.isArray(content.education) ? content.education : [];
  const work = Array.isArray(content.work) ? content.work : [];
  const projects = Array.isArray(content.projects) ? content.projects : [];
  const campus = Array.isArray(content.campus) ? content.campus : [];
  const awards = Array.isArray(content.awards) ? content.awards : [];
  const certifications = Array.isArray(content.certifications) ? content.certifications : [];
  const languages = Array.isArray(content.languages) ? content.languages : [];

  const internshipTitlePattern = /实习|intern(?:ship)?|trainee|暑期|summer analyst|off[- ]?cycle/i;
  const isInternshipEntry = (item) => item?.experienceType === "internship"
    || (item?.experienceType !== "employment" && internshipTitlePattern.test(`${item?.title || ""}`));
  const internshipWork = work.filter(isInternshipEntry);
  const employmentWork = work.filter((item) => !isInternshipEntry(item));
  const getWorkEntries = (scope) => {
    if (scope === "internship") return internshipWork.length ? internshipWork : work;
    if (scope === "employment") return employmentWork;
    return work;
  };
  const workValues = (property, transform = (value) => value) => ({
    default: work.map((item) => transform(item?.[property], item)),
    internship: getWorkEntries("internship").map((item) => transform(item?.[property], item)),
    employment: getWorkEntries("employment").map((item) => transform(item?.[property], item)),
  });
  const calculateAge = (birthDate) => {
    const match = asText(birthDate).match(/^((?:19|20)\d{2})[^0-9]?([01]?\d)?[^0-9]?([0-3]?\d)?/);
    if (!match) return "";
    const birthYear = Number(match[1]);
    const birthMonth = Math.max(1, Math.min(12, Number(match[2] || 1)));
    const birthDay = Math.max(1, Math.min(31, Number(match[3] || 1)));
    const today = new Date();
    let age = today.getFullYear() - birthYear;
    if (today.getMonth() + 1 < birthMonth || (today.getMonth() + 1 === birthMonth && today.getDate() < birthDay)) age -= 1;
    return age >= 14 && age <= 100 ? String(age) : "";
  };

  const definitions = [
    { key: "basics.name", section: "basic", aliases: ["姓名", "中文姓名", "真实姓名", "name", "fullname", "legalname", "applicantname", "candidatename"], values: [basics.name] },
    { key: "basics.englishName", section: "basic", aliases: ["英文名", "英文姓名", "englishname", "preferredname"], values: [basics.englishName] },
    { key: "basics.birthDate", section: "basic", aliases: ["出生日期", "出生年月", "生日", "birthdate", "dateofbirth", "dob"], values: [basics.birthDate], date: true },
    { key: "basics.age", section: "basic", aliases: ["年龄", "周岁", "age"], values: [calculateAge(basics.birthDate)], localExact: true, localDerived: true },
    { key: "basics.gender", section: "basic", aliases: ["性别", "gender", "sex"], values: [basics.gender] },
    { key: "basics.nationality", section: "basic", aliases: ["国籍", "国籍地区", "国家地区", "nationality", "citizenship", "countryregion"], values: [basics.nationality] },
    { key: "basics.preferredLocations", section: "basic", aliases: ["期望工作地点", "意向工作地点", "期望工作城市", "工作地点偏好", "desiredworklocation", "preferredworklocation", "preferredlocations", "locationpreference"], values: [basics.preferredLocations] },
    { key: "basics.phone", section: "basic", aliases: ["手机", "手机号", "联系电话", "电话", "mobile", "mobilephone", "phonenumber", "telephone", "tel"], values: [basics.phone], types: ["tel"] },
    { key: "basics.email", section: "basic", aliases: ["邮箱", "电子邮箱", "邮件地址", "email", "emailaddress"], values: [basics.email], types: ["email"] },
    { key: "basics.city", section: "basic", aliases: ["所在城市", "所在地点", "所在地", "当前城市", "当前所在地", "居住城市", "现居地", "城市", "currentcity", "currentlocation", "city", "location"], values: [basics.city] },
    { key: "basics.linkedin", section: "basic", aliases: ["领英", "linkedin", "linkedinurl", "linkedinprofile"], values: [basics.linkedin], types: ["url"] },
    { key: "basics.github", section: "basic", aliases: ["github", "githuburl", "githubprofile", "代码仓库"], values: [basics.github], types: ["url"] },
    { key: "basics.website", section: "basic", aliases: ["个人网站", "作品集", "作品链接", "作品网址", "portfolio", "portfoliolink", "personalwebsite", "websiteurl"], values: [basics.website], types: ["url"] },
    { key: "basics.targetRole", section: "basic", aliases: ["目标岗位", "求职意向", "应聘职位", "申请职位", "targetrole", "desiredposition", "positionapplied"], values: [basics.targetRole || resume.targetRole] },

    { key: "education.school", section: "education", aliases: ["学校", "学校名称", "院校", "毕业院校", "大学", "school", "schoolname", "university", "college", "institution"], values: education.map((item) => item.school) },
    { key: "education.degree", section: "education", aliases: ["学历", "学位", "degree", "educationlevel", "highestdegree"], values: education.map((item) => item.degree) },
    { key: "education.major", section: "education", aliases: ["专业", "主修专业", "major", "fieldofstudy", "discipline"], values: education.map((item) => item.major) },
    { key: "education.startDate", section: "education", aliases: ["入学时间", "教育开始时间", "入学日期", "入学年份", "入学月份", "educationstartdate", "schoolstartdate", "startdate", "startyear", "startmonth"], values: education.map((item) => item.startDate), date: true },
    { key: "education.endDate", section: "education", aliases: ["毕业时间", "预计毕业时间", "教育结束时间", "毕业日期", "毕业年份", "毕业月份", "educationenddate", "graduationdate", "enddate", "endyear", "endmonth"], values: education.map((item) => item.endDate), date: true },
    { key: "education.gpa", section: "education", aliases: ["gpa", "绩点", "平均绩点", "gradepointaverage"], values: education.map((item) => item.gpa) },
    { key: "education.courses", section: "education", aliases: ["主修课程", "相关课程", "核心课程", "courses", "coursework", "relevantcourses"], values: education.map((item) => item.courses) },
    { key: "education.honors", section: "education", aliases: ["在校荣誉", "教育荣誉", "奖学金", "honors", "academichonors"], values: education.map((item) => item.honors) },
    { key: "education.description", section: "education", aliases: ["教育经历描述", "教育描述", "经历描述", "教育背景描述", "educationdescription", "academicdescription"], values: education.map((item) => [item.courses, item.honors].filter(Boolean).join("\n")), multiline: true },

    { key: "work.none", section: "work", aliases: ["没有工作经历", "无工作经历", "暂无工作经历", "noworkexperience", "noemploymenthistory"], values: [employmentWork.length === 0], checkbox: true, localExact: true, localDerived: true, repeatable: false },
    { key: "work.company", section: "work", aliases: ["公司", "公司名称", "单位名称", "雇主", "company", "companyname", "employer", "organization"], values: workValues("company").default, valuesByScope: workValues("company") },
    { key: "work.title", section: "work", aliases: ["职位", "岗位", "岗位名称", "职务", "职位名称", "jobtitle", "position", "role", "title"], values: workValues("title").default, valuesByScope: workValues("title") },
    { key: "work.location", section: "work", aliases: ["工作地点", "实习地点", "公司地点", "worklocation", "joblocation", "companylocation"], values: workValues("location").default, valuesByScope: workValues("location") },
    { key: "work.startDate", section: "work", aliases: ["开始日期", "开始时间", "开始年份", "开始月份", "工作开始日期", "工作开始时间", "实习开始时间", "任职开始时间", "workstartdate", "employmentstartdate", "startdate", "startyear", "startmonth"], values: workValues("startDate").default, valuesByScope: workValues("startDate"), date: true },
    { key: "work.endDate", section: "work", aliases: ["结束日期", "结束时间", "结束年份", "结束月份", "工作结束日期", "工作结束时间", "实习结束时间", "离职时间", "workenddate", "employmentenddate", "enddate", "endyear", "endmonth"], values: workValues("endDate").default, valuesByScope: workValues("endDate"), date: true },
    { key: "work.current", section: "work", aliases: ["至今", "仍在职", "当前任职", "currentlyworkhere", "currentposition", "present"], values: workValues("current", (value) => Boolean(value)).default, valuesByScope: workValues("current", (value) => Boolean(value)), checkbox: true },
    { key: "work.description", section: "work", aliases: ["经历描述", "工作描述", "工作内容", "工作职责", "职责描述", "工作职责描述", "岗位职责", "岗位描述", "实习描述", "实习内容", "主要职责", "主要工作", "主要工作内容", "工作业绩", "工作成果", "职责及业绩", "描述", "workdescription", "jobdescription", "responsibilities", "responsibility", "duties", "duty", "achievements", "description"], values: workValues("bullets", (value) => joinBullets(value)).default, valuesByScope: workValues("bullets", (value) => joinBullets(value)), multiline: true },

    { key: "project.name", section: "project", aliases: ["项目名称", "项目名", "projectname", "projecttitle"], values: projects.map((item) => item.name) },
    { key: "project.role", section: "project", aliases: ["项目角色", "担任角色", "项目职务", "projectrole", "roleinproject"], values: projects.map((item) => item.role) },
    { key: "project.url", section: "project", aliases: ["项目链接", "项目网址", "projectlink", "projecturl"], values: projects.map((item) => item.url), types: ["url"] },
    { key: "project.startDate", section: "project", aliases: ["项目开始时间", "项目开始日期", "开始年份", "开始月份", "projectstartdate", "startdate", "startyear", "startmonth"], values: projects.map((item) => item.startDate), date: true },
    { key: "project.endDate", section: "project", aliases: ["项目结束时间", "项目结束日期", "结束年份", "结束月份", "projectenddate", "enddate", "endyear", "endmonth"], values: projects.map((item) => item.endDate), date: true },
    { key: "project.description", section: "project", aliases: ["项目描述", "项目内容", "项目职责", "项目成果", "项目业绩", "项目详情", "项目介绍", "项目经历", "项目经历描述", "负责内容", "主要内容", "个人贡献", "职责描述", "经历描述", "描述", "projectdescription", "projectdetails", "projectresponsibilities", "projectduties", "projectachievements", "responsibilities", "responsibility", "duties", "duty", "achievements", "contribution", "description"], values: projects.map((item) => joinBullets(item.bullets)), multiline: true },
    { key: "project.keywords", section: "project", aliases: ["项目关键词", "项目技能", "技术栈", "projectskills", "technologies", "techstack"], values: projects.map((item) => item.keywords) },

    { key: "skills", section: "skills", aliases: ["技能", "专业技能", "技能特长", "skills", "technicalskills", "competencies"], values: [(content.skills || []).flatMap((group) => group.skills || []).filter(Boolean).join("、")], multiline: true },
    { key: "campus.title", section: "campus", aliases: ["校园经历名称", "学生工作名称", "社团名称", "活动名称", "campustitle", "activityname"], values: campus.map((item) => item.title) },
    { key: "campus.role", section: "campus", aliases: ["校园角色", "担任职务", "社团职务", "活动角色", "campusrole", "activityrole"], values: campus.map((item) => item.role) },
    { key: "campus.date", section: "campus", aliases: ["校园经历时间", "活动时间", "任职时间", "campusdate", "activitydate"], values: campus.map((item) => item.date), date: true },
    { key: "campus.description", section: "campus", aliases: ["校园经历描述", "学生工作描述", "社团描述", "活动描述", "经历描述", "描述", "campusdescription", "activitydescription"], values: campus.map((item) => joinBullets(item.bullets)), multiline: true },
    { key: "awards.title", section: "awards", aliases: ["获奖名称", "奖项名称", "荣誉名称", "奖项", "获奖经历", "awardname", "awardtitle", "honortitle"], values: awards.map((item) => item.title) },
    { key: "awards.date", section: "awards", aliases: ["获奖时间", "奖项时间", "获奖日期", "awarddate", "awardyear"], values: awards.map((item) => item.date), date: true },
    { key: "awards.description", section: "awards", aliases: ["获奖描述", "奖项描述", "荣誉描述", "描述", "awarddescription", "honordescription"], values: awards.map((item) => joinBullets(item.bullets)), multiline: true },
    { key: "certifications.title", section: "certifications", aliases: ["证书", "证书名称", "资格证书", "认证名称", "certification", "certificationname", "license"], values: certifications.map((item) => item.title) },
    { key: "certifications.date", section: "certifications", aliases: ["获证时间", "获证日期", "证书时间", "证书日期", "发证日期", "认证时间", "认证日期", "certificationdate", "licensedate"], values: certifications.map((item) => item.date), date: true },
    { key: "certifications.details", section: "certifications", aliases: ["证书描述", "认证描述", "成绩", "分数", "等级", "certificationdetails", "score", "grade"], values: certifications.map((item) => joinBullets(item.bullets)) },
    { key: "languages.title", section: "languages", aliases: ["语言", "语言名称", "外语名称", "语种", "languagename"], values: languages.map((item) => item.title) },
    { key: "languages.details", section: "languages", aliases: ["语言能力", "外语能力", "语言水平", "精通程度", "熟练程度", "languageproficiency"], values: languages.map((item) => [item.role, joinBullets(item.bullets)].filter(Boolean).join("；")), multiline: true },
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
  const sensitiveTerms = ["身份证", "身份证号", "idcard", "nationalid", "护照", "passport", "出生地", "birthplace", "婚姻", "marital", "民族", "ethnicity", "户籍", "残疾", "disability", "退伍", "veteran", "薪资", "salary", "期望薪资", "政治面貌", "宗教", "religion", "家庭成员", "验证码", "captcha", "密码", "password", "安全问题", "securityquestion"];
  const birthDateTerms = ["出生日期", "出生年月", "生日", "birthdate", "dateofbirth"];
  const blockedChoiceTerms = ["同意", "协议", "声明", "承诺", "consent", "privacy", "terms"];
  const autocompleteMap = {
    name: "basics.name",
    "given-name": "basics.name",
    email: "basics.email",
    tel: "basics.phone",
    "tel-national": "basics.phone",
    "address-level2": "basics.city",
    bday: "basics.birthDate",
    organization: "work.company",
    "organization-title": "work.title",
  };

  const structuredListSections = {
    recruiteducationlist: "education",
    educationlist: "education",
    educations: "education",
    recruitworkinglist: "work",
    workinglist: "work",
    worklist: "work",
    workexperiencelist: "work",
    employmentlist: "work",
    recruitprojectlist: "project",
    projectlist: "project",
    projects: "project",
    recruitcampuslist: "campus",
    campuslist: "campus",
    recruitawardlist: "awards",
    awardlist: "awards",
    recruitcertificatelist: "certifications",
    certificatelist: "certifications",
    recruitlanguagelist: "languages",
    languagelist: "languages",
  };
  const structuredProperties = {
    education: {
      school: "school", schoolname: "school", collegename: "school", universityname: "school",
      degree: "degree", highestdegree: "degree", educationlevel: "degree",
      major: "major", majorname: "major", fieldofstudy: "major",
      startdate: "startDate", enddate: "endDate", graduationdate: "endDate",
      gpa: "gpa", courses: "courses", coursework: "courses", honors: "honors",
      description: "description",
    },
    work: {
      company: "company", companyname: "company", employer: "company", employername: "company",
      title: "title", jobtitle: "title", position: "title", positionname: "title",
      location: "location", worklocation: "location",
      startdate: "startDate", enddate: "endDate", current: "current", iscurrent: "current",
      description: "description", jobdescription: "description", responsibilities: "description",
    },
    project: {
      name: "name", projectname: "name", title: "name", projecttitle: "name",
      role: "role", projectrole: "role", url: "url", projecturl: "url", projectlink: "url", startdate: "startDate", enddate: "endDate",
      description: "description", projectdescription: "description", keywords: "keywords",
    },
    campus: { title: "title", role: "role", date: "date", description: "description" },
    awards: { title: "title", role: "role", date: "date", description: "description" },
    certifications: { title: "title", role: "role", date: "date", details: "details", score: "details" },
    languages: { title: "title", role: "details", details: "details", level: "details" },
  };

  function inferStructuredFieldContract(element) {
    const identifiers = [
      element.id,
      element.getAttribute("name") || "",
      element.getAttribute("data-testid") || "",
      element.getAttribute("data-field") || "",
    ].filter(Boolean);
    for (const identifier of identifiers) {
      const normalizedIdentifier = String(identifier).replace(/[\[\].:\-/]+/g, "_");
      const match = normalizedIdentifier.match(/(?:^|_)(recruiteducationlist|educationlist|educations|recruitworkinglist|workinglist|worklist|workexperiencelist|employmentlist|recruitprojectlist|projectlist|projects|recruitcampuslist|campuslist|recruitawardlist|awardlist|recruitcertificatelist|certificatelist|recruitlanguagelist|languagelist)_(\d+)_([a-z0-9]+)(?:_|$)/i);
      if (!match) continue;
      const section = structuredListSections[match[1].toLowerCase()];
      const property = structuredProperties[section]?.[match[3].toLowerCase()];
      const recordIndex = Number(match[2]);
      if (section && property && Number.isInteger(recordIndex)) {
        return { section, property, key: `${section}.${property}`, recordIndex };
      }
    }
    return null;
  }

  function getFieldSignals(element) {
    const visible = [];
    const attributes = [];
    const labelCandidates = [];
    const addCandidate = (value, source, confidence) => {
      const text = String(value || "").replace(/\s+/g, " ").trim().slice(0, 180);
      if (!text || text.length > 180 || labelCandidates.some((candidate) => normalize(candidate.text) === normalize(text))) return;
      labelCandidates.push({ text, source, confidence });
      visible.push(text);
    };
    if (element.labels) Array.from(element.labels).forEach((label) => addCandidate(label.textContent, "label", 1));
    addCandidate(element.getAttribute("aria-label"), "aria-label", 0.98);
    const labelledBy = element.getAttribute("aria-labelledby");
    if (labelledBy) {
      labelledBy.split(/\s+/).forEach((id) => addCandidate(document.getElementById(id)?.textContent, "aria-labelledby", 0.99));
    }
    addCandidate(element.getAttribute("placeholder"), "placeholder", 0.72);
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
          addCandidate(nearbyLabels[0], "nearby", 0.68);
          break;
        }
      }
    }
    if (!visible.length) {
      const fieldset = element.closest("fieldset");
      addCandidate(fieldset?.querySelector(":scope > legend")?.textContent, "legend", 0.95);
    }
    attributes.push(element.getAttribute("name") || "");
    attributes.push(element.id || "");
    attributes.push(element.getAttribute("data-testid") || "");
    attributes.push(element.getAttribute("data-field") || "");
    attributes.push(element.getAttribute("autocomplete") || "");
    attributes.push(element.getAttribute("role") || "");
    return {
      visible: visible.filter(Boolean).map((value) => String(value).slice(0, 180)),
      attributes: attributes.filter(Boolean).map((value) => String(value).slice(0, 180)),
      labelCandidates: labelCandidates.slice(0, 12),
    };
  }

  function getAccessibleName(element, signals = getFieldSignals(element)) {
    return signals.labelCandidates?.[0]?.text
      || element.getAttribute("aria-label")
      || element.getAttribute("name")
      || element.id
      || "";
  }

  function getSectionPath(element) {
    const path = [];
    let current = element.parentElement;
    for (let depth = 0; current && depth < 8; depth += 1, current = current.parentElement) {
      const heading = current.querySelector(":scope > legend, :scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > [role='heading'], :scope > [data-section-title]");
      const value = heading?.textContent || current.getAttribute("data-section") || current.getAttribute("aria-label") || "";
      const text = String(value).replace(/\s+/g, " ").trim();
      if (text && text.length <= 120 && !path.some((item) => normalize(item) === normalize(text))) path.unshift(text);
    }
    return path.slice(-4);
  }

  function getNearbyText(element) {
    const values = [];
    let current = element;
    for (let depth = 0; current && depth < 3; depth += 1, current = current.parentElement) {
      const siblings = Array.from(current.parentElement?.children || [])
        .filter((node) => node !== current && node instanceof HTMLElement)
        .slice(0, 8);
      siblings.forEach((node) => {
        if (node.querySelector?.("input, textarea, select, [role='textbox'], [role='combobox']")) return;
        const text = (node.innerText || node.textContent || "").replace(/\s+/g, " ").trim();
        if (text && text.length <= 180 && !values.includes(text)) values.push(text);
      });
      if (values.length >= 4) break;
    }
    return values.slice(0, 6);
  }

  function getFieldDescription(element) {
    const describedBy = element.getAttribute("aria-describedby") || "";
    return describedBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent || "")
      .join(" ").replace(/\s+/g, " ").trim().slice(0, 240);
  }

  function getControlType(element) {
    const role = (element.getAttribute("role") || "").toLowerCase();
    if (element instanceof HTMLSelectElement) return "native_select";
    if (element instanceof HTMLTextAreaElement) return "native_textarea";
    if (element instanceof HTMLInputElement) {
      if (element.type === "radio" || role === "radio") return "native_radio";
      if (element.type === "checkbox" || role === "checkbox" || role === "switch") return "native_checkbox";
      return "native_input";
    }
    if (element.isContentEditable) return "contenteditable";
    return "custom_control";
  }

  function getInteractionType(element) {
    const role = (element.getAttribute("role") || "").toLowerCase();
    const popup = element.getAttribute("aria-haspopup") || "";
    if (element instanceof HTMLSelectElement) return "native_select";
    if (element instanceof HTMLInputElement && ["date", "month", "datetime-local"].includes(element.type)) return "date_input";
    if (role === "combobox" || popup === "listbox" || element.hasAttribute("data-starjob-search-select")) {
      return element instanceof HTMLInputElement && !element.readOnly ? "search_select" : "click_select";
    }
    if (role === "radio" || (element instanceof HTMLInputElement && element.type === "radio")) return "radio_group";
    if (role === "checkbox" || role === "switch" || (element instanceof HTMLInputElement && element.type === "checkbox")) return "checkbox_group";
    if (element instanceof HTMLTextAreaElement || element.isContentEditable) return "textarea";
    if (element instanceof HTMLInputElement && isLikelyDateControl(element)) return "date_picker";
    if (element instanceof HTMLInputElement || role === "textbox" || role === "spinbutton") return "text";
    return popup ? "click_select" : "unknown";
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
    if (/证书名称|资格证书|认证名称|发证日期|获证日期|certificationname|certificationdate|licensedate/.test(text)) return "certifications";
    if (/证书|认证|certificate|certification|license/.test(text)) return "certifications";
    if (/语言名称|外语名称|语种|languagename/.test(text)) return "languages";
    return null;
  }

  function inferSectionHint(element, signals, contextText) {
    const ownSignals = normalize(`${signals.visible.join(" ")} ${signals.attributes.join(" ")}`);
    if (/出生日期|出生年月|生日|birthdate|dateofbirth|dob|中文姓名|真实姓名|fullname|邮箱|emailaddress|手机号码|联系电话|phonenumber/.test(ownSignals)) return "basic";
    if (/自我描述|自我评价|个人总结|个人优势|个人简介|个人概述|selfdescription|selfsummary|personalsummary|profilesummary/.test(ownSignals)) return null;
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

  function inferWorkScope(element, sectionHint, contextText) {
    if (sectionHint !== "work") return null;
    const detect = (value) => {
      const text = normalize(value);
      if (/实习经历|实习经验|internshipexperience|internexperience/.test(text)) return "internship";
      if (/正式工作|全职工作|任职经历|职业经历|fulltimeexperience|employmenthistory/.test(text)) return "employment";
      return null;
    };
    const direct = detect(contextText);
    if (direct) return direct;
    let container = element.parentElement;
    for (let depth = 0; container && depth < 9; depth += 1, container = container.parentElement) {
      const explicit = container.getAttribute("data-experience-type") || container.getAttribute("data-work-type") || "";
      const heading = Array.from(container.children)
        .filter((child) => child.matches("legend, h1, h2, h3, h4, h5, [role='heading'], .section-title, .form-section-title"))
        .map((child) => child.textContent || "")
        .join(" ");
      const scope = detect(`${explicit} ${heading}`);
      if (scope) return scope;
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
    const ownDescriptor = normalize([
      element.getAttribute("name") || "",
      element.id || "",
      element.getAttribute("aria-label") || "",
      element.getAttribute("placeholder") || "",
      element.labels?.[0]?.textContent || "",
    ].join(" "));
    if (/开始|起始|入学|start/.test(ownDescriptor)) return `${sectionHint}.startDate`;
    if (/结束|截止|离职|毕业|end|finish/.test(ownDescriptor)) return `${sectionHint}.endDate`;
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
    if (!(element instanceof HTMLInputElement)) return false;
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

  function getRadioGroupElements(element) {
    if (!(element instanceof HTMLInputElement) || element.type !== "radio") return [];
    if (!element.name) return [element];
    return queryAllRoots("input[type='radio']")
      .filter((radio) => radio instanceof HTMLInputElement
        && radio.name === element.name
        && radio.form === element.form
        && !radio.disabled
        && isVisible(radio));
  }

  function getChoiceOptionLabel(element) {
    if (!(element instanceof HTMLInputElement)) return "";
    return (element.labels?.[0]?.innerText
      || element.getAttribute("aria-label")
      || element.value
      || "").replace(/\s+/g, " ").trim();
  }

  function getChoiceOptions(element) {
    if (element instanceof HTMLSelectElement) {
      return Array.from(element.options)
        .filter((option) => !option.disabled && (option.value.trim() || option.textContent?.trim()))
        .slice(0, 40)
        .map((option) => ({
          value: option.value.trim().slice(0, 120),
          text: (option.textContent || "").replace(/\s+/g, " ").trim().slice(0, 120),
        }));
    }
    const nativeOptions = getRadioGroupElements(element).slice(0, 40).map((radio) => ({
      value: radio.value.trim().slice(0, 120),
      text: getChoiceOptionLabel(radio).slice(0, 120),
    }));
    if (nativeOptions.length) return nativeOptions;
    const referencedIds = `${element.getAttribute("aria-controls") || ""} ${element.getAttribute("aria-owns") || ""}`.trim().split(/\s+/).filter(Boolean);
    const roots = referencedIds.map((id) => queryAllRoots(`[id="${CSS.escape(id)}"]`)[0]).filter(Boolean);
    if (element.getAttribute("aria-expanded") === "true") roots.push(element.parentElement);
    const options = roots.flatMap((root) => Array.from(root?.querySelectorAll?.("[role='option'], [role='treeitem'], [data-value], [data-option-value]") || []))
      .filter((option) => option instanceof HTMLElement && isVisible(option))
      .slice(0, 40)
      .map((option) => ({
        value: (option.getAttribute("data-value") || option.getAttribute("data-option-value") || option.textContent || "").trim().slice(0, 120),
        text: (option.textContent || option.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 120),
      }));
    return options;
  }

  function getChoiceQuestion(element) {
    const role = (element.getAttribute("role") || "").toLowerCase();
    if (!((element instanceof HTMLInputElement && element.type === "radio") || role === "radio" || role === "checkbox" || role === "switch")) return "";
    const fieldset = element.closest("fieldset");
    const legend = fieldset?.querySelector(":scope > legend");
    if (legend?.textContent?.trim()) return legend.textContent.replace(/\s+/g, " ").trim().slice(0, 120);
    const group = element.closest("[role='radiogroup'], [role='group'], [data-field], .form-item, .ant-form-item, .el-form-item");
    const heading = group?.querySelector("legend, [data-label], .form-label, .ant-form-item-label, .el-form-item__label");
    return (heading?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 120);
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

  function inferDatePart(element, signals) {
    const descriptor = normalize([
      ...signals.visible,
      ...signals.attributes,
      element.getAttribute("aria-label") || "",
      element.getAttribute("placeholder") || "",
    ].join(" "));
    if (/开始年份|起始年份|入学年份|毕业年份|结束年份|离职年份|startyear|endyear/i.test(descriptor)) return "year";
    if (/开始月份|起始月份|入学月份|毕业月份|结束月份|离职月份|startmonth|endmonth/i.test(descriptor)) return "month";
    if (/开始日(?!期)|起始日(?!期)|入学日(?!期)|毕业日(?!期)|结束日(?!期)|离职日(?!期)|startday|endday/i.test(descriptor)) return "day";
    return null;
  }

  function valueForDatePart(rawValue, datePart, element) {
    if (!datePart) return formatDate(rawValue, element);
    const parts = parseDateParts(rawValue);
    if (!parts) return "";
    if (datePart === "year") return String(parts.year);
    if (datePart === "month") return String(parts.month).padStart(2, "0");
    if (datePart === "day") return String(parts.day || 1).padStart(2, "0");
    return formatDate(rawValue, element);
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
    dispatchInput(element);
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.dispatchEvent(new Event("blur", { bubbles: true }));
  }

  function dispatchInput(element) {
    element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
  }

  function dispatchActivation(element) {
    element.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse" }));
    element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    element.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerType: "mouse" }));
    element.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }

  const wait = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

  function isDynamicControl(element) {
    const role = (element.getAttribute("role") || "").toLowerCase();
    return role === "combobox"
      || element.hasAttribute("aria-haspopup")
      || element.hasAttribute("aria-controls")
      || element.hasAttribute("data-starjob-control")
      || element.hasAttribute("data-starjob-search-select");
  }

  function visibleDynamicOptions(root = document) {
    const nodes = Array.from(root.querySelectorAll?.("[role='option'], [role='treeitem'], [role='menuitem'], [role='gridcell'], [data-value], [data-option-value], [class*='select-option'], [class*='dropdown-option']") || [])
      .filter((node) => node instanceof HTMLElement && isVisible(node) && !node.getAttribute("aria-disabled"));
    return [...new Set(nodes)];
  }

  function findDynamicPopup(control, beforeNodes = new Set()) {
    const referenced = `${control.getAttribute("aria-controls") || ""} ${control.getAttribute("aria-owns") || ""}`
      .split(/\s+/).filter(Boolean).map((id) => document.getElementById(id)).filter((node) => node instanceof HTMLElement);
    const candidates = [
      ...referenced,
      ...Array.from(document.querySelectorAll("[role='listbox'], [role='menu'], [role='tree'], [role='dialog'], [data-radix-popper-content-wrapper], [class*='dropdown'], [class*='select-dropdown'], [class*='popover']")),
    ].filter((node) => node instanceof HTMLElement && isVisible(node));
    const fresh = candidates.filter((node) => !beforeNodes.has(node) && visibleDynamicOptions(node).length);
    return referenced.find((node) => visibleDynamicOptions(node).length) || fresh.at(-1) || candidates.find((node) => visibleDynamicOptions(node).length) || null;
  }

  async function waitForDynamicOptions(control, beforeNodes = new Set(), timeout = 1_200) {
    const startedAt = Date.now();
    const immediate = findDynamicPopup(control, beforeNodes);
    if (immediate) return immediate;
    return new Promise((resolve) => {
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        observer.disconnect();
        window.clearInterval(poller);
        resolve(value);
      };
      const check = () => {
        const popup = findDynamicPopup(control, beforeNodes);
        if (popup || Date.now() - startedAt >= timeout) finish(popup);
      };
      const observer = new MutationObserver(check);
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true });
      const poller = window.setInterval(check, 48);
      check();
    });
  }

  function optionText(option) {
    return [
      option.getAttribute("data-value") || "",
      option.getAttribute("data-option-value") || "",
      option.getAttribute("aria-label") || "",
      option.textContent || "",
    ].join(" ").replace(/\s+/g, " ").trim();
  }

  function resolveDynamicOption(options, rawValue, optionMatch) {
    const target = normalize(optionMatch?.targetText || rawValue);
    if (!target) return null;
    const exact = options.filter((option) => [option.getAttribute("data-value"), option.getAttribute("data-option-value"), option.textContent, option.getAttribute("aria-label")]
      .filter(Boolean).some((value) => normalize(value) === target));
    if (exact.length === 1) return exact[0];
    const strong = options.filter((option) => {
      const normalized = normalize(optionText(option));
      return normalized === target || (normalized.length > 2 && (normalized.includes(target) || target.includes(normalized)));
    });
    return strong.length === 1 ? strong[0] : null;
  }

  async function fillDynamicControl(element, rawValue, definition = {}) {
    const beforeNodes = new Set(Array.from(document.querySelectorAll("[role='listbox'], [role='menu'], [role='tree'], [role='dialog'], [class*='dropdown'], [class*='popover']")));
    element.focus?.();
    dispatchActivation(element);
    await wait(16);
    if (element instanceof HTMLInputElement && !element.readOnly) {
      setNativeValue(element, asText(rawValue));
      dispatchInput(element);
    }
    const popup = await waitForDynamicOptions(element, beforeNodes);
    if (!popup) return false;
    const option = resolveDynamicOption(visibleDynamicOptions(popup), rawValue, definition.optionMatch);
    if (!option) return false;
    dispatchActivation(option);
    await wait(40);
    const expected = normalize(optionText(option) || rawValue);
    const actual = normalize(currentValue(element) || element.getAttribute("aria-label") || element.textContent || "");
    const activeId = element.getAttribute("aria-activedescendant");
    return Boolean(option.getAttribute("aria-selected") === "true" || activeId === option.id || (expected && actual && (actual === expected || actual.includes(expected) || expected.includes(actual))));
  }

  async function verifyReadback(element, expected, options = {}) {
    await wait(24);
    if (options.date) return dateValuesEquivalent(expected, currentValue(element));
    if (options.checkbox) return Boolean(element.checked) === Boolean(expected);
    const expectedText = normalize(expected);
    const actualText = normalize(currentValue(element) || element.getAttribute("aria-label") || "");
    return Boolean(expectedText && actualText && (actualText === expectedText || actualText.includes(expectedText) || expectedText.includes(actualText)));
  }

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

  function dateValuesEquivalent(expectedValue, actualValue) {
    const expectedText = asText(expectedValue);
    const actualText = asText(actualValue);
    const expected = parseDateParts(expectedText);
    const actual = parseDateParts(actualText);
    if (!expected || !actual || expected.year !== actual.year || expected.month !== actual.month) return false;
    const expectedHasDay = /(?:19|20)\d{2}[^0-9]+[01]?\d[^0-9]+[0-3]?\d/.test(expectedText);
    return !expectedHasDay || expected.day === actual.day;
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

    let yearSteps = Math.min(150, Math.abs(target.year - current.year));
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
    return dateValuesEquivalent(rawValue, currentValue(element));
  }

  async function fillElement(element, rawValue, definition) {
    const value = definition.date ? valueForDatePart(rawValue, definition.datePart, element) : asText(rawValue);
    if (definition.checkbox && element instanceof HTMLInputElement && element.type === "checkbox") {
      if (rawValue === undefined || rawValue === null || rawValue === "") return false;
      element.checked = rawValue === true || /^(true|1|yes|y|是|至今|仍在职)$/i.test(String(rawValue));
      dispatchEvents(element);
      return verifyReadback(element, element.checked, { checkbox: true });
    }
    if (!value) return false;

    // Readonly ATS date pickers are also comboboxes. Date resolution must run
    // before the generic dynamic-select state machine or a month/day option can
    // be selected from the wrong popup.
    if (definition.date && !definition.datePart && await tryExactDatePickerSelection(element, rawValue)) return true;

    if (isDynamicControl(element) && !(element instanceof HTMLInputElement && ["date", "month", "datetime-local"].includes(element.type))) {
      return fillDynamicControl(element, value, definition);
    }

    if (element instanceof HTMLInputElement && element.type === "radio") {
      const target = normalize(value);
      const option = getRadioGroupElements(element).find((radio) => normalize(radio.value) === target || normalize(getChoiceOptionLabel(radio)) === target);
      if (!option) return false;
      option.checked = true;
      dispatchEvents(option);
      return verifyReadback(option, value);
    }

    if (element instanceof HTMLSelectElement) {
      const rawTargets = element.multiple
        ? value.split(/[、,，;；|]/).map((item) => item.trim()).filter(Boolean)
        : [value];
      const options = Array.from(element.options);
      const matched = rawTargets.map((rawTarget) => {
        const target = normalize(rawTarget);
        return options.find((item) => normalize(item.value) === target || normalize(item.textContent) === target)
          || options.find((item) => normalize(item.textContent).includes(target) || target.includes(normalize(item.textContent)));
      }).filter(Boolean);
      if (!matched.length) return false;
      if (element.multiple) {
        const selected = new Set(matched);
        options.forEach((option) => { option.selected = selected.has(option); });
      } else {
        element.value = matched[0].value;
      }
      dispatchEvents(element);
      return verifyReadback(element, matched[0].value);
    }
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      setNativeValue(element, value);
      dispatchEvents(element);
      if (definition.date) {
        await wait(24);
        const validDateReadback = definition.datePart
          ? normalize(value) === normalize(currentValue(element))
          : dateValuesEquivalent(rawValue, currentValue(element));
        if (!validDateReadback) {
          setNativeValue(element, "");
          dispatchEvents(element);
          return false;
        }
      }
      return verifyReadback(element, value, { date: Boolean(definition.date && !definition.datePart) });
    }
    if (element instanceof HTMLElement && element.isContentEditable) {
      element.textContent = value;
      dispatchEvents(element);
      return verifyReadback(element, value);
    }
    return false;
  }

  function currentValue(element) {
    if (element instanceof HTMLInputElement && element.type === "checkbox") return element.checked ? "checked" : "";
    if (element instanceof HTMLInputElement && element.type === "radio") {
      return getRadioGroupElements(element).find((radio) => radio.checked)?.value || "";
    }
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) return element.value.trim();
    return element.textContent?.trim() || "";
  }

  function markFilled(element, label, derived = false) {
    delete element.dataset.starjobPreviouslyFilled;
    element.dataset.starjobFilled = "true";
    element.dataset.starjobAiDerived = derived ? "true" : "false";
    element.style.outline = derived
      ? "2px solid rgba(150, 96, 24, 0.78)"
      : "2px solid rgba(53, 100, 71, 0.72)";
    element.style.outlineOffset = "2px";
    element.title = derived ? `拾星 AI 派生填写：${label}` : `拾星已填写：${label}`;
  }

  function hashSemanticIdentity(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function getStableDomSignature(element) {
    const parts = [];
    let current = element;
    for (let depth = 0; current && depth < 6; depth += 1, current = current.parentElement) {
      const stable = current.getAttribute?.("data-field")
        || current.getAttribute?.("data-testid")
        || current.getAttribute?.("data-record-id")
        || current.getAttribute?.("name")
        || current.id
        || current.getAttribute?.("role")
        || current.tagName?.toLowerCase();
      if (stable) parts.unshift(String(stable).slice(0, 80));
    }
    return parts.join("/");
  }

  function createFieldKey(index, element, signals, contextText) {
    const inputType = element instanceof HTMLInputElement ? element.type : element.tagName.toLowerCase();
    const sectionPath = getSectionPath(element);
    const semanticFingerprint = [
      window.location.origin,
      window.location.pathname,
      inputType,
      element.getAttribute("role") || "",
      getAccessibleName(element, signals),
      signals.attributes.join(" "),
      sectionPath.join(" > "),
      getStableDomSignature(element),
      normalize(contextText).slice(0, 120),
      `field-ordinal:${index}`,
    ].join("|");
    // The ordinal is part of the identity on purpose. Repeated ATS cards often
    // have byte-for-byte identical markup, labels and attributes. A semantic
    // hash alone therefore aliases every "company" field to one key and the
    // last mapping silently wins. The stabilized scan guarantees the ordinal
    // is taken only after the current DOM has settled.
    const fieldId = `sj_${index}_${hashSemanticIdentity(semanticFingerprint)}`;
    element.dataset.starjobFieldId = fieldId;
    element.setAttribute("data-starjob-field-id", fieldId);
    element.dataset.starjobSemanticFingerprint = semanticFingerprint.slice(0, 900);
    return `${window.location.origin}|${window.location.pathname}|${fieldId}`;
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

  function getDefinitionValues(definition, recordScope = null) {
    return definition?.valuesByScope?.[recordScope || "default"] || definition?.values || [];
  }

  function isUsableRecordIndex(index, definition, recordScope = null) {
    return Number.isInteger(index) && index >= 0 && index < getDefinitionValues(definition, recordScope).length;
  }

  function getResumeRecord(section, recordIndex, recordScope = null) {
    if (!Number.isInteger(recordIndex)) return null;
    if (section === "education") return education[recordIndex] || null;
    if (section === "project") return projects[recordIndex] || null;
    if (section === "campus") return campus[recordIndex] || null;
    if (section === "awards") return awards[recordIndex] || null;
    if (section === "certifications") return certifications[recordIndex] || null;
    if (section === "languages") return languages[recordIndex] || null;
    if (section === "work") return getWorkEntries(recordScope)[recordIndex] || null;
    return null;
  }

  function getResumePath(section, property, recordIndex, recordScope = null) {
    if (!Number.isInteger(recordIndex) || !property) return null;
    const collection = section === "project" ? "projects" : section;
    if (section !== "work") return `${collection}[${recordIndex}].${property}`;
    const record = getResumeRecord(section, recordIndex, recordScope);
    const sourceIndex = record ? work.indexOf(record) : -1;
    return sourceIndex >= 0 ? `work[${sourceIndex}].${property}` : null;
  }

  function assignRecordIndices(plans, fields) {
    const sections = ["education", "work", "project", "campus", "awards", "certifications", "languages"];
    const anchorKeys = {
      education: "education.school",
      work: "work.company",
      project: "project.name",
      campus: "campus.title",
      awards: "awards.title",
      certifications: "certifications.title",
      languages: "languages.title",
    };
    for (const section of sections) {
      const sectionPlans = plans.filter((plan) => plan.matchedDefinition?.section === section && plan.matchedDefinition.repeatable !== false);
      const scopes = [...new Set(sectionPlans.map((plan) => plan.recordScope || "default"))];
      for (const scope of scopes) {
        const scopedPlans = sectionPlans.filter((plan) => (plan.recordScope || "default") === scope);
        const containers = [];
        for (const plan of scopedPlans) {
          const hasAnchor = plan.recordContainer && scopedPlans.some((candidate) => candidate.recordContainer === plan.recordContainer
            && candidate.matchedDefinition?.key === anchorKeys[section]);
          if (hasAnchor && !containers.includes(plan.recordContainer)) containers.push(plan.recordContainer);
        }
        const containerMap = new Map(containers.map((container, index) => [container, index]));
        const explicitNumbers = [...new Set(scopedPlans
          .map((plan) => plan.explicitRecordNumber)
          .filter((value) => Number.isInteger(value)))]
          .sort((left, right) => left - right);
        const explicitMap = new Map(explicitNumbers.map((number, index) => [number, index]));
        const fallbackOccurrences = new Map();

        for (const plan of scopedPlans) {
          let recordIndex = plan.structuredContract?.recordIndex;
          if (!Number.isInteger(recordIndex)) recordIndex = containerMap.get(plan.recordContainer);
          if (!Number.isInteger(recordIndex)) recordIndex = explicitMap.get(plan.explicitRecordNumber);
          if (!Number.isInteger(recordIndex)) {
            const occurrenceKey = plan.matchedDefinition.key;
            recordIndex = fallbackOccurrences.get(occurrenceKey) || 0;
            fallbackOccurrences.set(occurrenceKey, recordIndex + 1);
          }
          plan.recordIndex = recordIndex;
          const field = fields.find((item) => item.fieldKey === plan.fieldKey);
          const sectionId = `${section}:${scope}`;
          const pageRecordId = `${sectionId}:${recordIndex}`;
          const property = plan.matchedDefinition.key.split(".")[1] || "";
          const resumeRecord = getResumeRecord(section, recordIndex, plan.recordScope);
          plan.sectionId = sectionId;
          plan.pageRecordId = pageRecordId;
          plan.resumePath = getResumePath(section, property, recordIndex, plan.recordScope);
          plan.resumeRecordId = resumeRecord?.id || plan.resumePath?.replace(/\.[^.]+$/, "") || null;
          if (field) {
            field.recordIndex = recordIndex;
            field.sectionType = section;
            field.sectionId = sectionId;
            field.pageRecordId = pageRecordId;
            field.semanticKey = property;
            field.resumePath = plan.resumePath;
            field.resumeRecordId = plan.resumeRecordId;
          }
        }
      }
    }
  }

  function toAnalysisField(field) {
    return {
      fieldKey: field.fieldKey,
      label: field.label,
      attributes: field.attributes,
      context: field.context,
      inputType: field.inputType,
      tag: field.tag,
      role: field.role,
      accessibleName: field.accessibleName,
      labelCandidates: field.labelCandidates,
      description: field.description,
      sectionPath: field.sectionPath,
      nearbyText: field.nearbyText,
      controlType: field.controlType,
      interactionType: field.interactionType,
      required: field.required,
      constraints: field.constraints,
      optionState: field.optionState,
      deterministicKey: field.deterministicKey,
      deterministicConfidence: field.deterministicConfidence,
      recordIndex: Number.isInteger(field.recordIndex) ? field.recordIndex : null,
      recordScope: field.recordScope || null,
      sectionType: field.sectionType || null,
      sectionId: field.sectionId || null,
      pageRecordId: field.pageRecordId || null,
      semanticKey: field.semanticKey || null,
      resumeRecordId: field.resumeRecordId || null,
      resumePath: field.resumePath || null,
      elementIdentity: field.elementIdentity,
      datePart: field.datePart || null,
      options: field.options,
    };
  }

  function buildFormSections(fields) {
    const sections = new Map();
    for (const field of fields) {
      const title = field.sectionPath?.join(" / ") || field.context || "未分组字段";
      const recordIndex = Number.isInteger(field.recordIndex) ? field.recordIndex : null;
      const key = `${title}|${recordIndex ?? "-"}`;
      const section = sections.get(key) || {
        type: field.recordScope || (field.deterministicKey?.split(".")[0] || "custom"),
        title: title.slice(0, 120),
        recordIndex,
        sectionId: field.sectionId || null,
        pageRecordId: field.pageRecordId || null,
        fieldKeys: [],
      };
      section.fieldKeys.push(field.fieldKey);
      sections.set(key, section);
    }
    return [...sections.values()].slice(0, 40);
  }

  function detectProvider() {
    const hostname = window.location.hostname.toLowerCase();
    const pathname = window.location.pathname.toLowerCase();
    const scripts = Array.from(document.scripts).map((script) => script.src || "").filter(Boolean).slice(0, 80);
    const iframeSources = queryAllRoots("iframe").map((frame) => frame.src || "").filter(Boolean).slice(0, 40);
    const bodyMarkers = (document.body?.innerText || "").slice(0, 4_000).toLowerCase();
    const domMarkers = queryAllRoots("[data-testid], [data-qa], [class], [id]").slice(0, 120)
      .map((node) => `${node.id || ""} ${node.getAttribute("data-testid") || ""} ${node.getAttribute("data-qa") || ""} ${node.className || ""}`.slice(0, 180).toLowerCase());
    const rules = [
      { provider: "moka", tests: [() => /app\.mokahr\.com/.test(hostname), () => /mokahr\.com/.test(iframeSources.join(" ")), () => /\/apply\/|campus[_-]?apply|social[_-]?recruitment/.test(pathname), () => /mokahr/.test(scripts.join(" "))] },
      { provider: "feishu", tests: [() => /\.jobs\.feishu\.cn$/.test(hostname), () => /feishu\.cn/.test(scripts.join(" ")), () => /飞书|feishu/.test(bodyMarkers), () => /combobox|portal|select/.test(domMarkers.join(" "))] },
      { provider: "beisen", tests: [() => /\.zhiye\.com$/.test(hostname), () => /zhiye\.com/.test(iframeSources.join(" ")), () => /campus|social/.test(pathname)] },
      { provider: "dayee", tests: [() => /hotjob\.cn|wintalent\.cn/.test(hostname), () => /\/wt\//.test(pathname), () => /dayee|wintalent/.test(scripts.join(" "))] },
      { provider: "workday", tests: [() => /workday\.com/.test(hostname), () => /workday/.test(scripts.join(" ")), () => /workday/.test(pathname)] },
      { provider: "greenhouse", tests: [() => /greenhouse\.io/.test(hostname), () => /greenhouse/.test(pathname)] },
      { provider: "lever", tests: [() => /jobs\.lever\.co/.test(hostname), () => /lever/.test(scripts.join(" "))] },
      { provider: "ashby", tests: [() => /jobs\.ashbyhq\.com/.test(hostname), () => /ashby/.test(scripts.join(" "))] },
      { provider: "oracle", tests: [() => /oraclecloud\.com/.test(hostname), () => /oracle/.test(scripts.join(" "))] },
      { provider: "successfactors", tests: [() => /successfactors\./.test(hostname), () => /successfactors/.test(pathname)] },
    ];
    let best = { provider: "generic", confidence: 0, evidence: [] };
    for (const rule of rules) {
      const matched = rule.tests.filter((test) => test()).length;
      const confidence = Math.min(0.98, matched / Math.max(2, rule.tests.length));
      if (confidence > best.confidence) best = {
        provider: rule.provider,
        confidence: Number(confidence.toFixed(2)),
        evidence: [hostname, pathname, ...scripts.filter((src) => rule.provider === "moka" ? /moka/ : new RegExp(rule.provider, "i").test(src)).slice(0, 2)],
      };
    }
    const companyProfiles = [
      { id: "bytedance", name: "字节跳动", pattern: /字节跳动|bytedance|byte-dance|douyin|tiktok|jobs\.bytedance/, providerHint: "feishu" },
      { id: "tencent", name: "腾讯", pattern: /腾讯|tencent|joinqq|qq\.com/, providerHint: "generic" },
      { id: "alibaba", name: "阿里巴巴", pattern: /阿里巴巴|alibaba|alibabagroup|talent\.alibaba/, providerHint: "generic" },
      { id: "jd", name: "京东", pattern: /京东|zhaopin\.jd|campus\.jd|join\.jd/, providerHint: "moka" },
      { id: "meituan", name: "美团", pattern: /美团|meituan|zhaopin\.meituan/, providerHint: "moka" },
      { id: "baidu", name: "百度", pattern: /百度|baidu|talent\.baidu/, providerHint: "generic" },
      { id: "pdd", name: "拼多多", pattern: /拼多多|pinduoduo|pdd|careers\.pdd/, providerHint: "moka" },
      { id: "xiaohongshu", name: "小红书", pattern: /小红书|xiaohongshu|xhs|job\.xiaohongshu/, providerHint: "moka" },
      { id: "netease", name: "网易", pattern: /网易|netease|163\.com|campus\.163/, providerHint: "generic" },
      { id: "bilibili", name: "哔哩哔哩", pattern: /哔哩哔哩|bilibili|jobs\.bilibili/, providerHint: "generic" },
      { id: "xiaomi", name: "小米", pattern: /小米|xiaomi|hr\.xiaomi/, providerHint: "feishu" },
      { id: "huawei", name: "华为", pattern: /华为|huawei|career\.huawei/, providerHint: "generic" },
    ];
    const profile = companyProfiles.find((item) => item.pattern.test(`${hostname} ${pathname} ${bodyMarkers}`));
    if (profile && best.provider === "generic" && profile.providerHint !== "generic") best = { ...best, provider: profile.providerHint, confidence: Math.max(best.confidence, 0.68) };
    return { ...best, company: profile?.id || "", companyName: profile?.name || "", profileId: profile?.id || "generic", evidence: best.evidence.slice(0, 6) };
  }

  function extractApplicationContext(provider) {
    const jsonLd = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).flatMap((script) => {
      try {
        const value = JSON.parse(script.textContent || "null");
        return Array.isArray(value) ? value : [value];
      } catch { return []; }
    }).find((item) => item && (item["@type"] === "JobPosting" || item.jobLocation || item.hiringOrganization));
    const visibleText = (document.body?.innerText || "").replace(/\n{3,}/g, "\n\n").slice(0, 20_000);
    const meta = (name) => document.querySelector(`meta[name="${name}"], meta[property="${name}"]`)?.getAttribute("content") || "";
    const stripHtml = (value) => String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const sliceSection = (headings) => {
      const pattern = new RegExp(`(?:^|\\n)(?:${headings.join("|")})[：:]?\\s*([\\s\\S]{0,3000}?)(?=\\n(?:岗位职责|工作职责|职位描述|任职要求|岗位要求|资格要求|加分项|优先条件|申请|投递|$))`, "i");
      return visibleText.match(pattern)?.[1]?.trim().slice(0, 3000) || "";
    };
    const description = stripHtml(jsonLd?.description || meta("description") || meta("og:description")) || visibleText.slice(0, 6000);
    const locationValue = jsonLd?.jobLocation;
    const jobLocationText = stripHtml(Array.isArray(locationValue) ? locationValue.map((item) => item?.address?.addressLocality || item?.name).filter(Boolean).join("、") : locationValue?.address?.addressLocality || locationValue?.name || "");
    const languageProbe = `${jsonLd?.title || ""} ${description}`;
    const chineseCount = (languageProbe.match(/[\u4e00-\u9fff]/g) || []).length;
    const latinCount = (languageProbe.match(/[A-Za-z]/g) || []).length;
    return {
      company: stripHtml(jsonLd?.hiringOrganization?.name) || provider.companyName || provider.company || "",
      jobTitle: stripHtml(jsonLd?.title) || meta("og:title") || document.querySelector("h1")?.textContent?.trim() || document.title,
      jobId: stripHtml(jsonLd?.identifier?.value || jsonLd?.identifier || ""),
      jobDescription: description.slice(0, 6000),
      location: jobLocationText.slice(0, 240),
      responsibilities: sliceSection(["岗位职责", "工作职责", "职位描述", "Responsibilities"]),
      requirements: sliceSection(["任职要求", "岗位要求", "资格要求", "Requirements", "Qualifications"]),
      preferredQualifications: sliceSection(["加分项", "优先条件", "Preferred Qualifications"]).slice(0, 2000),
      recruitingProgram: /校园招聘|校招|campus/i.test(visibleText.slice(0, 4000)) ? "校园招聘" : "",
      sourceUrl: `${window.location.origin}${window.location.pathname}`,
      language: chineseCount && latinCount ? "mixed" : chineseCount ? "zh" : latinCount ? "en" : "unknown",
    };
  }

  function getExactStructuredValue(plan) {
    if (!plan.matchedDefinition) return undefined;
    const locallyExact = plan.matchedDefinition.localExact === true && plan.bestScore >= 0.9;
    const recordAwareExact = Number.isInteger(plan.recordIndex)
      && plan.pageRecordId
      && plan.bestScore >= 0.9
      && ["education", "work", "project", "campus", "awards", "certifications", "languages"].includes(plan.matchedDefinition.section);
    if (!locallyExact && !recordAwareExact) return undefined;
    const values = getDefinitionValues(plan.matchedDefinition, plan.recordScope);
    const recordIndex = locallyExact || plan.matchedDefinition.repeatable === false ? 0 : plan.recordIndex;
    if (!isUsableRecordIndex(recordIndex, plan.matchedDefinition, plan.recordScope)) return undefined;
    const value = values[recordIndex];
    if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) return undefined;
    return value;
  }

  if (!aiOnly) {
    queryAllRoots("[data-starjob-filled='true']").forEach((element) => {
      element.dataset.starjobPreviouslyFilled = "true";
      element.style.outline = "";
      element.style.outlineOffset = "";
      delete element.dataset.starjobFilled;
      delete element.dataset.starjobAiDerived;
    });
  }

  function isFieldCandidate(element) {
    const role = (element.getAttribute("role") || "").toLowerCase();
    const native = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement;
    const semanticRole = ["textbox", "combobox", "radio", "checkbox", "switch", "spinbutton"].includes(role);
    const custom = element.hasAttribute("aria-haspopup") || element.hasAttribute("aria-controls") || element.hasAttribute("data-starjob-control") || element.hasAttribute("data-starjob-search-select");
    if (!native && !element.isContentEditable && !semanticRole && !custom) return false;
    if (["option", "listbox", "menuitem", "treeitem", "dialog"].includes(role)) return false;
    if (element instanceof HTMLButtonElement && !custom && !semanticRole) return false;
    return true;
  }

  const candidates = queryAllRoots("input, textarea, select, button, [contenteditable='true'], [role='textbox'], [role='combobox'], [role='radio'], [role='checkbox'], [role='switch'], [role='spinbutton'], [aria-haspopup], [aria-controls], [data-starjob-control], [data-starjob-search-select]")
    .filter((element) => {
      if (!(element instanceof HTMLElement) || !isVisible(element) || !isFieldCandidate(element)) return false;
      if (element instanceof HTMLInputElement) {
        if (["hidden", "password", "submit", "button", "reset", "image", "file"].includes(element.type)) return false;
        if (element.type === "radio") {
          if (requestedFillMode !== "ai" && !aiAutofillOnly) return false;
          if (getRadioGroupElements(element)[0] !== element) return false;
        }
        if (element.readOnly && !isLikelyDateControl(element) && !isDynamicControl(element)) return false;
      }
      if (element.getAttribute("aria-disabled") === "true") return false;
      if ((element.getAttribute("role") || "").toLowerCase() === "radio" && requestedFillMode !== "ai" && !aiAutofillOnly) return false;
      return !element.disabled;
    });
  const extractedFields = [];
  const plans = [];
  let sensitiveCount = 0;

  for (const [candidateIndex, element] of candidates.entries()) {
    const signals = getFieldSignals(element);
    const choiceQuestion = getChoiceQuestion(element);
    const labelText = [choiceQuestion, ...signals.visible, ...signals.attributes].join(" ");
    const contextText = [choiceQuestion, getContextText(element)].filter(Boolean).join(" ");
    const structuredContract = inferStructuredFieldContract(element);
    const sectionHint = structuredContract?.section || inferSectionHint(element, signals, contextText);
    const recordScope = inferWorkScope(element, sectionHint, contextText);
    const recordContainer = findRecordContainer(element, sectionHint);
    const pairedDateKey = inferPairedDateKey(element, sectionHint);
    const normalizedSignals = normalize(`${labelText} ${contextText}`);
    const fieldKey = createFieldKey(candidateIndex, element, signals, contextText);
    const inputType = element instanceof HTMLInputElement ? element.type.toLowerCase() : element.tagName.toLowerCase();
    const blockedCheckbox = element instanceof HTMLInputElement && element.type === "checkbox"
      && blockedChoiceTerms.some((term) => normalize(labelText).includes(normalize(term)));
    const birthDateField = birthDateTerms.some((term) => normalizedSignals.includes(normalize(term)))
      || /(?:^|[^a-z])dob(?:[^a-z]|$)/i.test(`${labelText} ${contextText}`);
    const sensitive = !labelText
      || blockedCheckbox
      || sensitiveTerms.some((term) => normalizedSignals.includes(normalize(term)))
      || (birthDateField && !asText(basics.birthDate));

    let matchedDefinition = null;
    let bestScore = 0;
    const autocomplete = element.getAttribute("autocomplete")?.toLowerCase().trim();
    const autocompleteKey = autocompleteMap[autocomplete];

    if (!sensitive) {
      for (const definition of definitions) {
        let score = scoreDefinition(definition, element, signals, contextText, sectionHint);
        if (structuredContract?.key === definition.key && isDefinitionControlCompatible(definition, element)) score = 1;
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
      label: choiceQuestion || signals.visible.find(Boolean)?.replace(/\s+/g, " ").trim().slice(0, 80) || "",
      attributes: signals.attributes.join(" ").slice(0, 160),
      context: [sectionHint, contextText].filter(Boolean).join(" ").replace(/\s+/g, " ").trim().slice(0, 160),
      inputType,
      deterministicKey: matchedDefinition && bestScore >= 0.74 ? matchedDefinition.key : null,
      deterministicConfidence: Number(bestScore.toFixed(2)),
      recordIndex: structuredContract?.recordIndex ?? null,
      recordScope,
      options: getChoiceOptions(element),
      tag: element.tagName.toLowerCase(),
      role: element.getAttribute("role") || "",
      accessibleName: getAccessibleName(element, signals).slice(0, 180),
      labelCandidates: signals.labelCandidates || [],
      description: getFieldDescription(element),
      sectionPath: getSectionPath(element),
      nearbyText: getNearbyText(element),
      controlType: getControlType(element),
      interactionType: getInteractionType(element),
      elementIdentity: element.dataset.starjobFieldId || fieldKey,
      datePart: matchedDefinition?.date ? inferDatePart(element, signals) : null,
      required: element.hasAttribute("required") || element.getAttribute("aria-required") === "true",
      constraints: {
        maxLength: Number.isFinite(element.maxLength) && element.maxLength >= 0 ? element.maxLength : null,
        min: element.getAttribute("min") || null,
        max: element.getAttribute("max") || null,
        pattern: element.getAttribute("pattern") || null,
      },
      optionState: getChoiceOptions(element).length ? "static" : (isDynamicControl(element) ? "dynamic" : "unknown"),
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
      structuredContract,
      recordScope,
      recordContainer,
      pairedDateKey,
      explicitRecordNumber: getExplicitRecordNumber(element, signals, contextText),
    });
  }

  assignRecordIndices(plans, extractedFields);

  const duplicateFieldKeys = extractedFields
    .filter((field, index, all) => all.findIndex((candidate) => candidate.fieldKey === field.fieldKey) !== index)
    .map((field) => field.fieldKey);
  const duplicateElementIdentities = extractedFields
    .filter((field, index, all) => all.findIndex((candidate) => candidate.elementIdentity === field.elementIdentity) !== index)
    .map((field) => field.elementIdentity);
  if (duplicateFieldKeys.length || duplicateElementIdentities.length) {
    console.error("[starjob_pipeline_collision]", {
      duplicateFieldKeys: [...new Set(duplicateFieldKeys)],
      duplicateElementIdentities: [...new Set(duplicateElementIdentities)],
    });
    throw new Error("FIELD_IDENTITY_COLLISION");
  }

  const createFieldTrace = (field, plan) => ({
    fieldKey: field.fieldKey,
    sectionType: field.sectionType || plan?.matchedDefinition?.section || null,
    sectionId: field.sectionId || null,
    pageRecordId: field.pageRecordId || null,
    recordIndex: Number.isInteger(field.recordIndex) ? field.recordIndex : null,
    semanticKey: field.semanticKey || field.deterministicKey || null,
    resumeRecordId: field.resumeRecordId || null,
    resumePath: field.resumePath || null,
    plannedValue: null,
    elementIdentity: field.elementIdentity,
    execution: null,
  });
  const fieldTraces = extractedFields.map((field) => createFieldTrace(field, plans.find((plan) => plan.fieldKey === field.fieldKey)));

  if (analysisOnly) {
    const provider = detectProvider();
    return {
      scanned: candidates.length,
      identified: plans.filter((plan) => !plan.sensitive && plan.matchedDefinition && plan.bestScore >= 0.74).length,
      fields: extractedFields
        .filter((field) => !field.sensitive)
        .map(toAnalysisField),
      formSections: buildFormSections(extractedFields.filter((field) => !field.sensitive)),
      provider,
      applicationContext: extractApplicationContext(provider),
      sensitive: sensitiveCount,
      pipelineDiagnostics: {
        checkpoint: "A",
        scanFieldCount: candidates.length,
        eligibleFieldCount: extractedFields.filter((field) => !field.sensitive).length,
        duplicateFieldKeyCount: duplicateFieldKeys.length,
        duplicateElementIdentityCount: duplicateElementIdentities.length,
      },
      fieldTraces,
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
  const planGroupKey = (plan) => `${plan.matchedDefinition?.section || ""}:${plan.recordScope || "default"}`;
  const sectionsWithAnchors = new Set(
    plans
      .filter((plan) => plan.matchedDefinition && anchorKeys[plan.matchedDefinition.section] === plan.matchedDefinition.key)
      .map(planGroupKey),
  );
  const currentRecordBySection = new Map();
  const nextRecordBySection = new Map();
  const lastMatchedKeyBySection = new Map();
  const recordNumberMaps = new Map();
  const recordContainerMaps = new Map();

  for (const section of repeatableSections) {
    const sectionScopes = [...new Set(plans
      .filter((plan) => plan.matchedDefinition?.section === section)
      .map((plan) => plan.recordScope || "default"))];
    for (const scope of sectionScopes) {
      const groupKey = `${section}:${scope}`;
      const groupPlans = plans.filter((plan) => plan.matchedDefinition?.section === section && (plan.recordScope || "default") === scope);
      const containers = [];
      for (const plan of groupPlans) {
        if (plan.recordContainer && !containers.includes(plan.recordContainer)) containers.push(plan.recordContainer);
      }
      if (containers.length) recordContainerMaps.set(groupKey, new Map(containers.map((container, index) => [container, index])));

      const recordNumbers = [...new Set(groupPlans
        .filter((plan) => Number.isInteger(plan.explicitRecordNumber))
        .map((plan) => plan.explicitRecordNumber))]
        .sort((left, right) => left - right);
      if (recordNumbers.length) recordNumberMaps.set(groupKey, new Map(recordNumbers.map((number, index) => [number, index])));
    }
  }
  const unmatchedLabels = [];
  let filled = 0;
  let preserved = 0;
  let empty = 0;
  let matched = 0;
  let manual = aiOnly ? 0 : document.querySelectorAll("input[type='file']").length;
  let derived = 0;
  let structured = 0;
  let failed = 0;

  function rememberUnmatched(signals) {
    const label = signals.visible.find(Boolean) || signals.attributes.find(Boolean);
    const cleanLabel = String(label || "").replace(/\s+/g, " ").trim().slice(0, 48);
    if (cleanLabel && !unmatchedLabels.includes(cleanLabel)) unmatchedLabels.push(cleanLabel);
  }

  async function fillElementSafely(element, value, definition) {
    const elementIdentity = element?.dataset?.starjobFieldId || null;
    const matches = elementIdentity
      ? queryAllRoots(`[data-starjob-field-id="${CSS.escape(elementIdentity)}"]`)
      : [];
    const resolvedElement = element?.isConnected ? element : matches.length === 1 ? matches[0] : null;
    const trace = fieldTraces.find((item) => item.elementIdentity === elementIdentity);
    if (trace) trace.plannedValue = asText(value).slice(0, 180);
    if (!resolvedElement || matches.length > 1) {
      if (trace) trace.execution = {
        resolved: false,
        written: false,
        readback: "",
        verified: false,
        failureCode: matches.length > 1 ? "ELEMENT_IDENTITY_COLLISION" : "ELEMENT_NOT_FOUND",
      };
      failed += 1;
      return false;
    }
    try {
      const verified = await fillElement(resolvedElement, value, definition);
      if (trace) trace.execution = {
        resolved: true,
        written: verified,
        readback: currentValue(resolvedElement).slice(0, 180),
        verified,
        failureCode: verified ? null : "READBACK_MISMATCH",
      };
      return verified;
    } catch (error) {
      failed += 1;
      if (trace) trace.execution = {
        resolved: true,
        written: false,
        readback: currentValue(resolvedElement).slice(0, 180),
        verified: false,
        failureCode: "EXECUTION_ERROR",
      };
      console.warn("[starjob_fill_field_failed]", {
        tag: resolvedElement?.tagName,
        type: resolvedElement instanceof HTMLInputElement ? resolvedElement.type : undefined,
        message: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  async function repairInvalidFilledDateRanges() {
    const ranges = new Map();
    for (const plan of plans) {
      const match = plan.matchedDefinition?.key.match(/^(education|work|project)\.(startDate|endDate)$/);
      if (!match || !Number.isInteger(plan.recordIndex)) continue;
      const rangeKey = `${match[1]}:${plan.recordIndex}`;
      const range = ranges.get(rangeKey) || {};
      range[match[2] === "startDate" ? "start" : "end"] = plan;
      ranges.set(rangeKey, range);
    }

    let repaired = 0;
    let unresolved = 0;
    const labels = [];
    for (const range of ranges.values()) {
      if (!range.start || !range.end) continue;
      const start = parseDateParts(currentValue(range.start.element));
      const end = parseDateParts(currentValue(range.end.element));
      if (!start || !end || start.year * 12 + start.month <= end.year * 12 + end.month) continue;
      const plansToRepair = [range.start, range.end].filter((plan) => plan.element.dataset.starjobFilled === "true");
      if (!plansToRepair.length) continue;

      for (const plan of plansToRepair) {
        const traceField = extractedFields.find((field) => field.fieldKey === plan.fieldKey);
        if (plan.expectedDateValue && await fillElementSafely(plan.element, plan.expectedDateValue, {
          date: true,
          datePart: traceField?.datePart || null,
        })) {
          markFilled(plan.element, plan.signals.visible.find(Boolean) || "经历日期");
        }
      }

      const repairedStart = parseDateParts(currentValue(range.start.element));
      const repairedEnd = parseDateParts(currentValue(range.end.element));
      if (repairedStart && repairedEnd && repairedStart.year * 12 + repairedStart.month <= repairedEnd.year * 12 + repairedEnd.month) {
        repaired += plansToRepair.length;
        continue;
      }

      for (const plan of plansToRepair) {
        plan.element.style.outline = "2px solid rgba(180, 56, 56, 0.82)";
        plan.element.style.outlineOffset = "2px";
        plan.element.title = "拾星日期顺序校验未通过，请手动确认";
        delete plan.element.dataset.starjobFilled;
        unresolved += 1;
        labels.push(plan.signals.visible.find(Boolean) || "经历日期");
      }
    }
    return { repaired, unresolved, labels };
  }

  for (const plan of plans) {
    const { element, signals, fieldKey, matchedDefinition, bestScore, sensitive, recordContainer, explicitRecordNumber } = plan;
    if (aiOnly && !aiFieldMappings[fieldKey]) continue;
    if (sensitive) {
      manual += 1;
      rememberUnmatched(signals);
      continue;
    }

    if (aiAutofillOnly) {
      const mapping = aiValueMappings[fieldKey];
      const exactStructuredValue = getExactStructuredValue(plan);
      const hasAcceptedMapping = mapping && typeof mapping === "object"
        && !["manual", "skip"].includes(mapping.action)
        && Number(mapping.confidence) >= 0.82;
      if (exactStructuredValue === undefined && !hasAcceptedMapping) {
        manual += 1;
        rememberUnmatched(signals);
        continue;
      }
      matched += 1;
      const replacePreviousExactDate = exactStructuredValue !== undefined
        && Boolean(matchedDefinition?.date)
        && element.dataset.starjobPreviouslyFilled === "true"
        && !dateValuesEquivalent(exactStructuredValue, currentValue(element));
      if (currentValue(element) && !replacePreviousExactDate) {
        preserved += 1;
        continue;
      }
      const value = exactStructuredValue === undefined
        ? typeof mapping.value === "string" ? mapping.value.trim() : typeof mapping.displayValue === "string" ? mapping.displayValue.trim() : ""
        : exactStructuredValue;
      const isCheckbox = element instanceof HTMLInputElement && element.type === "checkbox";
      if (!value && !(isCheckbox && value === false)) {
        empty += 1;
        manual += 1;
        rememberUnmatched(signals);
        continue;
      }
      const isDerived = matchedDefinition?.localDerived === true
        || (exactStructuredValue === undefined && mapping.basis !== "resume");
      if (exactStructuredValue !== undefined) structured += 1;
      const checkboxValue = /^(true|1|yes|y|是|至今|仍在职)$/i.test(String(value));
      if (matchedDefinition?.date) plan.expectedDateValue = value;
      if (await fillElementSafely(element, isCheckbox ? checkboxValue : value, {
        date: Boolean(matchedDefinition?.date) || (!matchedDefinition && isLikelyDateControl(element)),
        datePart: extractedFields.find((field) => field.fieldKey === fieldKey)?.datePart || null,
        checkbox: isCheckbox,
        optionMatch: mapping?.optionMatch || null,
        interactionType: extractedFields.find((field) => field.fieldKey === fieldKey)?.interactionType || getInteractionType(element),
      })) {
        filled += 1;
        if (isDerived) derived += 1;
        const markedElement = element instanceof HTMLInputElement && element.type === "radio"
          ? getRadioGroupElements(element).find((radio) => radio.checked) || element
          : element;
        markFilled(markedElement, signals.visible.find(Boolean) || "页面字段", isDerived);
      } else {
        manual += 1;
        rememberUnmatched(signals);
      }
      continue;
    }

    if (!matchedDefinition || bestScore < 0.74) {
      manual += 1;
      rememberUnmatched(signals);
      continue;
    }

    const repeatable = repeatableSections.has(matchedDefinition.section) && matchedDefinition.repeatable !== false;
    const groupKey = planGroupKey(plan);
    const values = getDefinitionValues(matchedDefinition, plan.recordScope);
    const plannedRecordIndex = plan.recordIndex;
    const containerRecordIndex = recordContainerMaps.get(groupKey)?.get(recordContainer);
    const normalizedRecordIndex = recordNumberMaps.get(groupKey)?.get(explicitRecordNumber);
    let index;
    if (repeatable && isUsableRecordIndex(plannedRecordIndex, matchedDefinition, plan.recordScope)) {
      index = plannedRecordIndex;
      currentRecordBySection.set(groupKey, index);
      nextRecordBySection.set(groupKey, Math.max(nextRecordBySection.get(groupKey) || 0, index + 1));
    } else if (repeatable && isUsableRecordIndex(containerRecordIndex, matchedDefinition, plan.recordScope)) {
      index = containerRecordIndex;
      currentRecordBySection.set(groupKey, index);
      nextRecordBySection.set(groupKey, Math.max(nextRecordBySection.get(groupKey) || 0, index + 1));
    } else if (repeatable && isUsableRecordIndex(normalizedRecordIndex, matchedDefinition, plan.recordScope)) {
      index = normalizedRecordIndex;
      currentRecordBySection.set(groupKey, index);
      nextRecordBySection.set(groupKey, Math.max(nextRecordBySection.get(groupKey) || 0, index + 1));
    } else if (repeatable && sectionsWithAnchors.has(groupKey)
      && anchorKeys[matchedDefinition.section] === matchedDefinition.key) {
      const duplicateAdjacentAnchor = lastMatchedKeyBySection.get(groupKey) === matchedDefinition.key;
      index = duplicateAdjacentAnchor
        ? currentRecordBySection.get(groupKey) ?? 0
        : nextRecordBySection.get(groupKey) || 0;
      if (!duplicateAdjacentAnchor) nextRecordBySection.set(groupKey, index + 1);
      currentRecordBySection.set(groupKey, index);
    } else if (repeatable) {
      index = takeNextOccurrenceIndex(occurrence, getRepeatableOccurrenceKey(matchedDefinition, signals));
      currentRecordBySection.set(groupKey, index);
    } else {
      index = takeNextOccurrenceIndex(occurrence, matchedDefinition.key);
    }
    if (repeatable) lastMatchedKeyBySection.set(groupKey, matchedDefinition.key);
    matched += 1;
    if (fillMode === "merge" && currentValue(element)) {
      preserved += 1;
      continue;
    }

    const value = repeatable ? values[index] : values[index] ?? values[0];
    if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
      empty += 1;
      manual += 1;
      rememberUnmatched(signals);
      continue;
    }
    if (matchedDefinition.date) plan.expectedDateValue = value;
    if (await fillElementSafely(element, value, {
      ...matchedDefinition,
      datePart: extractedFields.find((field) => field.fieldKey === fieldKey)?.datePart || null,
    })) {
      filled += 1;
      markFilled(element, matchedDefinition.aliases[0]);
    } else {
      manual += 1;
      rememberUnmatched(signals);
    }
  }

  const invalidDateRanges = await repairInvalidFilledDateRanges();
  filled = Math.max(0, filled - invalidDateRanges.unresolved);
  manual += invalidDateRanges.unresolved;
  invalidDateRanges.labels.forEach((label) => rememberUnmatched({ visible: [label], attributes: [] }));

  return {
    scanned: candidates.length,
    matched,
    filled,
    preserved,
    empty,
    manual,
    derived,
    structured,
    failed,
    invalidDatesRepaired: invalidDateRanges.repaired,
    invalidDatesUnresolved: invalidDateRanges.unresolved,
    unmatched: unmatchedLabels.slice(0, 12),
    pipelineDiagnostics: {
      checkpoint: "D",
      scanFieldCount: candidates.length,
      eligibleFieldCount: extractedFields.filter((field) => !field.sensitive).length,
      compiledActionCount: matched,
      executedActionCount: fieldTraces.filter((trace) => trace.execution?.resolved).length,
      verifiedFillCount: filled,
    },
    fieldTraces,
  };
})();
