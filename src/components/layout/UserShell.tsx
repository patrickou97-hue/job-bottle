import type { ReactNode } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { SpaceShell } from "@/components/layout/SpaceShell";

export function UserShell({ children }: { children: ReactNode }) {
  return (
    <SpaceShell>
      <Navbar />
      <main className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        {children}
      </main>
    </SpaceShell>
  );
}
