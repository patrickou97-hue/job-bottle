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
  positions: Map<string, BottleStackPosition>;
};

export async function downloadBottleShareCard({
  applications,
  positions,
}: ShareBottleOptions) {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("无法生成分享图，请稍后重试。");

  const [bottleImage, qrImage] = await Promise.all([
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
  ]);

  drawShareBackground(context);
  drawShareHeader(context, applications.length);
  drawBottleSnapshot(context, applications, positions, bottleImage);
  drawOrbitSnapshot(context, applications);
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
  background.addColorStop(0, "#071022");
  background.addColorStop(0.38, "#162444");
  background.addColorStop(0.72, "#313B59");
  background.addColorStop(1, "#69648C");
  context.fillStyle = background;
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  const nebula = context.createRadialGradient(920, 620, 20, 920, 620, 680);
  nebula.addColorStop(0, "rgba(217,173,169,0.22)");
  nebula.addColorStop(0.38, "rgba(105,100,140,0.22)");
  nebula.addColorStop(1, "rgba(12,18,36,0)");
  context.fillStyle = nebula;
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  for (let index = 0; index < 180; index += 1) {
    const x = (index * 137.7) % CARD_WIDTH;
    const y = (index * 251.3) % CARD_HEIGHT;
    const alpha = 0.18 + ((index * 17) % 45) / 100;
    context.fillStyle = `rgba(242,229,189,${alpha})`;
    context.beginPath();
    context.arc(x, y, index % 9 === 0 ? 2.1 : 1.15, 0, Math.PI * 2);
    context.fill();
  }
}

function drawShareHeader(context: CanvasRenderingContext2D, total: number) {
  context.fillStyle = "#F7F2FF";
  context.font = "700 58px sans-serif";
  context.fillText("我的秋招星瓶", CARD_PADDING, 132);

  context.fillStyle = "rgba(247,242,255,0.72)";
  context.font = "500 24px sans-serif";
  context.fillText(`已收进 ${total} 颗星`, CARD_PADDING, 178);

  context.fillStyle = "rgba(242,209,109,0.72)";
  context.fillRect(CARD_PADDING, 216, CARD_WIDTH - CARD_PADDING * 2, 1);
}

function drawBottleSnapshot(
  context: CanvasRenderingContext2D,
  applications: ApplicationWithJob[],
  positions: Map<string, BottleStackPosition>,
  bottleImage: HTMLImageElement,
) {
  const x = 76;
  const y = 280;
  const width = 520;
  const height = 780;

  const glow = context.createRadialGradient(x + width * 0.5, y + height * 0.62, 20, x + width * 0.5, y + height * 0.62, 330);
  glow.addColorStop(0, "rgba(140,195,255,0.2)");
  glow.addColorStop(1, "rgba(140,195,255,0)");
  context.fillStyle = glow;
  context.fillRect(x - 40, y - 40, width + 80, height + 80);

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

  context.fillStyle = "rgba(247,242,255,0.78)";
  context.font = "600 28px sans-serif";
  context.fillText("星瓶", x + 28, y + height + 48);
}

function drawOrbitSnapshot(context: CanvasRenderingContext2D, applications: ApplicationWithJob[]) {
  const x = 632;
  const y = 312;
  const size = 452;
  const centerX = x + size / 2;
  const centerY = y + size / 2;
  const radii = [190, 146, 104, 64];

  context.fillStyle = "rgba(6,13,29,0.22)";
  roundedRect(context, x - 8, y - 8, size + 16, size + 16, 42);
  context.fill();

  radii.forEach((radius, index) => {
    context.strokeStyle = `rgba(242,229,189,${0.14 - index * 0.02})`;
    context.lineWidth = 1;
    context.setLineDash([5, 8]);
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.stroke();
  });
  context.setLineDash([]);

  [40, 98, 156].forEach((radius, index) => {
    context.strokeStyle = `rgba(242,209,109,${0.22 - index * 0.055})`;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.stroke();
  });

  context.fillStyle = "#F2E5BD";
  context.beginPath();
  context.arc(centerX, centerY, 8, 0, Math.PI * 2);
  context.fill();

  const visible = applications.slice(0, 18);
  visible.forEach((application, index) => {
    const ringIndex = getShareOrbitRing(application.status);
    const radius = radii[ringIndex];
    const totalOnRing = visible.filter((item) => getShareOrbitRing(item.status) === ringIndex).length;
    const indexOnRing = visible
      .slice(0, index)
      .filter((item) => getShareOrbitRing(item.status) === ringIndex).length;
    const angle = -Math.PI / 2 + (indexOnRing / Math.max(1, totalOnRing)) * Math.PI * 2 + ringIndex * 0.36;
    const starX = centerX + Math.cos(angle) * radius;
    const starY = centerY + Math.sin(angle) * radius;
    drawSharePlanet(context, starX, starY, application.status);
  });

  context.fillStyle = "rgba(247,242,255,0.78)";
  context.font = "600 28px sans-serif";
  context.fillText("投递轨道", x + 8, y + size + 58);

  context.fillStyle = "rgba(247,242,255,0.58)";
  context.font = "500 20px sans-serif";
  context.fillText(`投递中 ${applications.filter((item) => !["rejected", "withdrawn"].includes(item.status)).length}`, x + 8, y + size + 92);
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

function drawSharePlanet(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  status: ApplicationStatus,
) {
  const color = getShareColor(status);
  const radius = status === "offer" ? 18 : 14;
  const gradient = context.createRadialGradient(x - radius * 0.42, y - radius * 0.5, 2, x, y, radius);
  gradient.addColorStop(0, color.light);
  gradient.addColorStop(0.48, color.fill);
  gradient.addColorStop(1, "#060B18");
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = color.light;
  context.beginPath();
  context.arc(x + radius * 0.35, y - radius * 0.42, 3.6, 0, Math.PI * 2);
  context.fill();
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

function getShareOrbitRing(status: ApplicationStatus) {
  if (status === "offer") return 3;
  if (["first_round", "second_round", "final_round"].includes(status)) return 2;
  if (["applied", "written_test"].includes(status)) return 1;
  return 0;
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
