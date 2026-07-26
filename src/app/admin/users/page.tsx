import { AdminUsersClient } from "@/components/admin/AdminUsersClient";
import { AdminShell } from "@/components/layout/AdminShell";

export default function AdminUsersPage() {
  return (
    <AdminShell>
      <div className="observatory-page space-y-7">
        <section className="page-hero">
          <div>
            <p className="page-kicker">账户、状态与产品权限</p>
            <h1 className="page-title">用户管理</h1>
            <p className="page-description">查找用户并查看使用情况，集中管理账户身份、登录状态与 StarInterview 访问权限。</p>
          </div>
        </section>
        <AdminUsersClient />
      </div>
    </AdminShell>
  );
}
