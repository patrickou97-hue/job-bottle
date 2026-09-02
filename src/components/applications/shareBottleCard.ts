"use client";

import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import type { BottleStackPosition } from "@/components/applications/bottleGeometry";
import {
  buildSharePosterModel,
  type SharePosterModel,
  type SharePosterOverrides,
} from "@/components/applications/shareBottleData";
import type { ApplicationStatus, ApplicationWithJob } from "@/lib/types";

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 1600;
const CARD_PADDING = 70;
const SITE_URL = "https://www.starjob.space/";
const PAPER = "#F7F7F4";
const NAVY = "#12294E";
const COBALT = "#1F5EBB";
const YELLOW = "#F4B927";
const SLATE = "#5F6F86";

export type ShareBottleOptions = {
  applications: ApplicationWithJob[];
  bottleSnapshotDataUrl?: string | null;
  positions: Map<string, BottleStackPosition>;
  overrides?: SharePosterOverrides;
};

export type ShareBottleRender = {
  dataUrl: string;
  pngBlob: Blob;
};

export async function renderBottleShareCard({
  applications,
  bottleSnapshotDataUrl,
  positions,
  overrides,
}: ShareBottleOptions): Promise<ShareBottleRender> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("分享图暂未生成，请稍后重试。");

  const model = buildSharePosterModel(applications, overrides);
  const [bottleImage, qrImage, logoImage, bottleSnapshot] = await Promise.all([
    loadImage(`${window.location.origin}/assets/star-bottle-image2.png`),
    loadImage(
      await QRCode.toDataURL(SITE_URL, {
        width: 260,
        margin: 1,
        color: { dark: NAVY, light: "#FFFFFF" },
      }),
    ),
    loadImage(`${window.location.origin}/brand/starjob-wordmark-lockup.png`).catch(() => null),
    bottleSnapshotDataUrl ? loadImage(bottleSnapshotDataUrl).catch(() => null) : Promise.resolve(null),
  ]);

  drawShareBackground(context);
  drawShareHeader(context, logoImage, model);
  if (model.showStats) drawShareStats(context, model);
  drawShareJourney(context, model);
  if (model.showBottle) drawBottleSnapshot(context, applications, positions, bottleImage, bottleSnapshot, model);
  if (model.showCompanies) drawShareCompanyList(context, model);
  drawShareFooter(context, qrImage, model);

  const dataUrl = canvas.toDataURL("image/png");
  return {
    dataUrl,
    pngBlob: await canvasToBlob(canvas, "image/png"),
  };
}

export async function downloadBottleShareCard(options: ShareBottleOptions) {
  const { dataUrl, pngBlob } = await renderBottleShareCard(options);
  const stamp = formatStamp();
  downloadBlob(pngBlob, `拾星-我的星瓶-${stamp}.png`);

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
  context.fillStyle = PAPER;
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  const warmLight = context.createRadialGradient(220, 140, 20, 220, 140, 760);
  warmLight.addColorStop(0, "rgba(255,255,255,0.92)");
  warmLight.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = warmLight;
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  for (let index = 0; index < 240; index += 1) {
    const x = (index * 173.7 + (index % 7) * 11) % CARD_WIDTH;
    const y = (index * 271.3 + (index % 9) * 17) % CARD_HEIGHT;
    context.fillStyle = index % 5 === 0 ? "rgba(18,41,78,0.035)" : "rgba(255,255,255,0.22)";
    context.beginPath();
    context.arc(x, y, index % 13 === 0 ? 1.3 : 0.55, 0, Math.PI * 2);
    context.fill();
  }

  context.strokeStyle = NAVY;
  context.lineWidth = 1.2;
  context.strokeRect(22, 22, CARD_WIDTH - 44, CARD_HEIGHT - 44);
}

