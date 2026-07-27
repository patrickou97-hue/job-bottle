import "server-only";

import {
  createDecipheriv,
  createPrivateKey,
  createPublicKey,
  createSign,
  createVerify,
  randomBytes,
} from "node:crypto";

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

type WechatPayAmount = {
  total: number;
  payer_total: number;
  currency: string;
  payer_currency: string;
};

export type WechatPayTransaction = {
  trade_state: string;
  trade_type?: string;
  appid: string;
  mchid: string;
  out_trade_no: string;
  transaction_id: string;
  attach?: string;
  success_time?: string;
  amount: WechatPayAmount;
};

type WechatPayNotificationEnvelope = {
  event_type: string;
  resource_type: string;
  resource: {
    algorithm: string;
    original_type: string;
    ciphertext: string;
    nonce: string;
    associated_data?: string;
  };
};

export class WechatPayVerificationError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "WechatPayVerificationError";
    this.code = code;
  }
}

export function getWechatPayConfiguration(): WechatPayConfiguration | null {
  const config = {
    mchId: process.env.WECHAT_PAY_MCH_ID?.trim(),
    appId: process.env.WECHAT_PAY_APP_ID?.trim(),
    certSerialNo: process.env.WECHAT_PAY_CERT_SERIAL_NO?.trim(),
    privateKey: normalizePem(process.env.WECHAT_PAY_PRIVATE_KEY),
    apiV3Key: process.env.WECHAT_PAY_API_V3_KEY?.trim(),
    platformPublicKey: normalizePem(process.env.WECHAT_PAY_PLATFORM_PUBLIC_KEY),
    platformSerialNo: process.env.WECHAT_PAY_PLATFORM_SERIAL_NO?.trim(),
    notifyUrl: (process.env.WECHAT_PAY_NOTIFY_URL
      || "https://www.starjob.space/api/star-interview/recharge/wechat-notify").trim(),
  };
  if (!Object.values(config).every(Boolean)) return null;
  if (!/^\d{8,32}$/.test(config.mchId!)
    || !/^wx[0-9A-Za-z]{16}$/.test(config.appId!)
    || !/^[0-9A-Fa-f]{16,64}$/.test(config.certSerialNo!)
    || !/^(?:PUB_KEY_ID_\d+|[0-9A-Fa-f]{16,64})$/.test(config.platformSerialNo!)
    || Buffer.byteLength(config.apiV3Key!, "utf8") !== 32
    || !isTrustedNotifyUrl(config.notifyUrl!)) {
    return null;
  }
  try {
    createPrivateKey(config.privateKey!);
    createPublicKey(config.platformPublicKey!);
  } catch {
    return null;
  }
  return config as WechatPayConfiguration;
}

export async function createWechatNativeOrder(input: {
  outTradeNo: string;
  amountFen: number;
  expiresAt: string;
  attach: string;
}) {
  const config = requireWechatPayConfiguration();
  const payload = await requestWechatPay<{ code_url?: string }>({
    method: "POST",
    path: "/v3/pay/transactions/native",
    body: {
      appid: config.appId,
      mchid: config.mchId,
      description: "诘星 StarInterview 余额充值",
      out_trade_no: input.outTradeNo,
      time_expire: input.expiresAt,
      notify_url: config.notifyUrl,
      attach: input.attach,
      amount: { total: input.amountFen, currency: "CNY" },
    },
  });
  if (!payload.code_url?.startsWith("weixin://wxpay/")) {
    throw new WechatPayVerificationError("WECHAT_PAY_CODE_URL_INVALID");
  }
  return payload.code_url;
}

export async function queryWechatNativeOrder(outTradeNo: string) {
  const config = requireWechatPayConfiguration();
  const encodedOrder = encodeURIComponent(outTradeNo);
  const encodedMchId = encodeURIComponent(config.mchId);
  return requestWechatPay<WechatPayTransaction>({
    method: "GET",
    path: `/v3/pay/transactions/out-trade-no/${encodedOrder}?mchid=${encodedMchId}`,
  });
}

export async function closeWechatNativeOrder(outTradeNo: string) {
  const config = requireWechatPayConfiguration();
  const encodedOrder = encodeURIComponent(outTradeNo);
  await requestWechatPay<Record<string, never>>({
    method: "POST",
    path: `/v3/pay/transactions/out-trade-no/${encodedOrder}/close`,
    body: { mchid: config.mchId },
    allowEmptyResponse: true,
  });
}

export function verifyAndDecryptWechatNotification(input: {
  body: string;
  timestamp: string;
  nonce: string;
  signature: string;
  serial: string;
}) {
  verifyWechatSignature(input);
  let envelope: WechatPayNotificationEnvelope;
  try {
    envelope = JSON.parse(input.body) as WechatPayNotificationEnvelope;
  } catch {
    throw new WechatPayVerificationError("WECHAT_PAY_ENVELOPE_INVALID");
  }
  if (envelope.event_type !== "TRANSACTION.SUCCESS"
    || envelope.resource_type !== "encrypt-resource"
    || envelope.resource?.algorithm !== "AEAD_AES_256_GCM"
    || envelope.resource?.original_type !== "transaction") {
    throw new WechatPayVerificationError("WECHAT_PAY_EVENT_INVALID");
  }
  const config = requireWechatPayConfiguration();
  const encrypted = decodeCiphertext(envelope.resource.ciphertext);
  const authTag = encrypted.subarray(encrypted.length - 16);
  const ciphertext = encrypted.subarray(0, encrypted.length - 16);
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      Buffer.from(config.apiV3Key, "utf8"),
      Buffer.from(envelope.resource.nonce, "utf8"),
    );
    decipher.setAuthTag(authTag);
    decipher.setAAD(Buffer.from(envelope.resource.associated_data ?? "", "utf8"));
    return JSON.parse(
      Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8"),
    ) as WechatPayTransaction;
  } catch {
    throw new WechatPayVerificationError("WECHAT_PAY_DECRYPTION_FAILED");
  }
}

