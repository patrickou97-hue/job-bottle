import { AdminUsersClient } from "@/components/admin/AdminUsersClient";
import { AdminShell } from "@/components/layout/AdminShell";

export default function AdminUsersPage() {
  return (
    <AdminShell>
      <div className="observatory-page space-y-7">
        <section className="page-hero">
          <div>
            <p className="page-kicker">账户与权限</p>
            <h1 className="page-title">用户管理</h1>
            <p className="page-description">查看全站账户和最近登录活跃度，按用户状态快速筛选，并管理身份与登录权限。</p>
          </div>
        </section>
        <AdminUsersClient />
      </div>
    </AdminShell>
  );
}
