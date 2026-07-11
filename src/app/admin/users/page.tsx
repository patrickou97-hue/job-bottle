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
            <p className="page-description">查看账户状态、求职资料和使用情况，管理用户身份与登录权限。</p>
          </div>
        </section>
        <AdminUsersClient />
      </div>
    </AdminShell>
  );
}
