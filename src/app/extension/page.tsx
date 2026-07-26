import type { Metadata } from "next";
import { ExtensionHubClient } from "@/components/extension/ExtensionHubClient";
import { UserShell } from "@/components/layout/UserShell";

export const metadata: Metadata = {
  title: "拾星网申助手",
  description: "将拾星简历同步至浏览器，在企业网申页面填写常用字段。",
  alternates: { canonical: "/extension" },
};

export default function ExtensionPage() {
  return (
    <UserShell>
      <ExtensionHubClient />
    </UserShell>
  );
}
