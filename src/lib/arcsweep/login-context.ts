const AUTHORIZATION_PATH = "/api/mac-cleaner/v1/auth/authorize";
const APP_CLIENT_ID = "arcsweep-macos";
const APP_REDIRECT_URI = "arcsweep://oauth/callback";

/**
 * A presentation-only check for the StarJob login page. Authorization remains
 * validated by the server route; this only lets login explain where it will
 * return the user after a successful sign-in.
 */
export function isArcSweepAuthorizationReturn(value: string | null): boolean {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return false;

  try {
    const target = new URL(value, "https://starjob.invalid");
    return target.origin === "https://starjob.invalid"
      && target.pathname === AUTHORIZATION_PATH
      && target.searchParams.get("client_id") === APP_CLIENT_ID
      && target.searchParams.get("redirect_uri") === APP_REDIRECT_URI
      && target.searchParams.get("response_type") === "code"
      && target.searchParams.get("code_challenge_method") === "S256";
  } catch {
    return false;
  }
}
