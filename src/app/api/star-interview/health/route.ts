import { NextResponse } from "next/server";
import {
  getStarInterviewASRConfiguration,
  getStarInterviewLLMConfiguration,
} from "@/lib/star-interview-server";

export function GET() {
  const completionConfigured = Boolean(getStarInterviewLLMConfiguration());
  const asrConfigured = Boolean(getStarInterviewASRConfiguration());
  const configured = completionConfigured && asrConfigured;
  return NextResponse.json(
    {
      service: "诘星 StarInterview",
      status: configured ? "ready" : "unconfigured",
      completion: completionConfigured ? "ready" : "unconfigured",
      asr: asrConfigured ? "ready" : "unconfigured",
    },
    {
      status: configured ? 200 : 503,
      headers: { "Cache-Control": "no-store", "X-StarInterview-Service": "cloud-v1" },
    },
  );
}
