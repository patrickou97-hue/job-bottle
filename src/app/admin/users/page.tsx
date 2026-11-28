import type { Metadata } from "next";
import { AdminUsersClient } from "@/components/admin/AdminUsersClient";

import { BASIC_POLISH_HOURLY_LIMIT, BASIC_POLISH_WEEKLY_LIMIT, VIP_BASIC_POLISH_HOURLY_LIMIT, VIP_BASIC_POLISH_WEEKLY_LIMIT, VIP_ADVANCED_HOURLY_LIMIT, VIP_ADVANCED_WEEKLY_LIMIT, VIP_COMPOSE_DAILY_LIMIT, VIP_COMPOSE_WEEKLY_LIMIT } from "@/lib/starjob-vip";

export const metadata: Metadata = {
  title: "用户管理",
  robots: { index: false, follow: false },
};

export default function AdminUsersPage() {
  return (
    <div className="admin-page admin-page--users-page observatory-page space-y-7">
      <section className="page-hero">
        <div>
          <p className="page-kicker">账户、状态与产品权限</p>
          <h1 className="page-title">用户管理</h1>
          <p className="page-description">查找用户并查看使用情况，集中管理账户身份、登录状态与 StarJob VIP 会员资格。</p>
        </div>
      </section>
      <details className="rounded-xl border border-[color:var(--line-ghost)] px-5 py-4 text-sm">
        <summary className="cursor-pointer font-semibold">简历 AI 额度规则</summary>
        <ul className="mt-3 space-y-2 text-ink-secondary">
          <li>管理员按账号角色自动获得 VIP 权益，所有已开放的简历 AI、岗位问答与投递助手均不限次数。</li>
          <li>基础润色：普通用户每小时 {BASIC_POLISH_HOURLY_LIMIT} 次、每周 {BASIC_POLISH_WEEKLY_LIMIT} 次；StarJob VIP 每小时 {VIP_BASIC_POLISH_HOURLY_LIMIT} 次、每周 {VIP_BASIC_POLISH_WEEKLY_LIMIT} 次。</li>
          <li>高级润色与工作台继续修改：普通用户无使用额度，VIP 共享每小时 {VIP_ADVANCED_HOURLY_LIMIT} 次、每周 {VIP_ADVANCED_WEEKLY_LIMIT} 次。</li>
          <li>材料生成整份简历：VIP 每天 {VIP_COMPOSE_DAILY_LIMIT} 次、每周 {VIP_COMPOSE_WEEKLY_LIMIT} 次。</li>
        </ul>
        <p className="mt-3 text-xs text-ink-muted">成功生成新结果计一次。失败、取消或读取缓存结果不另扣次数。小时额度按最近 60 分钟滚动计算，日额度在北京时间零点恢复，周额度在周一零点恢复。</p>
      </details>
      <AdminUsersClient />
    </div>
  );
}
