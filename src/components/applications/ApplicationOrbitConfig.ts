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
  opened: { label: "已浏览", radius: 260, duration: 96, opacity: 0.38 },
  applied: { label: "已投递", radius: 220, duration: 84, opacity: 0.46 },
  written_test: { label: "笔试", radius: 180, duration: 72, opacity: 0.54 },
  first_round: { label: "一面", radius: 145, duration: 62, opacity: 0.62 },
  second_round: { label: "二面", radius: 112, duration: 54, opacity: 0.70 },
  final_round: { label: "终面", radius: 82, duration: 46, opacity: 0.78 },
  offer: { label: "Offer", radius: 48, duration: 38, opacity: 0.92 },
} as const;

export type OrbitStatus = keyof typeof ORBIT_CONFIG;

export const ORBIT_BANDS = ["explore", "submit", "interview", "offer_core"] as const;

export const ORBIT_BAND_CONFIG = {
  explore: {
    label: "探索带",
    description: "已浏览",
    statuses: ["opened"],
    radius: 318,
    duration: 90,
    opacity: 0.38,
  },
  submit: {
    label: "投递带",
    description: "已投递 / 笔试",
    statuses: ["applied", "written_test"],
    radius: 245,
    duration: 72,
    opacity: 0.54,
  },
  interview: {
    label: "面试带",
    description: "一面 / 二面 / 终面",
    statuses: ["first_round", "second_round", "final_round"],
    radius: 180,
    duration: 58,
    opacity: 0.70,
  },
  offer_core: {
    label: "Offer 核",
    description: "Offer",
    statuses: ["offer"],
    radius: 110,
    duration: 42,
    opacity: 0.92,
  },
} as const satisfies Record<
  string,
  {
    label: string;
    description: string;
    statuses: readonly OrbitStatus[];
    radius: number;
    duration: number;
    opacity: number;
  }
>;

export type OrbitBand = keyof typeof ORBIT_BAND_CONFIG;

export function getOrbitBandForStatus(status: OrbitStatus) {
  return (
    ORBIT_BANDS.find((band) =>
      (ORBIT_BAND_CONFIG[band].statuses as readonly OrbitStatus[]).includes(status),
    ) ?? "explore"
  );
}
