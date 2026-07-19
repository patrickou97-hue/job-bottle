import type { Metadata } from "next";
import { ExtensionGuide } from "@/components/extension/ExtensionGuide";
import { UserShell } from "@/components/layout/UserShell";

export const metadata: Metadata = {
  title: "拾星网申助手安装教程",
  description: "下载、安装、同步和使用拾星网申助手。",
  alternates: { canonical: "/extension/guide" },
};

export default function ExtensionGuidePage() {
  return (
    <UserShell>
      <ExtensionGuide />
    </UserShell>
  );
}
