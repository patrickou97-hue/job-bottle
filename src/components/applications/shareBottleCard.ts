"use client";

import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import type { BottleStackPosition } from "@/components/applications/bottleGeometry";
import type { ApplicationStatus, ApplicationWithJob } from "@/lib/types";

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 1600;
const CARD_PADDING = 88;
const SITE_URL = "https://job-bottle.vercel.app/";

type ShareBottleOptions = {
  applications: ApplicationWithJob[];
  bottleSnapshotDataUrl?: string | null;
  positions: Map<string, BottleStackPosition>;
  profile?: ShareProfileSnapshot | null;
  resumeCount?: number;
};

export type ShareProfileSnapshot = {
  displayName: string | null;
  preferredRegions: string[];
  targetRoles: string[];
};

export async function downloadBottleShareCard({
  applications,
  bottleSnapshotDataUrl,
  positions,
  profile,
  resumeCount = 0,
}: ShareBottleOptions) {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("无法生成分享图，请稍后重试。");

  const [bottleImage, qrImage, logoImage, bottleSnapshot] = await Promise.all([
    loadImage(`${window.location.origin}/assets/star-bottle-image2.png`),
    loadImage(
      await QRCode.toDataURL(SITE_URL, {
        width: 260,
        margin: 1,
        color: {
          dark: "#313B59",
          light: "#F2E5BD",
        },
      }),
    ),
    loadImage(`${window.location.origin}/brand/shi-xing-wordmark.png`).catch(() => null),
    bottleSnapshotDataUrl ? loadImage(bottleSnapshotDataUrl).catch(() => null) : Promise.resolve(null),
  ]);

  drawShareBackground(context);
  drawShareHeader(context, applications.length, logoImage, profile ?? null);
  drawBottleSnapshot(context, applications, positions, bottleImage, bottleSnapshot);
  drawShareStory(context, {
    applications,
    profile: profile ?? null,
    resumeCount,
  });
  drawShareFooter(context, qrImage);

  const pngBlob = await canvasToBlob(canvas, "image/png");
  const stamp = formatStamp();
  downloadBlob(pngBlob, `拾星-我的星瓶-${stamp}.png`);

  const dataUrl = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "px",
    format: [CARD_WIDTH, CARD_HEIGHT],
    compress: true,
  });
  pdf.addImage(dataUrl, "PNG", 0, 0, CARD_WIDTH, CARD_HEIGHT);
  pdf.save(`拾星-我的星瓶-${stamp}.pdf`);
}

function drawShareBackground(context: CanvasRenderingContext2D) {
  const background = context.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  background.addColorStop(0, "#070B16");
  background.addColorStop(0.42, "#111827");
  background.addColorStop(1, "#171321");
  context.fillStyle = background;
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  const paperGlow = context.createRadialGradient(820, 640, 80, 820, 640, 760);
  paperGlow.addColorStop(0, "rgba(227,197,137,0.16)");
  paperGlow.addColorStop(0.48, "rgba(116,136,174,0.08)");
  paperGlow.addColorStop(1, "rgba(7,11,22,0)");
  context.fillStyle = paperGlow;
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  context.strokeStyle = "rgba(231,224,204,0.09)";
  context.lineWidth = 1.2;
  context.beginPath();
  context.moveTo(80, 1030);
  context.bezierCurveTo(290, 760, 565, 850, 760, 600);
  context.bezierCurveTo(920, 390, 1035, 310, 1140, 285);
  context.stroke();

  context.strokeStyle = "rgba(227,197,137,0.28)";
  context.lineWidth = 2.2;
  context.beginPath();
  context.moveTo(110, 1035);
  context.bezierCurveTo(330, 790, 562, 830, 742, 610);
  context.bezierCurveTo(906, 408, 1022, 346, 1128, 318);
  context.stroke();

  for (let index = 0; index < 150; index += 1) {
    const x = (index * 181.9 + (index % 6) * 17) % CARD_WIDTH;
    const y = (index * 263.1 + (index % 9) * 13) % CARD_HEIGHT;
    const alpha = 0.07 + ((index * 11) % 24) / 100;
    context.fillStyle = `rgba(244,232,198,${alpha})`;
    context.beginPath();
    context.arc(x, y, index % 17 === 0 ? 2 : 0.9, 0, Math.PI * 2);
    context.fill();
  }

  context.strokeStyle = "rgba(244,232,198,0.22)";
  context.lineWidth = 1;
  context.strokeRect(44, 44, CARD_WIDTH - 88, CARD_HEIGHT - 88);
}

