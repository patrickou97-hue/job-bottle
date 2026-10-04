const AUTHORIZATION_PATH = "/api/mac-cleaner/v1/auth/authorize";
const APP_CLIENT_ID = "arcsweep-macos";
const APP_REDIRECT_URI = "arcsweep://oauth/callback";
const LOCAL_ORIGIN = "https://starjob.invalid";

/**
 * Fail-closed return navigation for login and registration. Keep the original
 * path/query byte-for-byte after validating it so nested PKCE parameters are
 * preserved exactly; never let a login query turn into an external redirect.
 */
export function safeLocalReturnPath(value: string | null): string {
  const rawPath = value?.split(/[?#]/, 1)[0] ?? "";
  if (
    !value
    || !value.startsWith("/")
    || value.startsWith("//")
    || rawPath.includes("\\")
    || /%(?:2f|5c)/i.test(rawPath)
    || /[\u0000-\u001f\u007f]/.test(value)
  ) return "/";

  try {
    const target = new URL(value, LOCAL_ORIGIN);
    return target.origin === LOCAL_ORIGIN ? value : "/";
  } catch {
    return "/";
  }
}

/**
 * A presentation-only check for the shared login route. Authorization remains
 * validated by the server route; this only selects Arc-branded copy after
 * validating the exact same-origin ArcSweep return.
 */
export function isArcSweepAuthorizationReturn(value: string | null): boolean {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return false;

  try {
    const target = new URL(value, LOCAL_ORIGIN);
    return target.origin === LOCAL_ORIGIN
      && target.pathname === AUTHORIZATION_PATH
      && target.searchParams.get("client_id") === APP_CLIENT_ID
      && target.searchParams.get("redirect_uri") === APP_REDIRECT_URI
      && target.searchParams.get("response_type") === "code"
      && target.searchParams.get("code_challenge_method") === "S256";
  } catch {
    return false;
  }
}
