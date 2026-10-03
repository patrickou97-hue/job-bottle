import { authenticate, errorResponse, jsonResponse, usage } from "@/lib/arcsweep/service";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try { const { db, userID } = await authenticate(request); return jsonResponse({ user_id: userID, usage: await usage(db, userID) }); } catch (error) { return errorResponse(error); }
}