export function verifyWechatSignature(input: {
  body: string;
  timestamp: string;
  nonce: string;
  signature: string;
  serial: string;
}) {
  const config = requireWechatPayConfiguration();
  if (input.serial !== config.platformSerialNo) {
    throw new WechatPayVerificationError("WECHAT_PAY_SERIAL_MISMATCH");
  }
  const timestamp = Number(input.timestamp);
  if (!Number.isInteger(timestamp)
    || Math.abs(Math.floor(Date.now() / 1_000) - timestamp) > 300) {
    throw new WechatPayVerificationError("WECHAT_PAY_TIMESTAMP_INVALID");
  }
  if (!input.nonce || !input.signature
    || input.signature.startsWith("WECHATPAY/SIGNTEST/")) {
    throw new WechatPayVerificationError("WECHAT_PAY_SIGNATURE_INVALID");
  }
  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${input.timestamp}\n${input.nonce}\n${input.body}\n`);
  verifier.end();
  if (!verifier.verify(config.platformPublicKey, input.signature, "base64")) {
    throw new WechatPayVerificationError("WECHAT_PAY_SIGNATURE_INVALID");
  }
}

export function validateWechatPaymentIdentity(
  input: Pick<WechatPayTransaction, "appid" | "mchid">,
) {
  const config = getWechatPayConfiguration();
  return Boolean(config && input.appid === config.appId && input.mchid === config.mchId);
}

async function requestWechatPay<T>(input: {
  method: "GET" | "POST";
  path: string;
  body?: unknown;
  allowEmptyResponse?: boolean;
}): Promise<T> {
  const config = requireWechatPayConfiguration();
  const requestBody = input.body === undefined ? "" : JSON.stringify(input.body);
  const timestamp = Math.floor(Date.now() / 1_000).toString();
  const nonce = randomBytes(16).toString("hex");
  const signature = sign(
    `${input.method}\n${input.path}\n${timestamp}\n${nonce}\n${requestBody}\n`,
    config.privateKey,
  );
  const authorization = [
    `mchid="${config.mchId}"`,
    `nonce_str="${nonce}"`,
    `timestamp="${timestamp}"`,
    `serial_no="${config.certSerialNo}"`,
    `signature="${signature}"`,
  ].join(",");
  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `WECHATPAY2-SHA256-RSA2048 ${authorization}`,
  };
  if (requestBody) headers["Content-Type"] = "application/json";
  if (config.platformSerialNo.startsWith("PUB_KEY_ID_")) {
    headers["Wechatpay-Serial"] = config.platformSerialNo;
  }
  const response = await fetch(`https://api.mch.weixin.qq.com${input.path}`, {
    method: input.method,
    headers,
    body: requestBody || undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  const responseBody = await response.text();
  verifyWechatSignature({
    body: responseBody,
    timestamp: response.headers.get("wechatpay-timestamp") ?? "",
    nonce: response.headers.get("wechatpay-nonce") ?? "",
    signature: response.headers.get("wechatpay-signature") ?? "",
    serial: response.headers.get("wechatpay-serial") ?? "",
  });
  if (!response.ok) {
    const errorCode = safeWechatErrorCode(responseBody);
    throw new Error(`WECHAT_PAY_REQUEST_FAILED:${response.status}:${errorCode}`);
  }
  if (!responseBody) {
    if (input.allowEmptyResponse) return {} as T;
    throw new WechatPayVerificationError("WECHAT_PAY_RESPONSE_EMPTY");
  }
  try {
    return JSON.parse(responseBody) as T;
  } catch {
    throw new WechatPayVerificationError("WECHAT_PAY_RESPONSE_INVALID");
  }
}

function requireWechatPayConfiguration() {
  const config = getWechatPayConfiguration();
  if (!config) throw new Error("WECHAT_PAY_NOT_CONFIGURED");
  return config;
}

function decodeCiphertext(value: string) {
  if (!value || value.length > 1_500_000) {
    throw new WechatPayVerificationError("WECHAT_PAY_CIPHERTEXT_INVALID");
  }
  const decoded = Buffer.from(value, "base64");
  if (decoded.length <= 16) {
    throw new WechatPayVerificationError("WECHAT_PAY_CIPHERTEXT_INVALID");
  }
  return decoded;
}

function safeWechatErrorCode(body: string) {
  try {
    const payload = JSON.parse(body) as { code?: unknown };
    return typeof payload.code === "string" ? payload.code.slice(0, 80) : "UNKNOWN";
  } catch {
    return "UNKNOWN";
  }
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

function isTrustedNotifyUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && url.hostname === "www.starjob.space"
      && url.pathname === "/api/star-interview/recharge/wechat-notify"
      && !url.search
      && !url.hash;
  } catch {
    return false;
  }
}
