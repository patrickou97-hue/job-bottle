import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/admin-access";

export async function GET() {
  const access = await requireAdminAccess();
  if ("response" in access) return access.response;

  return NextResponse.json(
    { userId: access.userId, isPrimaryAdmin: access.isPrimaryAdmin },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
