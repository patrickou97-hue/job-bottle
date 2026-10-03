import { errorResponse, jsonResponse, review } from "@/lib/arcsweep/service";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try { return jsonResponse(await review(request)); } catch (error) { return errorResponse(error); }
}
