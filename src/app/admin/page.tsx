import Link from "next/link";
import type { Metadata } from "next";
import { Activity, ArrowUpRight, CheckCircle2, Coins, Database, KeyRound, MessageSquareText, Rows3, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "超级功能台",
  robots: { index: false, follow: false },
};

const adminActions = [
  { href: "/admin/analytics", eyebrow: "01 · 核心运营", title: "数据分析", body: "用户增长、功能使用、投递链路和运营信号。", icon: Activity, note: "查看趋势" },
  { href: "/admin/feedback", eyebrow: "02 · 待办队列", title: "反馈管理", body: "按状态、来源和关键词处理用户问题与建议。", icon: MessageSquareText, note: "处理待跟进" },
  { href: "/admin/jobs", eyebrow: "03 · 内容运营", title: "岗位管理", body: "维护岗位内容、投递链接、展示状态与公司信息。", icon: Rows3, note: "维护岗位库" },
  { href: "/admin/referrals", eyebrow: "04 · 增长治理", title: "内推码管理", body: "检查来源、审核状态与社区内容质量。", icon: KeyRound, note: "检查来源" },
  { href: "/admin/users", eyebrow: "05 · 账户治理", title: "用户管理", body: "查找账户并管理身份、状态与 StarInterview 权限。", icon: Users, note: "管理账户" },
] as const;

const adminTools = [
  { href: "/admin/import", title: "批量导入", body: "CSV / Excel 岗位导入", icon: Database },
  { href: "/admin/billing", title: "诘星计费", body: "余额、额度与账本", icon: Coins },
] as const;

export default function AdminPage() {
  return (
    <div className="observatory-page admin-console">
      <div className="admin-console__topline">
        <span>STARJOB / ADMIN CONSOLE</span>
        <span className="admin-console__topline-status"><i aria-hidden="true" /> PRODUCTION</span>
      </div>

      <section className="admin-console__hero">
        <div>
          <p className="page-kicker">运营控制台 · 2026 秋招</p>
          <h1 className="page-title">超级功能台</h1>
          <p className="page-description">把信号、内容、账户和增长动作压缩在一张可执行的管理桌面上。</p>
        </div>
        <div className="admin-console__hero-meta">
          <span>ACCESS</span>
          <strong>管理员权限已核验</strong>
          <small>写入动作继续沿用服务端权限边界</small>
        </div>
      </section>

      <div className="admin-console__grid">
        <section className="admin-console__queue" aria-labelledby="admin-queue-title">
          <header className="admin-console__section-head">
            <div>
              <span className="admin-console__section-index">WORK QUEUE / 01</span>
              <h2 id="admin-queue-title">工作模块</h2>
            </div>
            <span>5 个入口</span>
          </header>
          <div className="admin-console__queue-list">
            {adminActions.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="admin-console__queue-row">
                  <span className="admin-console__queue-icon"><Icon aria-hidden="true" /></span>
                  <span className="admin-console__queue-copy">
                    <span className="admin-console__queue-eyebrow">{item.eyebrow}</span>
                    <strong>{item.title}</strong>
                    <small>{item.body}</small>
                  </span>
                  <span className="admin-console__queue-note">{item.note}</span>
                  <ArrowUpRight aria-hidden="true" className="admin-console__queue-arrow" />
                </Link>
              );
            })}
          </div>
        </section>

        <aside className="admin-console__rail">
          <section className="admin-console__panel" aria-labelledby="admin-shortcuts-title">
            <header className="admin-console__section-head admin-console__section-head--compact">
              <div>
                <span className="admin-console__section-index">SHORTCUTS / 02</span>
                <h2 id="admin-shortcuts-title">快捷入口</h2>
              </div>
            </header>
            <div className="admin-console__tool-list">
              {adminTools.map((item) => {
                const Icon = item.icon;
                return <Link key={item.href} href={item.href}><Icon aria-hidden="true" /><span><strong>{item.title}</strong><small>{item.body}</small></span><ArrowUpRight aria-hidden="true" /></Link>;
              })}
            </div>
          </section>

          <section className="admin-console__panel" aria-labelledby="admin-status-title">
            <header className="admin-console__section-head admin-console__section-head--compact">
              <div>
                <span className="admin-console__section-index">SYSTEM / 03</span>
                <h2 id="admin-status-title">系统状态</h2>
              </div>
              <CheckCircle2 aria-hidden="true" className="admin-console__ok-icon" />
            </header>
            <dl className="admin-console__status-list">
              <div><dt>当前环境</dt><dd>Production</dd></div>
              <div><dt>访问角色</dt><dd>Administrator</dd></div>
              <div><dt>权限策略</dt><dd>RLS / Active</dd></div>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}
