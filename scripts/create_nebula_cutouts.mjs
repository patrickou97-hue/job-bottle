import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const sourceDirectory = path.resolve("public/assets/nebula");
const outputDirectory = path.join(sourceDirectory, "cutouts");
const assetNames = [
  "nebula-role-fork",
  "nebula-role-triad",
  "nebula-role-crescent",
  "nebula-role-spiral",
  "nebula-role-cross",
  "nebula-role-ring",
  "nebula-region-shenzhen",
  "nebula-region-guangzhou",
  "nebula-region-chengdu",
  "nebula-region-national",
  "nebula-industry-manufacturing",
  "nebula-industry-consumer",
  "nebula-industry-healthcare",
  "nebula-industry-energy",
];

const clamp = (value) => Math.max(0, Math.min(1, value));
const smoothstep = (value) => {
  const clamped = clamp(value);
  return clamped * clamped * (3 - 2 * clamped);
};

await fs.mkdir(outputDirectory, { recursive: true });

await Promise.all(assetNames.map(async (name) => {
  const input = path.join(sourceDirectory, `${name}.png`);
  const output = path.join(outputDirectory, `${name}.png`);
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  for (let offset = 0; offset < data.length; offset += info.channels) {
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    const sourceAlpha = data[offset + 3] / 255;
    const brightness = Math.max(red, green, blue);

    // The source images use pure black as a backdrop. Keep wispy low-light detail
    // while turning that backdrop into a soft alpha matte.
    const matte = smoothstep((brightness - 3) / 92);
    data[offset + 3] = Math.round(sourceAlpha * matte * 255);
  }

  await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  }).png({ adaptiveFiltering: true, compressionLevel: 9 }).toFile(output);
}));

console.log(`Created ${assetNames.length} transparent nebula cutouts in ${outputDirectory}`);
