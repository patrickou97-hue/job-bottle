import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_SCOPE = "starjob-extension-match-v1";
const TOKEN_TTL_MS = 12 * 60 * 60 * 1_000;

type MatchTokenPayload = {
  exp: number;
  scope: typeof TOKEN_SCOPE;
  sub: string;
};

function getTokenSecret() {
  return process.env.EXTENSION_MATCH_TOKEN_SECRET || process.env.MIMO_API_KEY || "";
}

function sign(encodedPayload: string, secret: string) {
  return createHmac("sha256", secret).update(`${TOKEN_SCOPE}.${encodedPayload}`).digest("base64url");
}

export function createExtensionMatchToken(userId: string) {
  const secret = getTokenSecret();
  if (!secret) return null;
  const payload: MatchTokenPayload = {
    exp: Date.now() + TOKEN_TTL_MS,
    scope: TOKEN_SCOPE,
    sub: userId,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return {
    token: `${encodedPayload}.${sign(encodedPayload, secret)}`,
    expiresAt: new Date(payload.exp).toISOString(),
  };
}

export function verifyExtensionMatchToken(token: string) {
  const secret = getTokenSecret();
  const [encodedPayload, providedSignature, extra] = token.split(".");
  if (!secret || !encodedPayload || !providedSignature || extra) return null;

  const expectedSignature = sign(encodedPayload, secret);
  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as MatchTokenPayload;
    if (payload.scope !== TOKEN_SCOPE || typeof payload.sub !== "string" || !payload.sub || payload.exp <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
