import "server-only";

import { createDecipheriv, createSign, createVerify, randomBytes } from "node:crypto";

type WechatPayConfiguration = {
  mchId: string;
  appId: string;
  certSerialNo: string;
  privateKey: string;
  apiV3Key: string;
  platformPublicKey: string;
  platformSerialNo: string;
  notifyUrl: string;
};

export function getWechatPayConfiguration(): WechatPayConfiguration | null {
  const config = {
    mchId: process.env.WECHAT_PAY_MCH_ID,
    appId: process.env.WECHAT_PAY_APP_ID,
    certSerialNo: process.env.WECHAT_PAY_CERT_SERIAL_NO,
    privateKey: normalizePem(process.env.WECHAT_PAY_PRIVATE_KEY),
    apiV3Key: process.env.WECHAT_PAY_API_V3_KEY,
    platformPublicKey: normalizePem(process.env.WECHAT_PAY_PLATFORM_PUBLIC_KEY),
    platformSerialNo: process.env.WECHAT_PAY_PLATFORM_SERIAL_NO,
    notifyUrl: process.env.WECHAT_PAY_NOTIFY_URL || "https://www.starjob.space/api/star-interview/recharge/wechat-notify",
  };
  return Object.values(config).every(Boolean) ? config as WechatPayConfiguration : null;
}

export async function createWechatNativeOrder(input: {
  outTradeNo: string;
  amountFen: number;
  expiresAt: string;
  attach: string;
}) {
  const config = getWechatPayConfiguration();
  if (!config) throw new Error("WECHAT_PAY_NOT_CONFIGURED");
  const path = "/v3/pay/transactions/native";
  const body = JSON.stringify({
    appid: config.appId,
    mchid: config.mchId,
    description: "诘星 StarInterview 余额充值",
    out_trade_no: input.outTradeNo,
    time_expire: input.expiresAt,
    notify_url: config.notifyUrl,
    attach: input.attach,
    amount: { total: input.amountFen, currency: "CNY" },
  });
  const timestamp = Math.floor(Date.now() / 1_000).toString();
  const nonce = randomBytes(16).toString("hex");
  const signature = sign(`POST\n${path}\n${timestamp}\n${nonce}\n${body}\n`, config.privateKey);
  const authorization = [
    `mchid="${config.mchId}"`,
    `nonce_str="${nonce}"`,
    `timestamp="${timestamp}"`,
    `serial_no="${config.certSerialNo}"`,
    `signature="${signature}"`,
  ].join(",");
  const response = await fetch(`https://api.mch.weixin.qq.com${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `WECHATPAY2-SHA256-RSA2048 ${authorization}`,
    },
    body,
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({})) as { code_url?: string; code?: string };
  if (!response.ok || !payload.code_url) {
    throw new Error(`WECHAT_PAY_ORDER_FAILED:${payload.code ?? response.status}`);
  }
  return payload.code_url;
}

export function verifyAndDecryptWechatNotification(input: {
  body: string;
  timestamp: string;
  nonce: string;
  signature: string;
  serial: string;
}) {
  const config = getWechatPayConfiguration();
  if (!config) throw new Error("WECHAT_PAY_NOT_CONFIGURED");
  if (input.serial !== config.platformSerialNo) throw new Error("WECHAT_PAY_SERIAL_MISMATCH");
  const timestamp = Number(input.timestamp);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1_000 - timestamp) > 300) {
    throw new Error("WECHAT_PAY_TIMESTAMP_INVALID");
  }
  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${input.timestamp}\n${input.nonce}\n${input.body}\n`);
  verifier.end();
  if (!verifier.verify(config.platformPublicKey, input.signature, "base64")) {
    throw new Error("WECHAT_PAY_SIGNATURE_INVALID");
  }
  const envelope = JSON.parse(input.body) as {
    resource: { ciphertext: string; nonce: string; associated_data?: string };
  };
  const encrypted = Buffer.from(envelope.resource.ciphertext, "base64");
  const authTag = encrypted.subarray(encrypted.length - 16);
  const ciphertext = encrypted.subarray(0, encrypted.length - 16);
  const decipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(config.apiV3Key, "utf8"),
    Buffer.from(envelope.resource.nonce, "utf8"),
  );
  decipher.setAuthTag(authTag);
  decipher.setAAD(Buffer.from(envelope.resource.associated_data ?? "", "utf8"));
  return JSON.parse(Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8")) as {
    trade_state: string;
    appid: string;
    mchid: string;
    out_trade_no: string;
    transaction_id: string;
    attach: string;
    amount: { total: number; payer_total: number; currency: string; payer_currency: string };
  };
}

export function validateWechatPaymentIdentity(input: { appid: string; mchid: string }) {
  const config = getWechatPayConfiguration();
  return Boolean(config && input.appid === config.appId && input.mchid === config.mchId);
}

function sign(message: string, privateKey: string) {
  const signer = createSign("RSA-SHA256");
  signer.update(message);
  signer.end();
  return signer.sign(privateKey, "base64");
}

function normalizePem(value: string | undefined) {
  return value?.replace(/\\n/g, "\n").trim();
}
