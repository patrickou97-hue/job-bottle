import { CsvImportPanel } from "@/components/admin/CsvImportPanel";
import { AdminShell } from "@/components/layout/AdminShell";

export default function AdminImportPage() {
  return (
    <AdminShell>
      <CsvImportPanel />
    </AdminShell>
  );
}
