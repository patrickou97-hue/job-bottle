import type { Metadata } from "next";
import { CsvImportPanel } from "@/components/admin/CsvImportPanel";

export const metadata: Metadata = {
  title: "批量导入",
  robots: { index: false, follow: false },
};

export default function AdminImportPage() {
  return <CsvImportPanel />;
}
