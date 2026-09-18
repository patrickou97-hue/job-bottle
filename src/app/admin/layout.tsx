import type { Metadata } from "next";
import { AdminShell } from "@/components/layout/AdminShell";
import { requireAdminAccess } from "@/lib/admin-access";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const access = await requireAdminAccess();
  const initialAccess = "response" in access && access.response
    ? {
        allowed: false,
        message: access.response.status === 401 ? "请先登录管理员账号。" : access.response.status === 403 ? "无权限访问。" : "管理员权限暂时无法确认。",
      }
    : { allowed: true, message: "" };

  return <AdminShell initialAccess={initialAccess}>{children}</AdminShell>;
}
