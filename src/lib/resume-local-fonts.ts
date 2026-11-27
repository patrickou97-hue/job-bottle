import type { ResumeLocalFontId } from "@/lib/resume";

const LOCAL_FACES = {
  "times-new-roman": {
    label: "Times New Roman",
    regular: "TimesNewRomanPSMT",
    bold: "TimesNewRomanPS-BoldMT",
  },
  "helvetica-neue": {
    label: "Helvetica Neue",
    regular: "HelveticaNeue",
    bold: "HelveticaNeue-Bold",
  },
} satisfies Record<ResumeLocalFontId, { label: string; regular: string; bold: string }>;

type LocalFontFace = { postscriptName: string; blob: () => Promise<Blob> };
type LocalFontWindow = Window & {
  queryLocalFonts?: (options: { postscriptNames: string[] }) => Promise<LocalFontFace[]>;
};

export async function readLocalResumeFont(id: ResumeLocalFontId) {
  const { label, regular: regularName, bold: boldName } = LOCAL_FACES[id];
  const browser = window as LocalFontWindow;
  if (!browser.queryLocalFonts) {
    throw new Error(`此浏览器不支持读取本机字体，${label} 将使用相近字体。`);
  }

  let fonts: LocalFontFace[];
  try {
    fonts = await browser.queryLocalFonts({ postscriptNames: [regularName, boldName] });
  } catch {
    throw new Error(`未取得本机字体权限，${label} 将使用相近字体。`);
  }
  const regularFace = fonts.find((font) => font.postscriptName === regularName);
  const boldFace = fonts.find((font) => font.postscriptName === boldName);
  if (!regularFace || !boldFace) {
    throw new Error(`本机缺少 ${label} 的常规或粗体，将使用相近字体。`);
  }

  const [regular, bold] = await Promise.all([
    regularFace.blob().then((blob) => blob.arrayBuffer()),
    boldFace.blob().then((blob) => blob.arrayBuffer()),
  ]);
  const coversRegular = inspectEmbeddableTrueType(regular);
  const coversBold = inspectEmbeddableTrueType(bold);
  return {
    regular,
    bold,
    regularName,
    boldName,
    covers: (character: string) => coversRegular(character) && coversBold(character),
  };
}

export function inspectEmbeddableTrueType(buffer: ArrayBuffer) {
  const data = new DataView(buffer);
  const invalid = () => new Error("此版本的本机字体无法嵌入 PDF，将使用相近字体。");
  if (data.byteLength < 12 || ![0x00010000, 0x74727565].includes(data.getUint32(0))) throw invalid();
  const tableCount = data.getUint16(4);
  if (12 + tableCount * 16 > data.byteLength) throw invalid();

  function table(tag: number) {
    for (let index = 0; index < tableCount; index++) {
      const entry = 12 + 16 * index;
      if (data.getUint32(entry) !== tag) continue;
      const start = data.getUint32(entry + 8);
      const end = start + data.getUint32(entry + 12);
      if (end > data.byteLength) throw invalid();
      return { start, end };
    }
    return undefined;
  }

  const os2 = table(0x4f532f32); // OS/2
  const cmap = table(0x636d6170); // cmap
  if (!os2 || os2.end - os2.start < 10 || !cmap || !table(0x676c7966) || table(0x66766172)) throw invalid();
  // jsPDF embeds a subset of a static TrueType font. Restricted, no-subsetting
  // and bitmap-only fonts cannot be used in this export path.
  if (![0x0000, 0x0004, 0x0008].includes(data.getUint16(os2.start + 8))) throw invalid();
  if (cmap.end - cmap.start < 4) throw invalid();
  const subtableCount = data.getUint16(cmap.start + 2);
  if (cmap.start + 4 + 8 * subtableCount > cmap.end) throw invalid();

  let unicodeCmap = 0;
  for (let index = 0; index < subtableCount; index++) {
    const record = cmap.start + 4 + 8 * index;
    const platform = data.getUint16(record);
    const encoding = data.getUint16(record + 2);
    const start = cmap.start + data.getUint32(record + 4);
    if (start + 16 > cmap.end || data.getUint16(start) !== 4) continue;
    if (platform === 3 && encoding === 1) return bmpCoverage(start, cmap.end);
    if (platform === 0) unicodeCmap = start;
  }
  if (unicodeCmap) return bmpCoverage(unicodeCmap, cmap.end);
  throw invalid();

  function bmpCoverage(start: number, limit: number) {
    const end = start + data.getUint16(start + 2);
    const countBytes = data.getUint16(start + 6);
    if (countBytes === 0 || countBytes % 2 !== 0) throw invalid();
    const count = countBytes / 2;
    const ends = start + 14;
    const starts = ends + countBytes + 2;
    const deltas = starts + countBytes;
    const ranges = deltas + countBytes;
    if (end > limit || ranges + countBytes > end) throw invalid();

    const covers = (character: string) => {
      const point = character.codePointAt(0);
      if (point === undefined || point >= 0xffff) return false;
      let low = 0;
      let high = count - 1;
      while (low <= high) {
        const middle = (low + high) >> 1;
        const index = 2 * middle;
        const first = data.getUint16(starts + index);
        if (point > data.getUint16(ends + index)) low = middle + 1;
        else if (point < first) high = middle - 1;
        else {
          const delta = data.getInt16(deltas + index);
          const range = data.getUint16(ranges + index);
          if (range === 0) return ((point + delta) & 0xffff) !== 0;
          const glyphAt = ranges + index + range + 2 * (point - first);
          if (glyphAt + 2 > end) return false;
          const glyph = data.getUint16(glyphAt);
          return glyph !== 0 && ((glyph + delta) & 0xffff) !== 0;
        }
      }
      return false;
    };
    if (!Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789").every(covers)) throw invalid();
    return covers;
  }
}
