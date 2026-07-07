import Link from "next/link";
import { Database, Rows3 } from "lucide-react";
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
    body: "上传 CSV，预览数据后写入岗位库。",
    icon: Database,
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
            <p className="page-subtitle">维护岗位数据、导入批次和展示状态。</p>
          </div>
        </section>

        <div className="grid gap-5 md:grid-cols-2">
          {adminActions.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="liquid-panel group p-5 transition hover:bg-white/[0.055]"
              >
                <div className="mb-5 flex size-11 items-center justify-center rounded-2xl bg-nebula-blue/8 text-nebula-blue">
                  <Icon aria-hidden="true" className="size-5" />
                </div>
                <h2 className="text-xl font-semibold text-ink-primary">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-ink-secondary">{item.body}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </AdminShell>
  );
}
