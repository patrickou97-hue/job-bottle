import assert from "node:assert/strict";
import test from "node:test";
const wavAudioModulePath = "../src/lib/wav-audio." + "ts";
const {
  createWavAudioBillingKey,
  isMaterialWavDurationMismatch,
  normalizeBase64WavAudio,
  parseBase64WavMetadata,
  resolveBillableWavAudio,
  WavAudioFormatError,
} = await import(wavAudioModulePath);

const CLIENT_METER_KEY = "00000000-0000-4000-8000-000000000001";

test("服务端按 WAV 数据帧计算实际时长", () => {
  const audio = createPcmWav({ durationMs: 1_500, sampleRate: 16_000, channels: 1, bitsPerSample: 16 });
  assert.deepEqual(parseBase64WavMetadata(audio.toString("base64")), {
    durationMs: 1_500,
    sampleRate: 16_000,
    channels: 1,
    bitsPerSample: 16,
    dataBytes: 48_000,
  });
});

test("解析器支持带奇数字节扩展块的合法 WAV", () => {
  const audio = createPcmWav({
    durationMs: 250,
    sampleRate: 8_000,
    channels: 1,
    bitsPerSample: 8,
    extraChunk: Buffer.from([1, 2, 3]),
  });
  assert.equal(parseBase64WavMetadata(audio.toString("base64")).durationMs, 250);
});

test("篡改 byteRate 或截断 data 块会被拒绝", () => {
  const inconsistent = createPcmWav({ durationMs: 500 });
  inconsistent.writeUInt32LE(999_999, 28);
  assert.throws(
    () => parseBase64WavMetadata(inconsistent.toString("base64")),
    WavAudioFormatError,
  );

  const truncated = createPcmWav({ durationMs: 500 }).subarray(0, -10);
  assert.throws(
    () => parseBase64WavMetadata(truncated.toString("base64")),
    WavAudioFormatError,
  );

  const hiddenTrailingAudio = Buffer.concat([
    createPcmWav({ durationMs: 500 }),
    Buffer.alloc(1_000),
  ]);
  assert.throws(
    () => parseBase64WavMetadata(hiddenTrailingAudio.toString("base64")),
    WavAudioFormatError,
  );
});

test("拒绝可让解析器与上游解码器产生歧义的重复 fmt 块", () => {
  const wav = createPcmWav({ durationMs: 1_000 });
  const duplicateFmt = Buffer.concat([
    wav.subarray(0, 36),
    wav.subarray(12, 36),
    wav.subarray(36),
  ]);
  duplicateFmt.writeUInt32LE(duplicateFmt.length - 8, 4);
  assert.throws(
    () => parseBase64WavMetadata(duplicateFmt.toString("base64")),
    WavAudioFormatError,
  );
});

test("客户端时长只用于识别显著偏差", () => {
  assert.equal(isMaterialWavDurationMismatch(10_000, undefined), false);
  assert.equal(isMaterialWavDurationMismatch(10_000, 9_200), false);
  assert.equal(isMaterialWavDurationMismatch(10_000, 100), true);

  const resolved = resolveBillableWavAudio(
    createPcmWav({ durationMs: 10_000 }).toString("base64"),
    100,
  );
  assert.equal(resolved.durationMs, 10_000);
  assert.equal(resolved.clientDurationMismatch, true);
});

test("同一客户端 UUID 的不同 WAV 使用不同计费键", () => {
  const first = createPcmWav({ durationMs: 1_000 });
  const second = Buffer.from(first);
  second[second.length - 1] = 1;

  const firstKey = createWavAudioBillingKey(
    first.toString("base64"),
    "auto",
    CLIENT_METER_KEY,
  );
  const secondKey = createWavAudioBillingKey(
    second.toString("base64"),
    "auto",
    CLIENT_METER_KEY,
  );

  assert.notEqual(firstKey, secondKey);
  assert.match(firstKey, /^v2:[0-9a-f-]{36}:[0-9a-f]{64}$/);
  assert.ok(firstKey.length <= 120);
  assert.equal(new Set([firstKey, secondKey]).size, 2, "两段音频必须形成两笔独立 meter");
});

test("同一 WAV、语言和客户端 UUID 的网络重试保持计费幂等", () => {
  const audio = createPcmWav({ durationMs: 1_000 }).toString("base64");
  const original = createWavAudioBillingKey(audio, "zh", CLIENT_METER_KEY);
  const retry = createWavAudioBillingKey(
    `data:audio/wav;base64,${audio}`,
    "zh",
    CLIENT_METER_KEY.toUpperCase(),
  );
  assert.equal(original, retry);
  assert.equal(new Set([original, retry]).size, 1, "完全相同的重试只能形成一笔 meter");
  assert.notEqual(
    original,
    createWavAudioBillingKey(audio, "en", CLIENT_METER_KEY),
    "语言改变后上游请求和计费键都必须改变",
  );
});

test("WAV data URI 转发前规范化为单一 base64 负载", () => {
  const audio = createPcmWav({ durationMs: 1_000 }).toString("base64");
  assert.equal(normalizeBase64WavAudio(audio), audio);
  assert.equal(normalizeBase64WavAudio(`data:audio/wav;base64,${audio}`), audio);
  assert.doesNotMatch(
    `data:audio/wav;base64,${normalizeBase64WavAudio(`data:audio/wav;base64,${audio}`)}`,
    /base64,data:audio/i,
  );
});

function createPcmWav({
  durationMs,
  sampleRate = 16_000,
  channels = 1,
  bitsPerSample = 16,
  extraChunk,
}: {
  durationMs: number;
  sampleRate?: number;
  channels?: number;
  bitsPerSample?: number;
  extraChunk?: Buffer;
}) {
  const blockAlign = channels * (bitsPerSample / 8);
  const dataBytes = Math.round(sampleRate * (durationMs / 1_000)) * blockAlign;
  const extraBytes = extraChunk ? 8 + extraChunk.length + (extraChunk.length % 2) : 0;
  const output = Buffer.alloc(44 + extraBytes + dataBytes);
  output.write("RIFF", 0, "ascii");
  output.writeUInt32LE(output.length - 8, 4);
  output.write("WAVE", 8, "ascii");
  output.write("fmt ", 12, "ascii");
  output.writeUInt32LE(16, 16);
  output.writeUInt16LE(1, 20);
  output.writeUInt16LE(channels, 22);
  output.writeUInt32LE(sampleRate, 24);
  output.writeUInt32LE(sampleRate * blockAlign, 28);
  output.writeUInt16LE(blockAlign, 32);
  output.writeUInt16LE(bitsPerSample, 34);

  let dataOffset = 36;
  if (extraChunk) {
    output.write("JUNK", dataOffset, "ascii");
    output.writeUInt32LE(extraChunk.length, dataOffset + 4);
    extraChunk.copy(output, dataOffset + 8);
    dataOffset += 8 + extraChunk.length + (extraChunk.length % 2);
  }
  output.write("data", dataOffset, "ascii");
  output.writeUInt32LE(dataBytes, dataOffset + 4);
  return output;
}
