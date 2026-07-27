import assert from "node:assert/strict";
import {
  createCipheriv,
  createSign,
  generateKeyPairSync,
  randomBytes,
} from "node:crypto";
import test from "node:test";
// @ts-expect-error Node runs this standalone test with built-in TypeScript stripping.
import { getWechatPayConfiguration, verifyAndDecryptWechatNotification, verifyWechatSignature, WechatPayVerificationError } from "../src/lib/wechat-pay.ts";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const apiV3Key = "0123456789abcdef0123456789abcdef";
const platformSerial = "PUB_KEY_ID_3000000001";

function configurePaymentEnvironment() {
  process.env.WECHAT_PAY_MCH_ID = "1900000001";
  process.env.WECHAT_PAY_APP_ID = "wx1234567890abcdef";
  process.env.WECHAT_PAY_CERT_SERIAL_NO = "1DDE55AD98E0123456789ABCDEF0123456789ABC";
  process.env.WECHAT_PAY_PRIVATE_KEY = privateKey;
  process.env.WECHAT_PAY_API_V3_KEY = apiV3Key;
  process.env.WECHAT_PAY_PLATFORM_PUBLIC_KEY = publicKey;
  process.env.WECHAT_PAY_PLATFORM_SERIAL_NO = platformSerial;
  process.env.WECHAT_PAY_NOTIFY_URL =
    "https://www.starjob.space/api/star-interview/recharge/wechat-notify";
}

function signWechatMessage(timestamp: string, nonce: string, body: string) {
  const signer = createSign("RSA-SHA256");
  signer.update(`${timestamp}\n${nonce}\n${body}\n`);
  signer.end();
  return signer.sign(privateKey, "base64");
}

function notificationFor(transaction: Record<string, unknown>) {
  const nonce = randomBytes(12).toString("base64url").slice(0, 16);
  const associatedData = "transaction";
  const cipher = createCipheriv(
    "aes-256-gcm",
    Buffer.from(apiV3Key, "utf8"),
    Buffer.from(nonce, "utf8"),
  );
  cipher.setAAD(Buffer.from(associatedData, "utf8"));
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(transaction), "utf8"),
    cipher.final(),
    cipher.getAuthTag(),
  ]).toString("base64");
  return JSON.stringify({
    id: "EV-TEST",
    create_time: new Date().toISOString(),
    resource_type: "encrypt-resource",
    event_type: "TRANSACTION.SUCCESS",
    summary: "支付成功",
    resource: {
      original_type: "transaction",
      algorithm: "AEAD_AES_256_GCM",
      ciphertext,
      associated_data: associatedData,
      nonce,
    },
  });
}

test.beforeEach(() => {
  configurePaymentEnvironment();
});

test("accepts only a complete, structurally valid payment configuration", () => {
  assert.ok(getWechatPayConfiguration());
  process.env.WECHAT_PAY_API_V3_KEY = "too-short";
  assert.equal(getWechatPayConfiguration(), null);
  configurePaymentEnvironment();
  process.env.WECHAT_PAY_NOTIFY_URL = "https://attacker.example/collect";
  assert.equal(getWechatPayConfiguration(), null);
});

test("verifies signed WeChat messages and rejects stale or probe signatures", () => {
  const timestamp = Math.floor(Date.now() / 1_000).toString();
  const nonce = "nonce-for-test";
  const body = JSON.stringify({ code_url: "weixin://wxpay/test" });
  const signature = signWechatMessage(timestamp, nonce, body);
  assert.doesNotThrow(() => verifyWechatSignature({
    body,
    timestamp,
    nonce,
    signature,
    serial: platformSerial,
  }));
  assert.throws(() => verifyWechatSignature({
    body,
    timestamp: String(Number(timestamp) - 301),
    nonce,
    signature,
    serial: platformSerial,
  }), WechatPayVerificationError);
  assert.throws(() => verifyWechatSignature({
    body,
    timestamp,
    nonce,
    signature: `WECHATPAY/SIGNTEST/${signature}`,
    serial: platformSerial,
  }), WechatPayVerificationError);
});

test("verifies and decrypts a Native payment notification", () => {
  const transaction = {
    trade_state: "SUCCESS",
    trade_type: "NATIVE",
    appid: "wx1234567890abcdef",
    mchid: "1900000001",
    out_trade_no: "SI123456789",
    transaction_id: "42000000000000000000000000000001",
    attach: "59eb7d9c-c17e-4937-b95d-ced677f7ef40",
    amount: {
      total: 2000,
      payer_total: 1900,
      currency: "CNY",
      payer_currency: "CNY",
    },
  };
  const body = notificationFor(transaction);
  const timestamp = Math.floor(Date.now() / 1_000).toString();
  const nonce = "callback-nonce";
  const payment = verifyAndDecryptWechatNotification({
    body,
    timestamp,
    nonce,
    signature: signWechatMessage(timestamp, nonce, body),
    serial: platformSerial,
  });
  assert.deepEqual(payment, transaction);
});

test("rejects an otherwise signed notification with the wrong event type", () => {
  const body = notificationFor({}).replace(
    '"event_type":"TRANSACTION.SUCCESS"',
    '"event_type":"REFUND.SUCCESS"',
  );
  const timestamp = Math.floor(Date.now() / 1_000).toString();
  const nonce = "callback-nonce";
  assert.throws(() => verifyAndDecryptWechatNotification({
    body,
    timestamp,
    nonce,
    signature: signWechatMessage(timestamp, nonce, body),
    serial: platformSerial,
  }), WechatPayVerificationError);
});