function drawShareHeader(
  context: CanvasRenderingContext2D,
  total: number,
  logoImage: HTMLImageElement | null,
  profile: ShareProfileSnapshot | null,
) {
  if (logoImage) {
    context.drawImage(logoImage, CARD_PADDING, 74, 134, 46);
  } else {
    context.fillStyle = "#F4E8C6";
    context.font = "800 34px sans-serif";
    context.fillText("拾星", CARD_PADDING, 112);
  }

  context.fillStyle = "rgba(244,232,198,0.64)";
  context.font = "600 20px sans-serif";
  context.fillText("Job Bottle", CARD_PADDING + 158, 108);

  context.fillStyle = "#F8F1DF";
  context.font = "800 82px sans-serif";
  context.fillText("我的秋招星瓶", CARD_PADDING, 208);

  context.fillStyle = "rgba(248,241,223,0.68)";
  context.font = "500 27px sans-serif";
  const starText = total > 0 ? `已收进 ${total} 颗星，正在把机会装进自己的轨道` : "还没有点亮岗位星，第一颗星正在路上";
  context.fillText(starText, CARD_PADDING, 260);

  const name = profile?.displayName?.trim();
  if (name) {
    context.fillStyle = "rgba(244,232,198,0.88)";
    context.font = "600 24px sans-serif";
    context.fillText(`来自 ${truncateText(context, name, 210)}`, CARD_WIDTH - CARD_PADDING - 230, 112);
  }
}

function drawBottleSnapshot(
  context: CanvasRenderingContext2D,
  applications: ApplicationWithJob[],
  positions: Map<string, BottleStackPosition>,
  bottleImage: HTMLImageElement,
  bottleSnapshot: HTMLImageElement | null,
) {
  const x = 560;
  const y = 344;
  const width = 540;
  const height = 780;

  const glow = context.createRadialGradient(x + width * 0.5, y + height * 0.58, 20, x + width * 0.5, y + height * 0.58, 360);
  glow.addColorStop(0, "rgba(244,232,198,0.18)");
  glow.addColorStop(0.42, "rgba(170,192,224,0.1)");
  glow.addColorStop(1, "rgba(7,11,22,0)");
  context.fillStyle = glow;
  context.fillRect(x - 80, y - 80, width + 160, height + 160);

  context.strokeStyle = "rgba(244,232,198,0.18)";
  context.lineWidth = 1;
  context.beginPath();
  context.ellipse(x + width * 0.5, y + height * 0.55, 245, 395, -0.12, 0, Math.PI * 2);
  context.stroke();

  if (bottleSnapshot) {
    context.save();
    roundedRect(context, x + 8, y + 4, width - 16, height + 28, 68);
    context.clip();
    context.drawImage(bottleSnapshot, x, y, width, height);
    context.restore();
  } else {
    if (applications.length === 0) {
      for (let index = 0; index < 8; index += 1) {
        const starX = x + width * (0.38 + ((index * 19) % 25) / 100);
        const starY = y + height * (0.62 + ((index * 13) % 18) / 100);
        drawShareStar(context, starX, starY, 15 + (index % 3) * 3, "opened");
      }
    }
    applications.forEach((application) => {
      const position = positions.get(application.id);
      if (!position) return;
      const starX = x + (position.xPct / 100) * width;
      const starY = y + (position.yPct / 100) * height;
      drawShareStar(context, starX, starY, Math.max(14, position.size * 1.35), application.status);
    });

    context.save();
    context.globalAlpha = 0.9;
    context.globalCompositeOperation = "screen";
    context.drawImage(bottleImage, x, y, width, height);
    context.restore();
  }

  context.fillStyle = "rgba(248,241,223,0.76)";
  context.font = "700 28px sans-serif";
  context.fillText("星瓶", x + 42, y + height + 54);
  context.fillStyle = "rgba(248,241,223,0.48)";
  context.font = "500 20px sans-serif";
  context.fillText("收录明日的坐标", x + 42, y + height + 88);
}

