import { NextResponse } from "next/server";
import {
  getMimoCompletionConfiguration,
  getMimoConfiguration,
  STAR_INTERVIEW_FAST_ANSWER_MODEL,
} from "@/lib/star-interview-server";

export function GET() {
  const configured = Boolean(getMimoConfiguration());
  const fastAnswerConfigured = Boolean(
    getMimoCompletionConfiguration(STAR_INTERVIEW_FAST_ANSWER_MODEL),
  );
  return NextResponse.json(
    {
      service: "诘星 StarInterview",
      status: configured ? "ready" : "unconfigured",
      fastAnswer: fastAnswerConfigured ? "ready" : "unconfigured",
    },
    {
      status: configured ? 200 : 503,
      headers: { "Cache-Control": "no-store", "X-StarInterview-Service": "cloud-v1" },
    },
  );
}