function drawShareHeader(
  context: CanvasRenderingContext2D,
  logoImage: HTMLImageElement | null,
  model: SharePosterModel,
) {
  const titleText = model.title === "我的星光瓶" ? "我的\n星光瓶" : model.title;
  const titleLines = wrapText(context, titleText, 620, 112, 2);
  context.fillStyle = NAVY;
  context.font = "900 112px sans-serif";
  titleLines.forEach((line, index) => context.fillText(line, CARD_PADDING, 174 + index * 122));

  context.strokeStyle = NAVY;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(CARD_PADDING, 350);
  context.lineTo(650, 350);
  context.stroke();

  context.fillStyle = NAVY;
  context.font = "700 24px sans-serif";
  context.fillText("2026 秋招 · 我的求职进度分享卡", CARD_PADDING, 389);

  const subtitleLines = wrapText(context, model.subtitle, 320, 28, 2);
  context.fillStyle = COBALT;
  context.font = "700 28px sans-serif";
  subtitleLines.forEach((line, index) => context.fillText(line, 395, 126 + index * 38));
  drawSubtitleStarPath(context);

  if (logoImage) {
    context.drawImage(logoImage, 925, 62, 202, 27);
  } else {
    context.fillStyle = NAVY;
    context.font = "900 31px sans-serif";
    context.fillText("StarJob", 940, 90);
  }
  context.fillStyle = NAVY;
  context.font = "700 14px sans-serif";
  context.textAlign = "right";
  context.fillText("让求职更有方向", 1127, 115);
  context.textAlign = "left";

  context.strokeStyle = COBALT;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(890, 222);
  context.lineTo(890, 355);
  context.stroke();
  context.fillStyle = COBALT;
  context.font = "700 28px sans-serif";
  context.fillText("2026 AUTUMN", 920, 244);
  context.fillStyle = NAVY;
  context.font = "900 54px sans-serif";
  context.fillText("秋招季", 920, 304);
  context.fillStyle = COBALT;
  context.font = "600 24px sans-serif";
  context.fillText("2026.07 – 2026.12", 920, 342);
  context.beginPath();
  context.moveTo(920, 359);
  context.lineTo(1127, 359);
  context.stroke();
}

function drawSubtitleStarPath(context: CanvasRenderingContext2D) {
  context.save();
  context.strokeStyle = COBALT;
  context.lineWidth = 1.8;
  context.setLineDash([7, 8]);
  context.beginPath();
  context.moveTo(548, 105);
  context.bezierCurveTo(586, 83, 630, 87, 661, 100);
  context.bezierCurveTo(650, 133, 625, 158, 596, 177);
  context.stroke();
  context.restore();
  drawFourPointStar(context, 672, 101, 16, YELLOW);
}

function drawShareStats(context: CanvasRenderingContext2D, model: SharePosterModel) {
  const metrics = [
    { label: "已收藏", value: model.totalApplications, icon: "bookmark" as const },
    { label: "已投递", value: model.appliedCount, icon: "plane" as const },
    { label: "面试中", value: model.interviewCount, icon: "chat" as const },
    { label: "已拿到 Offer", value: model.offerCount, icon: "star" as const },
  ];
  const startX = 72;
  const cellWidth = 270;
  metrics.forEach((metric, index) => {
    const x = startX + index * cellWidth;
    drawLineIcon(context, metric.icon, x, 458, 43);
    context.fillStyle = NAVY;
    context.font = "700 20px sans-serif";
    context.fillText(metric.label, x + 58, 477);
    context.fillStyle = COBALT;
    context.font = "900 52px sans-serif";
    context.fillText(String(metric.value), x + 58, 533);
    context.fillStyle = NAVY;
    context.font = "700 19px sans-serif";
    context.fillText("家", x + 58 + context.measureText(String(metric.value)).width + 8, 533);
    if (index < metrics.length - 1) {
      context.save();
      context.strokeStyle = "rgba(18,41,78,0.34)";
      context.lineWidth = 1.2;
      context.setLineDash([5, 7]);
      context.beginPath();
      context.moveTo(x + cellWidth - 22, 449);
      context.lineTo(x + cellWidth - 22, 542);
      context.stroke();
      context.restore();
    }
  });
  drawFourPointStar(context, 1043, 463, 10, YELLOW);
}

