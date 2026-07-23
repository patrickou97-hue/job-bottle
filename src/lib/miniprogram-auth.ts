import "server-only";

import {
  createHmac,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
const TOKEN_AUDIENCE = "starjob-miniprogram";

type AccessTokenPayload = {
  sub: string;
  sid: string;
  aud: typeof TOKEN_AUDIENCE;
  iat: number;
  exp: number;
};

export type MiniProgramSessionPayload = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt: number;
  userId: string;
};

function getSessionSecret() {
  const secret = process.env.MINIPROGRAM_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("MINIPROGRAM_SESSION_SECRET is missing or too short.");
  }
  return secret;
}

function encodeJson(value: object) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(encoded: string) {
  return createHmac("sha256", getSessionSecret())
    .update(encoded)
    .digest("base64url");
}

function createAccessToken(userId: string, sessionId: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = encodeJson({ alg: "HS256", typ: "JWT" });
  const payload = encodeJson({
    sub: userId,
    sid: sessionId,
    aud: TOKEN_AUDIENCE,
    iat: now,
    exp: now + ACCESS_TOKEN_TTL_SECONDS,
  } satisfies AccessTokenPayload);
  const encoded = `${header}.${payload}`;
  return {
    token: `${encoded}.${sign(encoded)}`,
    expiresAt: (now + ACCESS_TOKEN_TTL_SECONDS) * 1000,
  };
}

export function hashMiniProgramIdentifier(kind: "openid" | "unionid", value: string) {
  return createHmac("sha256", getSessionSecret())
    .update(`wechat-${kind}:${value}`)
    .digest("hex");
}

export function hashRefreshToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createMiniProgramSession(userId: string) {
  const admin = createAdminClient();
  const refreshToken = randomBytes(32).toString("base64url");
  const refreshTokenExpiresAt =
    Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000;

  const { data, error } = await admin
    .from("miniprogram_sessions")
    .insert({
      user_id: userId,
      refresh_token_hash: hashRefreshToken(refreshToken),
      expires_at: new Date(refreshTokenExpiresAt).toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) throw error ?? new Error("Failed to create session.");
  const access = createAccessToken(userId, data.id);

  return {
    accessToken: access.token,
    refreshToken,
    accessTokenExpiresAt: access.expiresAt,
    refreshTokenExpiresAt,
    userId,
  } satisfies MiniProgramSessionPayload;
}

export async function rotateMiniProgramSession(refreshToken: string) {
  const admin = createAdminClient();
  const oldHash = hashRefreshToken(refreshToken);
  const { data: current, error: findError } = await admin
    .from("miniprogram_sessions")
    .select("id,user_id,expires_at,revoked_at")
    .eq("refresh_token_hash", oldHash)
    .maybeSingle();

  if (findError) throw findError;
  if (
    !current ||
    current.revoked_at ||
    new Date(current.expires_at).getTime() <= Date.now()
  ) {
    return null;
  }

  const nextRefreshToken = randomBytes(32).toString("base64url");
  const nextRefreshTokenExpiresAt =
    Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000;
  const { data: rotated, error: rotateError } = await admin
    .from("miniprogram_sessions")
    .update({
      refresh_token_hash: hashRefreshToken(nextRefreshToken),
      expires_at: new Date(nextRefreshTokenExpiresAt).toISOString(),
      last_used_at: new Date().toISOString(),
    })
    .eq("id", current.id)
    .eq("refresh_token_hash", oldHash)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();

  if (rotateError) throw rotateError;
  if (!rotated) return null;
  const access = createAccessToken(current.user_id, current.id);

  return {
    accessToken: access.token,
    refreshToken: nextRefreshToken,
    accessTokenExpiresAt: access.expiresAt,
    refreshTokenExpiresAt: nextRefreshTokenExpiresAt,
    userId: current.user_id,
  } satisfies MiniProgramSessionPayload;
}

export async function revokeMiniProgramSession(
  userId: string,
  refreshToken: string,
) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("miniprogram_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("refresh_token_hash", hashRefreshToken(refreshToken))
    .is("revoked_at", null);
  if (error) throw error;
}

export function verifyMiniProgramAccessToken(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const expected = sign(`${header}.${payload}`);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Partial<AccessTokenPayload>;
    const now = Math.floor(Date.now() / 1000);
    if (
      parsed.aud !== TOKEN_AUDIENCE ||
      typeof parsed.sub !== "string" ||
      typeof parsed.sid !== "string" ||
      typeof parsed.exp !== "number" ||
      parsed.exp <= now
    ) {
      return null;
    }
    return parsed as AccessTokenPayload;
  } catch {
    return null;
  }
}

export function authenticateMiniProgramRequest(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return verifyMiniProgramAccessToken(authorization.slice(7));
}
