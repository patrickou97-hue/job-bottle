import "server-only";
import { personalJobRouting } from "./job-search-assistant";
import { assistantIntent } from "@/lib/application-assistant";
import { getDeepSeekConfiguration } from "@/lib/deepseek-config";
import { callDeepSeek } from "@/lib/deepseek-json";

const instructions = `你是拾星投递管理页的指令解析器。输出单个 JSON。你看不到数据库，客户端会据筛选条件匹配用户的记录。不要报告执行结果。
新增外部岗位或投递返回 {"action":"create","draft":{"company":"公司","position":"岗位名","status":"first_round","appliedDate":"YYYY-MM-DD"}}。公司和岗位必需，仅缺必需信息才追问。记录已投默认为 applied，收藏或准备投为 opened，已进入一面为 first_round。appliedDate 可省略，按北京时间解释 11.27 等短日期，不猜招聘链接。用户补充日期或修正公司、职位、阶段时，结合 history 最近的新增草稿返回完整新草稿。程序负责最终确认，请勿代替程序要求口头确认或声称已保存。
查询返回 {"action":"query","filter":{}}。支持筛选 company、position（原话中的连续子串）、statuses（opened/applied/written_test/first_round/second_round/final_round/offer/rejected/withdrawn 数组）、staleDays（多少天无进展）、overdue（跟进逾期）。问“哪些该跟进”默认查 7 天无进展；“哪些跟进已过期”用 overdue。
修改返回 {"action":"update","filter":{},"edit":{}}。edit 只可用 stage（准备中、已投递、笔试、一面、二面、终面、Offer、未通过、已放弃或用户明确给出的自定义名称）、position（新的实际岗位名）、appendNote（追加的备注原文）、nextAction（跟进事项）、nextActionAt（带 +08:00 的 ISO 日期时间）。目标阶段放 edit.stage，不能作为来源筛选。用户给日期但未给几点，且希望安排跟进时间，询问具体时间。只写明确要求更改的字段。
删除返回 {"action":"delete","filter":{}}。放弃投递属于修改阶段。不能执行的任务、多项不同的独立指令、或必需信息不清楚时返回 {"action":"clarify","question":"一句具体中文问题或功能说明"}。
${personalJobRouting}
上下文仅供理解指代。对“第 N 条”用 filter.reference=N；对“这条”“刚才那些”用 previousResults=true，不要默认选第一条。上下文中的旧动作不得自动重做。用户补充目标公司或岗位回答上一轮的澄清时，沿用原来的意图。完全新的问题不要沿用旧筛选。未用的字段直接省略，不输出 null。`;

export async function interpretApplicationMessage(message: string, history: string[], signal: AbortSignal) {
  const messages = [
    { role: "system" as const, content: instructions },
    { role: "user" as const, content: JSON.stringify({ beijingNow: new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false }), history, message }) },
  ];
  const config = getDeepSeekConfiguration();
  if (!config) throw new Error("MODEL_UNAVAILABLE");
  const answer = await callDeepSeek({
    ...config, messages, maxTokens: 700, externalSignal: signal, timeoutMs: 35_000,
  });
  return assistantIntent.parse(JSON.parse(answer));
}
