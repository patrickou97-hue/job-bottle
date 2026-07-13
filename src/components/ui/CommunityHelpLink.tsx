"use client";

import Link from "next/link";
import type { MouseEventHandler } from "react";

export function CommunityHelpLink({
  className = "",
  onClick,
}: {
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}) {
  return (
    <Link
      href="/forum"
      onClick={onClick}
      className={`text-action pressable min-h-10 text-sm font-medium underline decoration-[color:var(--line)] underline-offset-4 hover:decoration-[color:var(--aurora)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--aurora)] ${className}`}
    >
      去求职社区了解如何使用「拾星」
    </Link>
  );
}
