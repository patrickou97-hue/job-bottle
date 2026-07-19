import type { Metadata } from "next";
import { UserShell } from "@/components/layout/UserShell";
import { ProfileClient } from "@/components/profile/ProfileClient";

export const metadata: Metadata = {
  title: "个人资料",
  robots: { index: false, follow: false },
};

export default function ProfilePage() {
  return (
    <UserShell>
      <ProfileClient />
    </UserShell>
  );
}
