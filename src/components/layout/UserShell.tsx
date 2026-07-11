import type { ReactNode } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { SpaceShell } from "@/components/layout/SpaceShell";

export function UserShell({
  children,
  variant = "work",
}: {
  children: ReactNode;
  variant?: "scene" | "work";
}) {
  const content = (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-[1320px] px-4 pb-24 pt-8 sm:px-6 md:pb-10 lg:px-8 lg:py-10">
        {children}
      </main>
    </>
  );

  if (variant === "scene") {
    return <SpaceShell variant="scene">{content}</SpaceShell>;
  }

  return (
    <SpaceShell>{content}</SpaceShell>
  );
}
