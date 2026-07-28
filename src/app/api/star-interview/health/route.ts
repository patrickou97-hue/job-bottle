import { NextResponse } from "next/server";
import { getMimoConfiguration } from "@/lib/star-interview-server";

export function GET() {
  const configured = Boolean(getMimoConfiguration());
  return NextResponse.json(
    { service: "诘星 StarInterview", status: configured ? "ready" : "unconfigured" },
    {
      status: configured ? 200 : 503,
      headers: { "Cache-Control": "no-store", "X-StarInterview-Service": "cloud-v1" },
    },
  );
}
