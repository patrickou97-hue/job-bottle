import "server-only";

import { createHmac, randomInt } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const CODE_TTL_MS = 5 * 60 * 1000;
const MAX_GENERATION_ATTEMPTS = 5;

export class WechatWebLoginRateLimitError extends Error {}

function normalizeCode(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

function hashCode(value: string) {
  const secret = process.env.MINIPROGRAM_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("MINIPROGRAM_SESSION_SECRET is missing or too short.");
  }
  return createHmac("sha256", secret)
    .update(`wechat-web-login:${normalizeCode(value)}`)
    .digest("hex");
}

function generateCode() {
  return String(randomInt(0, 100_000_000)).padStart(8, "0");
}

export async function createWechatWebLoginCode(userId: string) {
  const admin = createAdminClient();

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const code = generateCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();
    const { data, error } = await admin.rpc(
      "reserve_wechat_web_login_code",
      {
        p_user_id: userId,
        p_code_hash: hashCode(code),
        p_expires_at: expiresAt,
      });
    if (!error && data) return { code, expiresAt };
    if (!error) throw new WechatWebLoginRateLimitError();
    if (error.code !== "23505") throw error;
  }

  throw new Error("Failed to generate a unique WeChat web login code.");
}

export async function consumeWechatWebLoginCode(
  value: string,
  requestFingerprint: string,
) {
  const code = normalizeCode(value);
  if (!/^\d{8}$/.test(code)) return null;

  const admin = createAdminClient();
  const fingerprintHash = createHmac("sha256", getSecret())
    .update(`wechat-web-login-attempt:${requestFingerprint}`)
    .digest("hex");
  const { data: hasAttemptSlot, error: slotError } = await admin.rpc(
    "take_wechat_web_login_attempt_slot",
    { p_fingerprint_hash: fingerprintHash },
  );
  if (slotError) throw slotError;
  if (!hasAttemptSlot) throw new WechatWebLoginRateLimitError();

  const { data, error } = await admin.rpc("consume_wechat_web_login_code", {
    p_code_hash: hashCode(code),
  });
  if (error) throw error;
  return data;
}

function getSecret() {
  const secret = process.env.MINIPROGRAM_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("MINIPROGRAM_SESSION_SECRET is missing or too short.");
  }
  return secret;
}
