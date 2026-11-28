import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { navGroups } from "@/components/layout/admin-navigation";

export const metadata: Metadata = {
  title: "管理后台",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <div className="observatory-page admin-page">
      <header className="page-hero">
        <div>
          <h1 className="page-title">管理后台</h1>
          <p className="page-description">管理岗位、用户和反馈，查看拾星的运营数据。</p>
        </div>
      </header>
      <div className="admin-overview">
        {navGroups.map(({ label, items }) => (
          <section key={label} className="admin-overview__group" aria-label={label}>
            <h2>{label}</h2>
            <ul>
              {items.filter(item => item.href !== "/admin").map(({ href, icon: Icon, label, description }) => (
                <li key={href}>
                  <Link href={href} className="admin-overview__link">
                    <Icon aria-hidden="true" className="size-5" />
                    <span><strong>{label}</strong><small>{description}</small></span>
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