function drawShareStory(
  context: CanvasRenderingContext2D,
  {
    applications,
    profile,
    resumeCount,
  }: {
    applications: ApplicationWithJob[];
    profile: ShareProfileSnapshot | null;
    resumeCount: number;
  },
) {
  const x = CARD_PADDING;
  const y = 356;
  const width = 410;
  const companies = Array.from(new Set(applications.map((item) => item.job.company_name).filter(Boolean))).slice(0, 8);
  const regions = profile?.preferredRegions?.filter(Boolean).slice(0, 4) ?? [];
  const roles = profile?.targetRoles?.filter(Boolean).slice(0, 4) ?? [];

  context.fillStyle = "rgba(244,232,198,0.78)";
  context.font = "700 30px sans-serif";
  context.fillText("秋招线索", x, y);

  drawShareMetric(context, x, y + 92, "意向地区", regions.length ? regions.join(" / ") : "尚未点亮");
  drawShareMetric(context, x, y + 174, "意向岗位", roles.length ? roles.join(" / ") : "尚未点亮");
  drawShareMetric(context, x, y + 256, "独特简历", resumeCount > 0 ? `${resumeCount} 份` : "尚未点亮");

  context.fillStyle = "rgba(244,232,198,0.78)";
  context.font = "700 28px sans-serif";
  context.fillText("投递企业", x, y + 430);

  if (companies.length === 0) {
    context.fillStyle = "rgba(248,241,223,0.58)";
    context.font = "600 23px sans-serif";
    context.fillText("还没有点亮岗位星", x, y + 504);
    context.fillStyle = "rgba(248,241,223,0.42)";
    context.font = "500 18px sans-serif";
    context.fillText("去探索星海，收进第一颗机会。", x, y + 540);
    return;
  }

  companies.forEach((company, index) => {
    const top = y + 500 + index * 48;
    drawShareStar(context, x + 14, top - 8, 16, applications[index]?.status ?? "opened");
    context.fillStyle = "rgba(248,241,223,0.86)";
    context.font = "600 22px sans-serif";
    context.fillText(truncateText(context, company, width - 42), x + 38, top);
  });

  if (applications.length > companies.length) {
    context.fillStyle = "rgba(227,197,137,0.78)";
    context.font = "600 18px sans-serif";
    context.fillText(`还有 ${applications.length - companies.length} 个机会在瓶中`, x, y + 500 + companies.length * 48 + 12);
  }
}

function drawShareMetric(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  value: string,
) {
  context.strokeStyle = "rgba(244,232,198,0.17)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(x, y + 22);
  context.lineTo(x + 408, y + 22);
  context.stroke();

  context.fillStyle = "rgba(248,241,223,0.45)";
  context.font = "500 18px sans-serif";
  context.fillText(label, x, y);
  context.fillStyle = "#F8F1DF";
  context.font = "700 25px sans-serif";
  context.fillText(truncateText(context, value, 330), x + 120, y);
}