function drawShareJourney(context: CanvasRenderingContext2D, model: SharePosterModel) {
  context.save();
  context.strokeStyle = "rgba(95,111,134,0.28)";
  context.lineWidth = 3;
  context.setLineDash([8, 12]);
  context.beginPath();
  context.moveTo(72, 892);
  context.bezierCurveTo(164, 1005, 216, 923, 303, 870);
  context.bezierCurveTo(394, 817, 395, 1020, 500, 918);
  context.bezierCurveTo(596, 824, 631, 908, 746, 800);
  context.stroke();
  context.beginPath();
  context.moveTo(84, 944);
  context.bezierCurveTo(168, 874, 216, 1010, 328, 968);
  context.bezierCurveTo(430, 930, 447, 809, 562, 862);
  context.bezierCurveTo(666, 910, 694, 785, 813, 675);
  context.stroke();
  context.restore();

  context.save();
  context.strokeStyle = COBALT;
  context.lineWidth = 11;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(72, 850);
  context.bezierCurveTo(160, 776, 220, 810, 306, 900);
  context.bezierCurveTo(384, 982, 400, 770, 468, 752);
  context.bezierCurveTo(547, 731, 574, 822, 652, 770);
  context.bezierCurveTo(715, 728, 744, 644, 820, 615);
  context.stroke();
  context.restore();

  drawFourPointStar(context, 246, 819, 13, YELLOW);
  drawFourPointStar(context, 415, 822, 10, YELLOW);
  drawFourPointStar(context, 571, 788, 12, YELLOW);

  drawJourneyMilestone(context, 116, 842, "01", "已收藏", model.totalApplications, "bookmark", "above");
  drawJourneyMilestone(context, 306, 900, "02", "已投递", model.appliedCount, "plane", "below");
  drawJourneyMilestone(context, 468, 752, "03", "面试中", model.interviewCount, "chat", "above");
  drawJourneyMilestone(context, 652, 770, "04", "已拿到 Offer", model.offerCount, "star", "above");
  drawFlag(context, 820, 615);
  context.fillStyle = COBALT;
  context.font = "700 24px sans-serif";
  context.fillText("未来可期", 785, 1071);
  context.fillStyle = NAVY;
  context.font = "600 16px sans-serif";
  context.fillText(truncateText(context, model.footerNote, 250), 770, 1098);
}

