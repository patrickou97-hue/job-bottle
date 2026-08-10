import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";

const RIFF_HEADER_BYTES = 12;
const CHUNK_HEADER_BYTES = 8;
const MIN_FMT_CHUNK_BYTES = 16;

export type WavAudioMetadata = {
  durationMs: number;
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  dataBytes: number;
};

export type BillableWavAudio = WavAudioMetadata & {
  clientDurationMismatch: boolean;
};

export class WavAudioFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WavAudioFormatError";
  }
}

/**
 * Measures uncompressed PCM/IEEE-float WAV audio from its actual data chunk.
 * Header values are cross-checked so callers cannot lower billing by changing
 * a client-reported duration or a single byte-rate field.
 */
export function parseBase64WavMetadata(value: string): WavAudioMetadata {
  const audio = decodeBase64(value);
  if (audio.length < RIFF_HEADER_BYTES) throw invalidWav("header");
  if (readFourCC(audio, 0) !== "RIFF" || readFourCC(audio, 8) !== "WAVE") {
    throw invalidWav("container");
  }
  if (audio.readUInt32LE(4) + 8 !== audio.length) throw invalidWav("riff_size");

  let format: {
    audioFormat: number;
    channels: number;
    sampleRate: number;
    byteRate: number;
    blockAlign: number;
    bitsPerSample: number;
  } | null = null;
  let dataBytes = 0;
  let sawFormatChunk = false;
  let sawDataChunk = false;

  for (let offset = RIFF_HEADER_BYTES; offset < audio.length;) {
    if (audio.length - offset < CHUNK_HEADER_BYTES) throw invalidWav("chunk_header");
    const chunkId = readFourCC(audio, offset);
    const chunkSize = audio.readUInt32LE(offset + 4);
    const payloadOffset = offset + CHUNK_HEADER_BYTES;
    const payloadEnd = payloadOffset + chunkSize;
    if (payloadEnd > audio.length) throw invalidWav("chunk_size");

    if (chunkId === "fmt ") {
      if (sawFormatChunk) throw invalidWav("duplicate_fmt");
      if (chunkSize < MIN_FMT_CHUNK_BYTES) throw invalidWav("fmt_size");
      sawFormatChunk = true;
      format = {
        audioFormat: audio.readUInt16LE(payloadOffset),
        channels: audio.readUInt16LE(payloadOffset + 2),
        sampleRate: audio.readUInt32LE(payloadOffset + 4),
        byteRate: audio.readUInt32LE(payloadOffset + 8),
        blockAlign: audio.readUInt16LE(payloadOffset + 12),
        bitsPerSample: audio.readUInt16LE(payloadOffset + 14),
      };
    } else if (chunkId === "data") {
      sawDataChunk = true;
      dataBytes += chunkSize;
    }

    const paddedEnd = payloadEnd + (chunkSize % 2);
    if (paddedEnd > audio.length) {
      // Some encoders omit the final pad byte for an odd-sized last chunk.
      if (payloadEnd === audio.length) break;
      throw invalidWav("chunk_padding");
    }
    offset = paddedEnd;
  }

  if (!format || !sawDataChunk || dataBytes === 0) throw invalidWav("required_chunks");
  const {
    audioFormat,
    channels,
    sampleRate,
    byteRate,
    blockAlign,
    bitsPerSample,
  } = format;
  if (audioFormat !== 1 && audioFormat !== 3) throw invalidWav("codec");
  if (channels < 1 || channels > 8 || sampleRate < 8_000 || sampleRate > 192_000) {
    throw invalidWav("sample_format");
  }
  const validBits = audioFormat === 3
    ? bitsPerSample === 32 || bitsPerSample === 64
    : bitsPerSample === 8 || bitsPerSample === 16 || bitsPerSample === 24 || bitsPerSample === 32;
  if (!validBits) throw invalidWav("sample_bits");

  const expectedBlockAlign = channels * (bitsPerSample / 8);
  const expectedByteRate = sampleRate * expectedBlockAlign;
  if (
    !Number.isInteger(expectedBlockAlign)
    || blockAlign !== expectedBlockAlign
    || byteRate !== expectedByteRate
    || dataBytes % blockAlign !== 0
  ) {
    throw invalidWav("inconsistent_format");
  }

  const durationMs = Math.ceil((dataBytes * 1_000) / expectedByteRate);
  if (!Number.isSafeInteger(durationMs) || durationMs < 1) throw invalidWav("duration");
  return { durationMs, sampleRate, channels, bitsPerSample, dataBytes };
}

export function isMaterialWavDurationMismatch(
  measuredDurationMs: number,
  clientDurationMs: number | undefined,
) {
  if (clientDurationMs === undefined) return false;
  const toleranceMs = Math.max(1_000, Math.ceil(measuredDurationMs * 0.15));
  return Math.abs(measuredDurationMs - clientDurationMs) > toleranceMs;
}

export function resolveBillableWavAudio(
  value: string,
  clientDurationMs?: number,
): BillableWavAudio {
  const metadata = parseBase64WavMetadata(value);
  return {
    ...metadata,
    clientDurationMismatch: isMaterialWavDurationMismatch(
      metadata.durationMs,
      clientDurationMs,
    ),
  };
}

/** Return one canonical base64 payload regardless of whether the client sent
 * raw base64 or a WAV data URI. This prevents callers from adding a second
 * `data:audio/wav;base64,` prefix before forwarding audio upstream. */
export function normalizeBase64WavAudio(value: string) {
  return decodeBase64(value).toString("base64");
}

/**
 * Bind an ASR billing meter to the exact validated WAV bytes.
 *
 * Released clients intentionally keep sending a UUID so network retries remain
 * idempotent. The server adds a full SHA-256 digest of that UUID, the requested
 * language, and the decoded audio bytes so reusing a client UUID for different
 * recordings can never reuse the same usage meter.
 */
export function createWavAudioBillingKey(
  value: string,
  language: "auto" | "zh" | "en",
  clientMeterKey: string,
) {
  const normalizedMeterKey = clientMeterKey.trim().toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(normalizedMeterKey)) {
    throw new TypeError("Invalid ASR client meter key");
  }
  const audio = decodeBase64(value);
  const digest = createHash("sha256")
    .update("star-interview-asr-v2\0")
    .update(normalizedMeterKey)
    .update("\0")
    .update(language)
    .update("\0")
    .update(audio)
    .digest("hex");
  const billingKey = `v2:${normalizedMeterKey}:${digest}`;
  if (billingKey.length > 120) throw new Error("ASR billing key exceeds meter limit");
  return billingKey;
}

function decodeBase64(value: string) {
  const payload = value.trim().replace(/^data:audio\/wav;base64,/i, "").replace(/\s+/g, "");
  if (
    payload.length === 0
    || payload.length % 4 === 1
    || !/^[A-Za-z0-9+/]*={0,2}$/.test(payload)
  ) {
    throw invalidWav("base64");
  }
  const decoded = Buffer.from(payload, "base64");
  const canonicalInput = payload.replace(/=+$/, "");
  const canonicalDecoded = decoded.toString("base64").replace(/=+$/, "");
  if (decoded.length === 0 || canonicalDecoded !== canonicalInput) throw invalidWav("base64");
  return decoded;
}

function readFourCC(value: Buffer, offset: number) {
  return value.toString("ascii", offset, offset + 4);
}

function invalidWav(reason: string) {
  return new WavAudioFormatError(`Invalid WAV audio: ${reason}`);
}
