import { daysUntilShanghai, formatShanghaiDate, getJobDeadline } from "@/lib/dates";
import type { Job } from "@/lib/types";

export function getUpcomingDeadlineJobs(jobs: Job[], now = new Date()) {
  return jobs
    .map((job) => {
      const deadline = getJobDeadline(job);
      const days = daysUntilShanghai(deadline, now);
      return { job, deadline, days };
    })
    .filter((item): item is { job: Job; deadline: string; days: number } =>
      item.deadline !== null && item.days !== null && item.days >= 0 && item.days <= 7,
    )
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
}

export async function downloadDeadlineDigest(jobs: Job[], siteUrl: string) {
  const upcoming = getUpcomingDeadlineJobs(jobs);
  if (upcoming.length === 0) return false;

  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const context = canvas.getContext("2d");
  if (!context) return false;

  drawDigest(context, upcoming, siteUrl);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return false;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  link.href = url;
  link.download = `job-bottle-digest-${date}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return true;
}

function drawDigest(
  context: CanvasRenderingContext2D,
  upcoming: ReturnType<typeof getUpcomingDeadlineJobs>,
  siteUrl: string,
) {
  const width = context.canvas.width;
  const height = context.canvas.height;
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#0B1226");
  gradient.addColorStop(0.55, "#101A36");
  gradient.addColorStop(1, "#4A3B7C");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.fillStyle = "rgba(255,217,142,0.08)";
  context.beginPath();
  context.ellipse(860, 210, 360, 120, -0.25, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#F2F0FF";
  context.font = '600 56px "Noto Sans SC", "PingFang SC", sans-serif';
  context.fillText(`本周截止 · ${getDigestRangeLabel()}`, 80, 120);

  context.fillStyle = "rgba(180,188,224,0.76)";
  context.font = '400 28px "Noto Sans SC", "PingFang SC", sans-serif';
  context.fillText("当前筛选下的 7 日内截止岗位", 80, 168);

  const visible = upcoming.slice(0, 10);
  visible.forEach((item, index) => {
    const top = 250 + index * 84;
    context.fillStyle = index % 2 === 0 ? "rgba(255,255,255,0.045)" : "rgba(255,255,255,0.025)";
    roundRect(context, 72, top - 42, 936, 64, 24);
    context.fill();

    context.fillStyle = "#FFF6E3";
    context.font = '500 30px "Noto Sans SC", "PingFang SC", sans-serif';
    context.fillText(trimText(context, item.job.company_name, 260), 104, top);

    context.fillStyle = "rgba(180,188,224,0.78)";
    context.font = '400 24px "Noto Sans SC", "PingFang SC", sans-serif';
    context.fillText(trimText(context, item.job.job_titles || "岗位待补充", 410), 350, top);

    context.fillStyle = "#FFC2A0";
    context.font = '500 24px "Noto Sans SC", "PingFang SC", sans-serif';
    context.fillText(formatShanghaiDate(item.deadline).replaceAll("/", "."), 816, top);
  });

  if (upcoming.length > visible.length) {
    context.fillStyle = "rgba(180,188,224,0.78)";
    context.font = '400 24px "Noto Sans SC", "PingFang SC", sans-serif';
    context.fillText(`等 ${upcoming.length - visible.length} 个岗位`, 82, 1120);
  }

  context.fillStyle = "rgba(242,240,255,0.86)";
  context.font = '500 28px "Noto Sans SC", "PingFang SC", sans-serif';
  context.fillText("秋招星瓶 Job Bottle", 80, 1240);
  context.fillStyle = "rgba(180,188,224,0.68)";
  context.font = '400 22px "Noto Sans SC", "PingFang SC", sans-serif';
  context.fillText(siteUrl, 80, 1280);

  drawQrPlaceholder(context, 842, 1160, 128, siteUrl);
}

function getDigestRangeLabel() {
  const now = new Date();
  const start = `${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;
  const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const end = `${String(endDate.getMonth() + 1).padStart(2, "0")}.${String(endDate.getDate()).padStart(2, "0")}`;
  return `${start}-${end}`;
}

function trimText(context: CanvasRenderingContext2D, value: string, maxWidth: number) {
  if (context.measureText(value).width <= maxWidth) return value;
  let output = value;
  while (output.length > 1 && context.measureText(`${output}...`).width > maxWidth) {
    output = output.slice(0, -1);
  }
  return `${output}...`;
}

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

function drawQrPlaceholder(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  seed: string,
) {
  context.fillStyle = "#F2F0FF";
  roundRect(context, x, y, size, size, 16);
  context.fill();
  context.fillStyle = "#0B1226";
  const cells = 9;
  const cell = size / cells;
  for (let row = 0; row < cells; row += 1) {
    for (let col = 0; col < cells; col += 1) {
      const code = seed.charCodeAt((row * cells + col) % seed.length);
      if ((code + row * 3 + col * 5) % 3 === 0 || isFinder(row, col, cells)) {
        context.fillRect(x + col * cell + 3, y + row * cell + 3, cell - 6, cell - 6);
      }
    }
  }
}

function isFinder(row: number, col: number, cells: number) {
  const inTopLeft = row < 3 && col < 3;
  const inTopRight = row < 3 && col >= cells - 3;
  const inBottomLeft = row >= cells - 3 && col < 3;
  return inTopLeft || inTopRight || inBottomLeft;
}
