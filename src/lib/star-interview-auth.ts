import "server-only";

import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const TOKEN_AUDIENCE = "star-interview";
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
const AUTH_CODE_TTL_SECONDS = 3 * 60;
export const STAR_INTERVIEW_SCOPES = ["profile:read", "resumes:read"] as const;

type AccessTokenPayload = {
  sub: string;
  sid: string;
  aud: typeof TOKEN_AUDIENCE;
  scopes: string[];
  iat: number;
  exp: number;
};

function getSessionSecret() {
  const secret = process.env.STAR_INTERVIEW_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("STAR_INTERVIEW_SESSION_SECRET is missing or too short.");
  }
  return secret;
}

function encodeJson(value: object) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function sign(encoded: string) {
  return createHmac("sha256", getSessionSecret()).update(encoded).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function createAccessToken(userId: string, sessionId: string, scopes: string[]) {
  const now = Math.floor(Date.now() / 1_000);
  const header = encodeJson({ alg: "HS256", typ: "JWT" });
  const payload = encodeJson({
    sub: userId,
    sid: sessionId,
    aud: TOKEN_AUDIENCE,
    scopes,
    iat: now,
    exp: now + ACCESS_TOKEN_TTL_SECONDS,
  } satisfies AccessTokenPayload);
  const encoded = `${header}.${payload}`;
  return {
    token: `${encoded}.${sign(encoded)}`,
    expiresAt: (now + ACCESS_TOKEN_TTL_SECONDS) * 1_000,
  };
}

export async function createStarInterviewAuthorizationCode(input: {
  userId: string;
  installId: string;
  pkceChallenge: string;
  state: string;
}) {
  const admin = createAdminClient();
  const code = randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + AUTH_CODE_TTL_SECONDS * 1_000;
  const { error } = await admin.from("star_interview_auth_codes").insert({
    code_hash: hash(code),
    user_id: input.userId,
    install_id_hash: hash(input.installId),
    pkce_challenge: input.pkceChallenge,
    state_hash: hash(input.state),
    scopes: [...STAR_INTERVIEW_SCOPES],
    selected_resume_ids: [],
    expires_at: new Date(expiresAt).toISOString(),
  });
  if (error) throw error;
  return { code, expiresAt };
}

export async function exchangeStarInterviewAuthorizationCode(input: {
  code: string;
  verifier: string;
  installId: string;
  state: string;
}) {
  const admin = createAdminClient();
  const codeHash = hash(input.code);
  const { data: current, error: findError } = await admin
    .from("star_interview_auth_codes")
    .select("*")
    .eq("code_hash", codeHash)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (findError) throw findError;
  if (
    !current ||
    !safeEqual(current.install_id_hash, hash(input.installId)) ||
    !safeEqual(current.state_hash, hash(input.state)) ||
    !safeEqual(current.pkce_challenge, pkceChallenge(input.verifier))
  ) {
    return null;
  }

  const { data: consumed, error: consumeError } = await admin
    .from("star_interview_auth_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", current.id)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("id")
    .maybeSingle();
  if (consumeError) throw consumeError;
  if (!consumed) return null;

  return createSession({
    userId: current.user_id,
    installIdHash: current.install_id_hash,
    scopes: current.scopes,
  });
}

async function createSession(input: {
  userId: string;
  installIdHash: string;
  scopes: string[];
}) {
  const admin = createAdminClient();
  const refreshToken = randomBytes(32).toString("base64url");
  const refreshTokenExpiresAt = Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1_000;
  const { data, error } = await admin
    .from("star_interview_sessions")
    .insert({
      user_id: input.userId,
      install_id_hash: input.installIdHash,
      refresh_token_hash: hash(refreshToken),
      scopes: input.scopes,
      selected_resume_ids: [],
      expires_at: new Date(refreshTokenExpiresAt).toISOString(),
    })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("Failed to create StarInterview session.");
  const access = createAccessToken(input.userId, data.id, input.scopes);
  return {
    accessToken: access.token,
    refreshToken,
    accessTokenExpiresAt: access.expiresAt,
    refreshTokenExpiresAt,
  };
}

export async function rotateStarInterviewSession(refreshToken: string, installId: string) {
  const admin = createAdminClient();
  const oldHash = hash(refreshToken);
  const { data: current, error: findError } = await admin
    .from("star_interview_sessions")
    .select("*")
    .eq("refresh_token_hash", oldHash)
    .eq("install_id_hash", hash(installId))
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (findError) throw findError;
  if (!current) return null;

  const nextRefreshToken = randomBytes(32).toString("base64url");
  const nextExpiresAt = Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1_000;
  const { data: rotated, error } = await admin
    .from("star_interview_sessions")
    .update({
      refresh_token_hash: hash(nextRefreshToken),
      expires_at: new Date(nextExpiresAt).toISOString(),
      last_used_at: new Date().toISOString(),
    })
    .eq("id", current.id)
    .eq("refresh_token_hash", oldHash)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!rotated) return null;
  const access = createAccessToken(current.user_id, current.id, current.scopes);
  return {
    accessToken: access.token,
    refreshToken: nextRefreshToken,
    accessTokenExpiresAt: access.expiresAt,
    refreshTokenExpiresAt: nextExpiresAt,
  };
}

export function verifyStarInterviewAccessToken(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  if (!safeEqual(signature, sign(`${header}.${payload}`))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<AccessTokenPayload>;
    if (
      parsed.aud !== TOKEN_AUDIENCE ||
      typeof parsed.sub !== "string" ||
      typeof parsed.sid !== "string" ||
      !Array.isArray(parsed.scopes) ||
      typeof parsed.exp !== "number" ||
      parsed.exp <= Math.floor(Date.now() / 1_000)
    ) return null;
    return parsed as AccessTokenPayload;
  } catch {
    return null;
  }
}

export async function authenticateStarInterviewRequest(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const installId = request.headers.get("x-starinterview-install-id");
  if (!authorization?.startsWith("Bearer ") || !installId) return null;
  const access = verifyStarInterviewAccessToken(authorization.slice(7));
  if (!access) return null;
  const { data, error } = await createAdminClient()
    .from("star_interview_sessions")
    .select("id,install_id_hash")
    .eq("id", access.sid)
    .eq("user_id", access.sub)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error || !data || !safeEqual(data.install_id_hash, hash(installId))) return null;
  return access;
}

export async function authenticateStarInterviewAppRequest(request: NextRequest) {
  if (request.headers.get("x-starinterview-client") !== "macos-v1") return null;
  return authenticateStarInterviewRequest(request);
}

export async function revokeStarInterviewSession(sessionId: string, userId: string) {
  const { error } = await createAdminClient()
    .from("star_interview_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("user_id", userId)
    .is("revoked_at", null);
  if (error) throw error;
}

export function pkceChallenge(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}
