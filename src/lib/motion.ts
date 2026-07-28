import type { Transition, Variants } from "motion/react";

export const motionDuration = {
  instant: 0.12,
  fast: 0.18,
  normal: 0.26,
  slow: 0.38,
  immersive: 0.92,
} as const;

export const motionEase = {
  standard: [0.2, 0, 0, 1],
  enter: [0.16, 1, 0.3, 1],
  exit: [0.4, 0, 1, 1],
  emphasized: [0.2, 0.8, 0.2, 1],
  planetApproach: [0.22, 0.86, 0.24, 1],
} as const;

export const layoutTransition: Transition = {
  duration: motionDuration.normal,
  ease: motionEase.standard,
};

export const springTransition: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 38,
  mass: 0.82,
};

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  enter: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -5 },
};

export const listItemVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  enter: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

export const modalBackdropVariants: Variants = {
  initial: { opacity: 0 },
  enter: { opacity: 1 },
  exit: { opacity: 0 },
};

export const modalPanelVariants: Variants = {
  initial: { opacity: 0, y: 18, scale: 0.985 },
  enter: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 10, scale: 0.99 },
};

export const feedbackVariants: Variants = {
  initial: { opacity: 0, y: -6, scale: 0.99 },
  enter: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -4, scale: 0.995 },
};
