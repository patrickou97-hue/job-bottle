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
};

export async function downloadBottleShareCard({
  applications,
  bottleSnapshotDataUrl,
  positions,
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
  drawShareHeader(context, applications.length, logoImage);
  drawBottleSnapshot(context, applications, positions, bottleImage, bottleSnapshot);
  drawCompanyList(context, applications);
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
  background.addColorStop(0, "#050A18");
  background.addColorStop(0.34, "#111A35");
  background.addColorStop(0.7, "#253254");
  background.addColorStop(1, "#12192F");
  context.fillStyle = background;
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  const nebula = context.createRadialGradient(910, 520, 20, 910, 520, 720);
  nebula.addColorStop(0, "rgba(242,209,109,0.2)");
  nebula.addColorStop(0.32, "rgba(217,173,169,0.18)");
  nebula.addColorStop(0.62, "rgba(105,100,140,0.2)");
  nebula.addColorStop(1, "rgba(12,18,36,0)");
  context.fillStyle = nebula;
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  const pathGlow = context.createLinearGradient(160, 220, 1060, 1160);
  pathGlow.addColorStop(0, "rgba(216,232,255,0)");
  pathGlow.addColorStop(0.46, "rgba(216,232,255,0.08)");
  pathGlow.addColorStop(1, "rgba(242,209,109,0)");
  context.strokeStyle = pathGlow;
  context.lineWidth = 58;
  context.beginPath();
  context.moveTo(60, 940);
  context.bezierCurveTo(260, 660, 520, 820, 740, 520);
  context.bezierCurveTo(880, 330, 980, 250, 1160, 220);
  context.stroke();

  for (let index = 0; index < 260; index += 1) {
    const x = (index * 137.7 + (index % 5) * 23) % CARD_WIDTH;
    const y = (index * 251.3 + (index % 7) * 19) % CARD_HEIGHT;
    const alpha = 0.12 + ((index * 17) % 44) / 100;
    context.fillStyle = `rgba(242,229,189,${alpha})`;
    context.beginPath();
    context.arc(x, y, index % 11 === 0 ? 2.2 : 1.05, 0, Math.PI * 2);
    context.fill();
  }

  context.strokeStyle = "rgba(242,209,109,0.4)";
  context.lineWidth = 1.4;
  context.beginPath();
  context.moveTo(CARD_PADDING, 232);
  context.lineTo(CARD_WIDTH - CARD_PADDING, 232);
  context.stroke();
}

function drawShareHeader(context: CanvasRenderingContext2D, total: number, logoImage: HTMLImageElement | null) {
  if (logoImage) {
    context.drawImage(logoImage, CARD_PADDING, 70, 168, 58);
  } else {
    context.fillStyle = "#F7F2FF";
    context.font = "800 42px sans-serif";
    context.fillText("拾星", CARD_PADDING, 118);
  }

  context.fillStyle = "#F7F2FF";
  context.font = "700 64px sans-serif";
  context.fillText("我的秋招星瓶", CARD_PADDING, 182);

  context.fillStyle = "rgba(247,242,255,0.7)";
  context.font = "500 25px sans-serif";
  context.fillText(`已收进 ${total} 颗星，正在把机会装进自己的轨道`, CARD_PADDING, 224);

  context.fillStyle = "rgba(242,209,109,0.92)";
  roundedRect(context, CARD_WIDTH - CARD_PADDING - 230, 86, 230, 54, 27);
  context.fill();
  context.fillStyle = "#10172B";
  context.font = "700 22px sans-serif";
  context.fillText("Job Bottle", CARD_WIDTH - CARD_PADDING - 172, 120);
}

function drawBottleSnapshot(
  context: CanvasRenderingContext2D,
  applications: ApplicationWithJob[],
  positions: Map<string, BottleStackPosition>,
  bottleImage: HTMLImageElement,
  bottleSnapshot: HTMLImageElement | null,
) {
  const x = 88;
  const y = 290;
  const width = 560;
  const height = 820;

  const glow = context.createRadialGradient(x + width * 0.5, y + height * 0.62, 20, x + width * 0.5, y + height * 0.62, 330);
  glow.addColorStop(0, "rgba(216,232,255,0.22)");
  glow.addColorStop(0.36, "rgba(242,209,109,0.08)");
  glow.addColorStop(1, "rgba(140,195,255,0)");
  context.fillStyle = glow;
  context.fillRect(x - 40, y - 40, width + 80, height + 80);

  if (bottleSnapshot) {
    context.save();
    roundedRect(context, x - 18, y - 20, width + 36, height + 44, 52);
    context.clip();
    context.drawImage(bottleSnapshot, x, y, width, height);
    context.restore();
  } else {
    applications.forEach((application) => {
      const position = positions.get(application.id);
      if (!position) return;
      const starX = x + (position.xPct / 100) * width;
      const starY = y + (position.yPct / 100) * height;
      drawShareStar(context, starX, starY, Math.max(14, position.size * 1.35), application.status);
    });

    context.save();
    context.globalAlpha = 0.94;
    context.globalCompositeOperation = "screen";
    context.drawImage(bottleImage, x, y, width, height);
    context.restore();
  }

  context.fillStyle = "rgba(247,242,255,0.78)";
  context.font = "700 30px sans-serif";
  context.fillText("轨星瓶", x + 34, y + height + 52);
  context.fillStyle = "rgba(247,242,255,0.54)";
  context.font = "500 20px sans-serif";
  context.fillText("每一颗星，都是一次投递机会", x + 34, y + height + 86);
}

function drawCompanyList(context: CanvasRenderingContext2D, applications: ApplicationWithJob[]) {
  const x = 700;
  const y = 332;
  const width = 392;
  const rowHeight = 54;
  const companies = Array.from(new Set(applications.map((item) => item.job.company_name).filter(Boolean))).slice(0, 12);

  context.fillStyle = "rgba(5,10,24,0.38)";
  roundedRect(context, x - 28, y - 56, width + 56, 760, 44);
  context.fill();

  context.fillStyle = "#F7F2FF";
  context.font = "700 34px sans-serif";
  context.fillText("投递企业", x, y);
  context.fillStyle = "rgba(247,242,255,0.58)";
  context.font = "500 20px sans-serif";
  context.fillText("只展示名称，适合分享", x, y + 34);

  companies.forEach((company, index) => {
    const top = y + 82 + index * rowHeight;
    context.fillStyle = index % 2 === 0 ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.025)";
    roundedRect(context, x, top - 30, width, 40, 20);
    context.fill();
    drawShareStar(context, x + 22, top - 10, 20, applications[index]?.status ?? "opened");
    context.fillStyle = "#F7F2FF";
    context.font = "600 22px sans-serif";
    context.fillText(truncateText(context, company, width - 72), x + 52, top - 2);
  });

  if (applications.length > companies.length) {
    context.fillStyle = "rgba(242,209,109,0.78)";
    context.font = "600 20px sans-serif";
    context.fillText(`还有 ${applications.length - companies.length} 个机会已收入星瓶`, x, y + 82 + companies.length * rowHeight + 22);
  }
}

function drawShareFooter(context: CanvasRenderingContext2D, qrImage: HTMLImageElement) {
  const qrSize = 232;
  const qrX = CARD_PADDING;
  const qrY = 1234;

  context.fillStyle = "rgba(242,229,189,0.96)";
  roundedRect(context, qrX, qrY, qrSize, qrSize, 28);
  context.fill();
  context.drawImage(qrImage, qrX + 18, qrY + 18, qrSize - 36, qrSize - 36);

  context.fillStyle = "#F7F2FF";
  context.font = "700 42px sans-serif";
  context.fillText("扫码获取你的秋招专属星瓶", qrX + qrSize + 44, qrY + 72);

  context.fillStyle = "rgba(247,242,255,0.64)";
  context.font = "500 24px sans-serif";
  context.fillText("job-bottle.vercel.app", qrX + qrSize + 44, qrY + 120);
  context.fillText("拾星", qrX + qrSize + 44, qrY + 170);
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