function drawShareFooter(context: CanvasRenderingContext2D, qrImage: HTMLImageElement) {
  const qrSize = 188;
  const qrX = CARD_WIDTH - CARD_PADDING - qrSize - 34;
  const qrY = 1278;

  context.fillStyle = "rgba(244,232,198,0.96)";
  roundedRect(context, CARD_PADDING, qrY - 40, CARD_WIDTH - CARD_PADDING * 2, qrSize + 80, 32);
  context.fill();

  context.fillStyle = "#111827";
  context.font = "800 36px sans-serif";
  context.fillText("扫码获取我的秋招专属星瓶", CARD_PADDING + 36, qrY + 46);

  context.fillStyle = "rgba(17,24,39,0.68)";
  context.font = "600 23px sans-serif";
  context.fillText("job-bottle.vercel.app", CARD_PADDING + 36, qrY + 92);
  context.font = "700 22px sans-serif";
  context.fillText("拾星 Job Bottle", CARD_PADDING + 36, qrY + 156);

  context.fillStyle = "#F4E8C6";
  roundedRect(context, qrX - 14, qrY - 14, qrSize + 28, qrSize + 28, 26);
  context.fill();
  context.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
}

function drawShareStar(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  status: ApplicationStatus,
) {
  const color = getShareColor(status);
  const halo = context.createRadialGradient(x, y, 2, x, y, size * 1.4);
  halo.addColorStop(0, color.halo);
  halo.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = halo;
  context.beginPath();
  context.arc(x, y, size * 1.4, 0, Math.PI * 2);
  context.fill();

  context.save();
  context.translate(x, y);
  context.fillStyle = color.fill;
  context.strokeStyle = color.stroke;
  context.lineWidth = 2;
  drawStarPath(context, size * 0.5, size * 0.23);
  context.fill();
  context.stroke();
  context.restore();
}

function getShareColor(status: ApplicationStatus) {
  const colors: Record<ApplicationStatus, {
    fill: string;
    light: string;
    halo: string;
    stroke: string;
  }> = {
    opened: { fill: "#8FA6CF", light: "#E7F0FF", halo: "rgba(143,166,207,0.35)", stroke: "rgba(231,240,255,0.7)" },
    applied: { fill: "#69648C", light: "#D9ADA9", halo: "rgba(217,173,169,0.34)", stroke: "rgba(242,229,189,0.64)" },
    written_test: { fill: "#7E78A8", light: "#DAD6FF", halo: "rgba(126,120,168,0.36)", stroke: "rgba(218,214,255,0.68)" },
    first_round: { fill: "#6899C7", light: "#DAF1FF", halo: "rgba(104,153,199,0.36)", stroke: "rgba(218,241,255,0.68)" },
    second_round: { fill: "#6480B8", light: "#DCE9FF", halo: "rgba(100,128,184,0.38)", stroke: "rgba(220,233,255,0.7)" },
    final_round: { fill: "#9B8AAB", light: "#F0E6FF", halo: "rgba(155,138,171,0.38)", stroke: "rgba(240,230,255,0.7)" },
    offer: { fill: "#F2D16D", light: "#FFF4CC", halo: "rgba(242,209,109,0.56)", stroke: "rgba(255,244,204,0.8)" },
    rejected: { fill: "#626B7E", light: "#B7C1D4", halo: "rgba(98,107,126,0.2)", stroke: "rgba(183,193,212,0.42)" },
    withdrawn: { fill: "#596275", light: "#AAB5C8", halo: "rgba(89,98,117,0.18)", stroke: "rgba(170,181,200,0.38)" },
  };
  return colors[status];
}

function drawStarPath(context: CanvasRenderingContext2D, outerRadius: number, innerRadius: number) {
  context.beginPath();
  for (let index = 0; index < 10; index += 1) {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function truncateText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (context.measureText(text).width <= maxWidth) return text;
  let next = text;
  while (next.length > 1 && context.measureText(`${next}...`).width > maxWidth) {
    next = next.slice(0, -1);
  }
  return `${next}...`;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("图片资源读取失败。"));
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("分享图生成失败。"));
    }, type);
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function formatStamp() {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const time = [
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
  ].join("");
  return `${date}-${time}`;
}
