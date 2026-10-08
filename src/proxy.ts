import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types";

/**
 * Keep the shared Supabase browser session fresh while ArcSweep's system
 * browser is on its consent endpoint. The route handler still calls getUser()
 * and remains the authority for approving an ArcSweep connection.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Let the route handler return its existing typed configuration error.
  if (!url || !publishableKey) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([name, value]) => {
          response.headers.set(name, value);
        });
      },
    },
  });

  // This refreshes and verifies the cookie session for this request. A
  // transient verification error is left for the route's existing getUser()
  // handling, so it cannot become a new proxy-generated failure page.
  try {
    await supabase.auth.getClaims();
  } catch {
    // Route handlers below remain responsible for user-facing auth errors.
  }

  return response;
}

export const config = {
  matcher: ["/api/mac-cleaner/v1/auth/authorize"],
};