function drawJourneyMilestone(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  number: string,
  label: string,
  value: number,
  icon: LineIcon,
  placement: "above" | "below",
) {
  context.fillStyle = COBALT;
  context.font = "900 30px sans-serif";
  context.textAlign = "center";
  const textY = placement === "above" ? y - 88 : y + 111;
  context.fillText(number, x, textY);
  context.fillStyle = NAVY;
  context.font = "700 17px sans-serif";
  context.fillText(label, x, textY + 26);
  context.font = "800 22px sans-serif";
  context.fillText(`${value} 家`, x, textY + 54);
  context.textAlign = "left";

  context.fillStyle = PAPER;
  context.strokeStyle = NAVY;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(x, y, 32, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  drawLineIcon(context, icon, x - 18, y - 18, 36, NAVY);
}

function drawBottleSnapshot(
  context: CanvasRenderingContext2D,
  applications: ApplicationWithJob[],
  positions: Map<string, BottleStackPosition>,
  bottleImage: HTMLImageElement,
  bottleSnapshot: HTMLImageElement | null,
  model: SharePosterModel,
) {
  const x = 800;
  const y = 642;
  const width = 340;
  const height = 340;

  if (bottleSnapshot) {
    context.drawImage(bottleSnapshot, x, y, width, height);
  } else if (applications.length === 0) {
    for (let index = 0; index < 8; index += 1) {
      const starX = x + width * (0.3 + ((index * 17) % 42) / 100);
      const starY = y + height * (0.45 + ((index * 11) % 30) / 100);
      drawShareStar(context, starX, starY, 13 + (index % 3) * 3, "opened");
    }
  } else {
    applications.forEach((application) => {
      const position = positions.get(application.id);
      if (!position || position.visible === false) return;
      const starX = x + (position.xPct / 100) * width;
      const starY = y + (position.yPct / 100) * height;
      drawShareStar(context, starX, starY, Math.max(11, position.size * 1.12), application.status);
    });
  }

  context.save();
  context.globalAlpha = 0.89;
  context.globalCompositeOperation = "screen";
  context.drawImage(bottleImage, x, y, width, height);
  context.restore();

  context.fillStyle = NAVY;
  context.font = "700 17px sans-serif";
  context.textAlign = "center";
  context.fillText(`${model.totalApplications} 颗星 · ${model.totalCompanies} 家企业`, x + width / 2, 1032);
  context.textAlign = "left";
}

function drawShareCompanyList(context: CanvasRenderingContext2D, model: SharePosterModel) {
  const headerY = 1146;
  drawBuildingIcon(context, 72, headerY - 34, 31);
  context.fillStyle = NAVY;
  context.font = "900 30px sans-serif";
  context.fillText("我的投递足迹", 121, headerY);
  context.strokeStyle = COBALT;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(310, headerY - 8);
  context.lineTo(1128, headerY - 8);
  context.stroke();
  drawFourPointStar(context, 1142, headerY - 8, 8, YELLOW);

  if (model.companies.length === 0) {
    context.fillStyle = SLATE;
    context.font = "600 20px sans-serif";
    context.fillText("还没有投递记录，先去收进第一颗星", 72, 1210);
    return;
  }

  const rowsPerColumn = Math.ceil(model.companies.length / 2);
  const rowTop = 1195;
  const rowHeight = 43;
  const left = model.companies.slice(0, rowsPerColumn);
  const right = model.companies.slice(rowsPerColumn);
  drawCompanyColumn(context, left, 72, rowTop, rowHeight);
  drawCompanyColumn(context, right, 638, rowTop, rowHeight);
  if (right.length > 0) {
    context.save();
    context.strokeStyle = "rgba(18,41,78,0.32)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(602, 1170);
    context.lineTo(602, Math.min(1437, rowTop + rowsPerColumn * rowHeight + 7));
    context.stroke();
    context.restore();
  }

  if (model.overflowCompanyCount > 0) {
    context.fillStyle = COBALT;
    context.font = "700 17px sans-serif";
    context.textAlign = "right";
    context.fillText(`…… 和 ${model.overflowCompanyCount} 家公司`, 1128, Math.min(1438, rowTop + rowsPerColumn * rowHeight + 16));
    context.textAlign = "left";
  }
}

function drawCompanyColumn(
  context: CanvasRenderingContext2D,
  companies: SharePosterModel["companies"],
  x: number,
  rowTop: number,
  rowHeight: number,
) {
  companies.forEach((company, index) => {
    const y = rowTop + index * rowHeight;
    context.fillStyle = COBALT;
    context.fillRect(x, y - 22, 31, 31);
    context.fillStyle = "#FFFFFF";
    context.font = "800 15px sans-serif";
    context.textAlign = "center";
    context.fillText(String(index + 1).padStart(2, "0"), x + 15.5, y - 1);
    context.textAlign = "left";
    context.fillStyle = NAVY;
    context.font = "600 18px sans-serif";
    const count = company.applicationCount > 1 ? ` ×${company.applicationCount}` : "";
    context.fillText(truncateText(context, `${company.companyName}${count}`, 425), x + 48, y);
    context.save();
    context.strokeStyle = "rgba(18,41,78,0.2)";
    context.lineWidth = 1;
    context.setLineDash([3, 5]);
    context.beginPath();
    context.moveTo(x + 48, y + 13);
    context.lineTo(x + 505, y + 13);
    context.stroke();
    context.restore();
  });
}

function drawShareFooter(context: CanvasRenderingContext2D, qrImage: HTMLImageElement, model: SharePosterModel) {
  const lineY = 1461;
  context.save();
  context.strokeStyle = "rgba(18,41,78,0.58)";
  context.lineWidth = 1;
  context.setLineDash([5, 6]);
  context.beginPath();
  context.moveTo(70, lineY);
  context.lineTo(1130, lineY);
  context.stroke();
  context.restore();

  const qrX = 86;
  const qrY = 1490;
  const qrSize = 94;
  context.fillStyle = "#FFFFFF";
  context.fillRect(qrX, qrY, qrSize, qrSize);
  context.drawImage(qrImage, qrX + 5, qrY + 5, qrSize - 10, qrSize - 10);
  drawQrCorners(context, qrX - 8, qrY - 8, qrSize + 16);

  context.fillStyle = NAVY;
  context.font = "900 29px sans-serif";
  context.fillText("扫码生成你的「星光瓶」", 245, 1533);
  context.fillStyle = COBALT;
  context.font = "700 19px sans-serif";
  context.fillText(truncateText(context, model.footerNote, 650), 245, 1568);
}

type LineIcon = "bookmark" | "plane" | "chat" | "star";

function drawLineIcon(
  context: CanvasRenderingContext2D,
  type: LineIcon,
  x: number,
  y: number,
  size: number,
  color = NAVY,
) {
  context.save();
  context.translate(x, y);
  context.strokeStyle = color;
  context.lineWidth = Math.max(2, size * 0.065);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.fillStyle = PAPER;

  if (type === "bookmark") {
    context.beginPath();
    context.moveTo(size * 0.2, size * 0.12);
    context.lineTo(size * 0.8, size * 0.12);
    context.lineTo(size * 0.8, size * 0.86);
    context.lineTo(size * 0.5, size * 0.65);
    context.lineTo(size * 0.2, size * 0.86);
    context.closePath();
    context.stroke();
  }

  if (type === "plane") {
    context.beginPath();
    context.moveTo(size * 0.08, size * 0.43);
    context.lineTo(size * 0.9, size * 0.08);
    context.lineTo(size * 0.56, size * 0.9);
    context.lineTo(size * 0.42, size * 0.55);
    context.closePath();
    context.stroke();
    context.beginPath();
    context.moveTo(size * 0.42, size * 0.55);
    context.lineTo(size * 0.9, size * 0.08);
    context.moveTo(size * 0.42, size * 0.55);
    context.lineTo(size * 0.3, size * 0.74);
    context.stroke();
  }

  if (type === "chat") {
    roundedRect(context, size * 0.08, size * 0.12, size * 0.84, size * 0.6, size * 0.18);
    context.stroke();
    context.beginPath();
    context.moveTo(size * 0.3, size * 0.72);
    context.lineTo(size * 0.27, size * 0.91);
    context.lineTo(size * 0.49, size * 0.73);
    context.stroke();
    [0.33, 0.5, 0.67].forEach((dotX) => {
      context.fillStyle = color;
      context.beginPath();
      context.arc(size * dotX, size * 0.42, size * 0.045, 0, Math.PI * 2);
      context.fill();
    });
  }

  if (type === "star") {
    drawStarPath(context, size * 0.44, size * 0.2);
    context.stroke();
  }
  context.restore();
}

function drawBuildingIcon(context: CanvasRenderingContext2D, x: number, y: number, size: number) {
  context.save();
  context.strokeStyle = COBALT;
  context.lineWidth = 2.5;
  context.lineJoin = "round";
  context.strokeRect(x + 5, y + 5, size * 0.62, size * 0.86);
  context.beginPath();
  context.moveTo(x + size * 0.67, y + size * 0.26);
  context.lineTo(x + size * 0.89, y + size * 0.26);
  context.lineTo(x + size * 0.89, y + size * 0.86);
  context.moveTo(x + size * 0.25, y + size * 0.28);
  context.lineTo(x + size * 0.25, y + size * 0.42);
  context.moveTo(x + size * 0.47, y + size * 0.28);
  context.lineTo(x + size * 0.47, y + size * 0.42);
  context.moveTo(x + size * 0.25, y + size * 0.56);
  context.lineTo(x + size * 0.25, y + size * 0.7);
  context.moveTo(x + size * 0.47, y + size * 0.56);
  context.lineTo(x + size * 0.47, y + size * 0.7);
  context.stroke();
  context.restore();
}

function drawFlag(context: CanvasRenderingContext2D, x: number, y: number) {
  context.save();
  context.strokeStyle = "rgba(95,111,134,0.62)";
  context.fillStyle = "rgba(95,111,134,0.48)";
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(x, y - 43);
  context.lineTo(x, y + 18);
  context.stroke();
  context.beginPath();
  context.moveTo(x + 2, y - 38);
  context.bezierCurveTo(x + 28, y - 44, x + 36, y - 30, x + 58, y - 35);
  context.lineTo(x + 58, y - 14);
  context.bezierCurveTo(x + 35, y - 10, x + 27, y - 20, x + 2, y - 14);
  context.closePath();
  context.fill();
  context.restore();
}

function drawQrCorners(context: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const corner = 22;
  context.save();
  context.strokeStyle = COBALT;
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(x, y + corner);
  context.lineTo(x, y);
  context.lineTo(x + corner, y);
  context.moveTo(x + size - corner, y);
  context.lineTo(x + size, y);
  context.lineTo(x + size, y + corner);
  context.moveTo(x, y + size - corner);
  context.lineTo(x, y + size);
  context.lineTo(x + corner, y + size);
  context.moveTo(x + size - corner, y + size);
  context.lineTo(x + size, y + size);
  context.lineTo(x + size, y + size - corner);
  context.stroke();
  context.restore();
}

function drawFourPointStar(context: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  context.save();
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(x, y - size);
  context.bezierCurveTo(x + size * 0.22, y - size * 0.25, x + size * 0.28, y - size * 0.22, x + size, y);
  context.bezierCurveTo(x + size * 0.28, y + size * 0.22, x + size * 0.22, y + size * 0.25, x, y + size);
  context.bezierCurveTo(x - size * 0.22, y + size * 0.25, x - size * 0.28, y + size * 0.22, x - size, y);
  context.bezierCurveTo(x - size * 0.28, y - size * 0.22, x - size * 0.22, y - size * 0.25, x, y - size);
  context.fill();
  context.restore();
}

function drawShareStar(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  status: ApplicationStatus,
) {
  const color = getShareColor(status);
  context.save();
  context.globalAlpha = 0.95;
  context.fillStyle = color.fill;
  context.strokeStyle = color.stroke;
  context.lineWidth = 1.5;
  context.translate(x, y);
  drawStarPath(context, size * 0.5, size * 0.22);
  context.fill();
  context.stroke();
  context.restore();
}

function getShareColor(status: ApplicationStatus) {
  if (status === "offer") return { fill: YELLOW, stroke: "#B47A05" };
  if (["first_round", "second_round", "final_round", "written_test"].includes(status)) {
    return { fill: COBALT, stroke: NAVY };
  }
  return { fill: "#A8B8CB", stroke: NAVY };
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

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  fontSize: number,
  maxLines: number,
) {
  context.font = `900 ${fontSize}px sans-serif`;
  const lines: string[] = [];
  text.split(/\r?\n/).forEach((segment) => {
    let line = "";
    for (const character of segment) {
      const next = line + character;
      if (line && context.measureText(next).width > maxWidth) {
        lines.push(line);
        line = character;
      } else {
        line = next;
      }
    }
    if (line || segment === "") lines.push(line);
  });
  if (lines.length <= maxLines) return lines;
  const clipped = lines.slice(0, maxLines);
  clipped[maxLines - 1] = truncateText(context, clipped[maxLines - 1], maxWidth - 12);
  return clipped;
}

function truncateText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (context.measureText(text).width <= maxWidth) return text;
  let next = text;
  while (next.length > 1 && context.measureText(`${next}…`).width > maxWidth) {
    next = next.slice(0, -1);
  }
  return `${next}…`;
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
      else reject(new Error("分享图暂未生成，请稍后重试。"));
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
  const time = [String(now.getHours()).padStart(2, "0"), String(now.getMinutes()).padStart(2, "0")].join("");
  return `${date}-${time}`;
}
