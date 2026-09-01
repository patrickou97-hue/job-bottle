import Link from "next/link";
import { Activity, ChevronRight, Coins, Database, KeyRound, MessageSquareText, Rows3, Users } from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";

const adminActions = [
  {
    href: "/admin/analytics",
    title: "数据分析",
    body: "查看用户增长、功能使用、投递链路和运营信号。",
    icon: Activity,
    note: "先看整体变化",
  },
  {
    href: "/admin/feedback",
    title: "反馈管理",
    body: "按状态、来源和关键词查看用户问题与建议。",
    icon: MessageSquareText,
    note: "处理待跟进事项",
  },
  {
    href: "/admin/jobs",
    title: "岗位管理",
    body: "维护岗位内容、投递链接、展示状态和公司信息。",
    icon: Rows3,
    note: "维护公开岗位",
  },
  {
    href: "/admin/referrals",
    title: "内推码管理",
    body: "查看审核与举报状态，人工下架不合规内容。",
    icon: KeyRound,
    note: "检查社区安全",
  },
  {
    href: "/admin/users",
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
    <AdminShell>
      <div className="observatory-page admin-hub">
        <section className="admin-hub__hero">
          <div>
            <p className="page-kicker">StarJob Admin · 管理空间</p>
            <h1 className="page-title">管理后台</h1>
            <p className="page-description">把高频管理动作放在眼前，把低频工具收在需要的时候。</p>
          </div>
          <div className="admin-hub__hero-aside" aria-label="管理员提示">
            <span className="admin-hub__status-dot" aria-hidden="true" />
            <div>
              <strong>仅管理员可见</strong>
              <span>数据操作均保留原有权限校验</span>
            </div>
          </div>
        </section>

        <section className="admin-hub__section" aria-labelledby="admin-daily-title">
          <div className="admin-hub__section-heading">
            <div>
              <h2 id="admin-daily-title">日常工作</h2>
              <p>从这里进入最常用的运营与内容管理模块。</p>
            </div>
            <span>5 个入口</span>
          </div>
          <div className="admin-hub__action-grid">
            {adminActions.map((item, index) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={index === 0 ? "admin-hub__action admin-hub__action--featured" : "admin-hub__action"}
                >
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

        <details className="admin-hub__tools">
          <summary>
            <span>
              <strong>更多工具</strong>
              <small>批量导入与诘星计费按需打开，减少首页干扰。</small>
            </span>
            <span className="admin-hub__tools-summary">
              <em>2 个低频入口</em>
              <ChevronRight aria-hidden="true" />
            </span>
          </summary>
          <div className="admin-hub__tool-grid">
            {adminTools.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="admin-hub__tool-link">
                  <span className="admin-hub__tool-icon"><Icon aria-hidden="true" /></span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.body}</small>
                  </span>
                  <ChevronRight aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        </details>
      </div>
    </AdminShell>
  );
}
