import Link from "next/link";
import { Database, Rows3, Users } from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";

const adminActions = [
  {
    href: "/admin/jobs",
    title: "岗位管理",
    body: "维护岗位、投递链接、上下架状态和公司信息。",
    icon: Rows3,
  },
  {
    href: "/admin/import",
    title: "批量导入",
    body: "上传 CSV 或 Excel，预览数据后写入岗位库。",
    icon: Database,
  },
  {
    href: "/admin/users",
    title: "用户管理",
    body: "查看用户账户、使用情况和邮箱状态，管理账户身份与登录权限。",
    icon: Users,
  },
];

export default function AdminPage() {
  return (
    <AdminShell>
      <div className="observatory-page space-y-8">
        <section className="page-hero">
          <div>
            <p className="page-kicker">数据维护</p>
            <h1 className="page-title">管理后台</h1>
          </div>
        </section>

        <div className="divide-y divide-white/[0.1] border-y border-white/[0.1]">
          {adminActions.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group grid gap-4 py-6 transition hover:bg-white/[0.025] sm:grid-cols-[44px_minmax(0,1fr)] sm:items-start"
              >
                <div className="flex size-11 items-center justify-center bg-nebula-blue/8 text-nebula-blue">
                  <Icon aria-hidden="true" className="size-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-ink-primary">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-ink-secondary">{item.body}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </AdminShell>
  );
}
