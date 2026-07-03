import type { ApplicationStatus } from "@/lib/types";

export const ORBIT_STATUS_ORDER = [
  "opened",
  "applied",
  "written_test",
  "first_round",
  "second_round",
  "final_round",
  "offer",
] as const satisfies readonly ApplicationStatus[];

export const ORBIT_CONFIG = {
  opened: { label: "已打开官网", radius: 260, duration: 96, opacity: 0.38 },
  applied: { label: "已投递", radius: 220, duration: 84, opacity: 0.46 },
  written_test: { label: "笔试", radius: 180, duration: 72, opacity: 0.54 },
  first_round: { label: "一面", radius: 145, duration: 62, opacity: 0.62 },
  second_round: { label: "二面", radius: 112, duration: 54, opacity: 0.70 },
  final_round: { label: "终面", radius: 82, duration: 46, opacity: 0.78 },
  offer: { label: "Offer", radius: 48, duration: 38, opacity: 0.92 },
} as const;

export type OrbitStatus = keyof typeof ORBIT_CONFIG;
