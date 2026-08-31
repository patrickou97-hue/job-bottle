"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

const CHARACTER_STAGGER_MS = 20;
const CHARACTER_TRANSITION_MS = 300;

type KineticWordProps = {
  words: readonly string[];
  intervalMs?: number;
  className?: string;
};

export function KineticWord({ words, intervalMs = 2_000, className }: KineticWordProps) {
  const trackRef = useRef<HTMLSpanElement>(null);
  const reducedMotion = useReducedMotion();
  const firstWord = words[0] ?? "";
  const measuredWord = words.reduce(
    (longest, word) => word.length > longest.length ? word : longest,
    firstWord,
  );

  useEffect(() => {
    const track = trackRef.current;
    if (!track || words.length < 2 || reducedMotion) return;

    let currentLine = track.querySelector<HTMLElement>("[data-kinetic-line]");
    let currentIndex = 0;
    let rotateTimer: number | undefined;
    let transitionTimer: number | undefined;
    let animationFrame: number | undefined;

    const schedule = () => {
      rotateTimer = window.setTimeout(() => {
        const nextIndex = (currentIndex + 1) % words.length;
        const nextLine = createLine(words[nextIndex]);
        track.append(nextLine);

        animationFrame = window.requestAnimationFrame(() => {
          currentLine?.classList.add("kinetic-word__line--out");
          nextLine.classList.add("kinetic-word__line--in");
        });

        transitionTimer = window.setTimeout(() => {
          currentLine?.remove();
          currentLine = nextLine;
          currentIndex = nextIndex;
          schedule();
        }, CHARACTER_TRANSITION_MS + CHARACTER_STAGGER_MS * Math.min(words[nextIndex].length, 8) + 50);
      }, intervalMs);
    };

    schedule();

    return () => {
      if (rotateTimer !== undefined) window.clearTimeout(rotateTimer);
      if (transitionTimer !== undefined) window.clearTimeout(transitionTimer);
      if (animationFrame !== undefined) window.cancelAnimationFrame(animationFrame);
    };
  }, [intervalMs, reducedMotion, words]);

  return (
    <span className={cn("kinetic-word", className)}>
      <span className="sr-only">{firstWord}</span>
      <span aria-hidden="true" className="kinetic-word__measure">{measuredWord}</span>
      <span ref={trackRef} aria-hidden="true" className="kinetic-word__track">
        <CharacterLine word={firstWord} />
      </span>
    </span>
  );
}

function CharacterLine({ word }: { word: string }) {
  return (
    <span className="kinetic-word__line kinetic-word__line--in" data-kinetic-line>
      {Array.from(word).map((character, index) => (
        <span className="kinetic-word__char-mask" key={`${character}-${index}`}>
          <span
            className="kinetic-word__char"
            style={{ "--kinetic-char-delay": `${Math.min(index, 8) * CHARACTER_STAGGER_MS}ms` } as CSSProperties}
          >
            {character === " " ? "\u00a0" : character}
          </span>
        </span>
      ))}
    </span>
  );
}

function createLine(word: string) {
  const line = document.createElement("span");
  line.className = "kinetic-word__line";
  line.dataset.kineticLine = "true";

  Array.from(word).forEach((character, index) => {
    const mask = document.createElement("span");
    mask.className = "kinetic-word__char-mask";
    const char = document.createElement("span");
    char.className = "kinetic-word__char";
    char.style.setProperty("--kinetic-char-delay", `${Math.min(index, 8) * CHARACTER_STAGGER_MS}ms`);
    char.textContent = character === " " ? "\u00a0" : character;
    mask.append(char);
    line.append(mask);
  });

  return line;
}
