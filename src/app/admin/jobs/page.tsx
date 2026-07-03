import { AdminJobsClient } from "@/components/admin/AdminJobsClient";
import { AdminShell } from "@/components/layout/AdminShell";

export default function AdminJobsPage() {
  return (
    <AdminShell>
      <AdminJobsClient />
    </AdminShell>
  );
}
