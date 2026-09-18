import Link from "next/link";
import { Activity, ArrowUpRight, CheckCircle2, ChevronRight, Coins, Database, KeyRound, MessageSquareText, Rows3, Users } from "lucide-react";

const adminActions = [
  {
    href: "/admin/analytics",
    eyebrow: "01 · 核心运营",
    title: "数据分析",
    body: "查看用户增长、功能使用、投递链路和运营信号。",
    icon: Activity,
    note: "先看整体变化",
  },
  {
    href: "/admin/feedback",
    eyebrow: "02 · 待办队列",
    title: "反馈管理",
    body: "按状态、来源和关键词查看用户问题与建议。",
    icon: MessageSquareText,
    note: "处理待跟进事项",
  },
  {
    href: "/admin/jobs",
    eyebrow: "03 · 内容运营",
    title: "岗位管理",
    body: "维护岗位内容、投递链接、展示状态和公司信息。",
    icon: Rows3,
    note: "维护公开岗位",
  },
  {
    href: "/admin/referrals",
    eyebrow: "04 · 增长治理",
    title: "内推码管理",
    body: "查看审核与举报状态，人工下架不合规内容。",
    icon: KeyRound,
    note: "检查社区安全",
  },
  {
    href: "/admin/users",
    eyebrow: "05 · 账户治理",
    title: "用户管理",
    body: "查找账户，管理身份、登录状态和 StarInterview 访问权限。",
    icon: Users,
    note: "处理账户请求",
  },
] as const;

const adminTools = [
  {
    href: "/admin/import",
    title: "批量导入",
    body: "上传 CSV 或 Excel，预览数据后写入岗位库。",
    icon: Database,
  },
  {
    href: "/admin/billing",
    title: "诘星计费",
    body: "核对账户余额、发放使用额度并查看账本记录。",
    icon: Coins,
  },
] as const;

export default function AdminPage() {
  return (
    <div className="observatory-page admin-hub">
      <section className="admin-hub__hero">
        <div>
          <p className="page-kicker">StarJob Admin · Command Center</p>
          <h1 className="page-title">超级功能台</h1>
          <p className="page-description">把运营信号、内容管理、账户治理和增长工具放进同一个清晰的工作台。</p>
        </div>
        <div className="admin-hub__hero-aside" aria-label="管理员工作台状态">
          <div className="admin-hub__hero-status">
            <span className="admin-hub__status-dot" aria-hidden="true" />
            <strong>生产环境 · 权限已核验</strong>
          </div>
          <span>所有写入动作继续沿用现有管理员校验。</span>
        </div>
      </section>

      <section className="admin-hub__command-bar" aria-label="快速入口">
        <div>
          <span className="admin-hub__command-label">快速进入</span>
          <strong>今天先处理哪一类工作？</strong>
        </div>
        <div className="admin-hub__command-links">
          <Link href="/admin/feedback"><MessageSquareText aria-hidden="true" />处理反馈 <ArrowUpRight aria-hidden="true" /></Link>
          <Link href="/admin/jobs"><Rows3 aria-hidden="true" />维护岗位 <ArrowUpRight aria-hidden="true" /></Link>
          <Link href="/admin/analytics"><Activity aria-hidden="true" />查看数据 <ArrowUpRight aria-hidden="true" /></Link>
        </div>
      </section>

      <section className="admin-hub__section" aria-labelledby="admin-workspace-title">
        <div className="admin-hub__section-heading">
          <div>
            <h2 id="admin-workspace-title">工作模块</h2>
            <p>高频模块按运营优先级排列，进入后保留各自的筛选和操作状态。</p>
          </div>
          <span>5 个核心入口</span>
        </div>
        <div className="admin-hub__action-grid">
          {adminActions.map((item, index) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={index === 0 ? "admin-hub__action admin-hub__action--featured" : "admin-hub__action"}>
                <span className="admin-hub__action-index">{item.eyebrow}</span>
                <span className="admin-hub__action-icon"><Icon aria-hidden="true" /></span>
                <span className="admin-hub__action-copy">
                  <span className="admin-hub__action-title">{item.title}</span>
                  <span className="admin-hub__action-body">{item.body}</span>
                  <span className="admin-hub__action-note">{item.note}</span>
                </span>
                <ChevronRight aria-hidden="true" className="admin-hub__action-arrow" />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="admin-hub__signal-grid" aria-label="工作台说明">
        <div><CheckCircle2 aria-hidden="true" /><span><strong>权限边界清晰</strong><small>管理员页面继续由 AdminShell 统一核验。</small></span></div>
        <div><Rows3 aria-hidden="true" /><span><strong>日常操作集中</strong><small>岗位、用户、反馈在同一层级快速切换。</small></span></div>
        <div><KeyRound aria-hidden="true" /><span><strong>低频工具收纳</strong><small>导入、计费等工具保留入口但不打断主流程。</small></span></div>
      </section>

      <details className="admin-hub__tools">
        <summary>
          <span><strong>更多工具</strong><small>批量导入与诘星计费按需打开，减少首页干扰。</small></span>
          <span className="admin-hub__tools-summary"><em>2 个低频入口</em><ChevronRight aria-hidden="true" /></span>
        </summary>
        <div className="admin-hub__tool-grid">
          {adminTools.map((item) => {
            const Icon = item.icon;
            return <Link key={item.href} href={item.href} className="admin-hub__tool-link"><span className="admin-hub__tool-icon"><Icon aria-hidden="true" /></span><span><strong>{item.title}</strong><small>{item.body}</small></span><ChevronRight aria-hidden="true" /></Link>;
          })}
        </div>
      </details>
    </div>
  );
}
