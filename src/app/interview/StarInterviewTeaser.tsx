"use client";

import Image from "next/image";
import Link from "next/link";
import {
  motion,
  type MotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { type ReactNode, useRef } from "react";
import styles from "./StarInterviewTeaser.module.css";

type TunnelPhrase = {
  text: string;
  x: string;
  y: string;
  size: string;
  tone: "bright" | "mid" | "quiet";
  delay: number;
};

const TUNNEL_PHRASES: TunnelPhrase[] = [
  { text: "面试很难，怎么办？", x: "-25vw", y: "-34vh", size: "clamp(3.8rem, 8.8vw, 9.6rem)", tone: "bright", delay: 0 },
  { text: "一开口就紧张", x: "28vw", y: "-20vh", size: "clamp(2.8rem, 6vw, 6.8rem)", tone: "mid", delay: 0.035 },
  { text: "害怕没有话说", x: "-31vw", y: "3vh", size: "clamp(2.6rem, 5.4vw, 6rem)", tone: "quiet", delay: 0.065 },
  { text: "准备了，却表达不出来", x: "25vw", y: "19vh", size: "clamp(3rem, 6.6vw, 7.4rem)", tone: "bright", delay: 0.095 },
  { text: "回答没有重点", x: "-24vw", y: "35vh", size: "clamp(2.5rem, 5vw, 5.8rem)", tone: "mid", delay: 0.125 },
  { text: "面试焦虑", x: "25vw", y: "39vh", size: "clamp(2.8rem, 5.8vw, 6.5rem)", tone: "quiet", delay: 0.15 },
];

export function StarInterviewTeaser() {
  const tunnelRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: tunnelRef,
    offset: ["start start", "end end"],
  });
  const pointScale = useTransform(scrollYProgress, [0.08, 0.72, 0.96], [0.58, 1.08, 3.2]);
  const pointOpacity = useTransform(scrollYProgress, [0, 0.72, 0.94, 1], [0.35, 1, 1, 0]);
  const tunnelDarkness = useTransform(scrollYProgress, [0, 0.74, 1], [0, 0.28, 0.9]);
  const cueOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0]);

  return (
    <main className={styles.page}>
      <section ref={tunnelRef} className={styles.tunnel} aria-label="面试焦虑逐渐汇入远方">
        <div className={styles.tunnelSticky}>
          <div className={styles.tunnelGrain} aria-hidden="true" />
          <motion.div className={styles.tunnelShade} style={{ opacity: tunnelDarkness }} aria-hidden="true" />

          <Link href="/" className={styles.backLink}>
            <span aria-hidden="true">←</span>
            返回拾星
          </Link>

          <div className={styles.cornerBrand} aria-label="诘星 StarInterview">
            <Image
              src="/brand/star-interview/wordmark.png"
              alt="诘星 StarInterview"
              width={1089}
              height={493}
              priority
            />
          </div>

          <div className={styles.vanishingStage} aria-hidden="true">
            {TUNNEL_PHRASES.map((phrase) => (
              <PerspectivePhrase
                key={phrase.text}
                phrase={phrase}
                progress={scrollYProgress}
                reducedMotion={Boolean(reducedMotion)}
              />
            ))}
            <motion.span
              className={styles.vanishingPoint}
              style={reducedMotion ? undefined : { scale: pointScale, opacity: pointOpacity }}
            />
          </div>

          <motion.div className={styles.scrollCue} style={reducedMotion ? undefined : { opacity: cueOpacity }}>
            <span>向下，穿过这些声音</span>
            <span className={styles.scrollLine} aria-hidden="true" />
          </motion.div>
        </div>
      </section>

      <section className={styles.reveal}>
        <header className={styles.productHero}>
          <p className={styles.revealEyebrow}>全新面试辅助工具</p>
          <div className={styles.identity}>
            <div className={styles.iconCrop}>
              <Image
                src="/brand/star-interview/app-icon.png"
                alt="诘星 StarInterview 图标"
                fill
                sizes="(max-width: 640px) 116px, 176px"
                priority
              />
            </div>
            <h1 className={styles.identityWordmark}>
              <Image
                src="/brand/star-interview/wordmark.png"
                alt="诘星 StarInterview"
                width={1089}
                height={493}
                priority
              />
            </h1>
          </div>
          <div className={styles.launchLine}>
            <span>即将上线</span>
            <i aria-hidden="true" />
          </div>
          <motion.h2
            className={styles.heroStatement}
            initial={reducedMotion ? false : { opacity: 0, y: 56 }}
            whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.45 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <span>谛听察意，</span>
            <span>应答成章。</span>
          </motion.h2>
          <p className={styles.heroIntroduction}>
            诘星在面试中听取问题，从你授权的拾星简历里找到真实经历，
            先给出清晰的回答结构，再陪你把表达补充完整。
          </p>
        </header>

        <figure className={styles.productFigure}>
          <Image
            src="/brand/star-interview/product-home.png"
            alt="诘星 StarInterview macOS 实机界面"
            width={2440}
            height={1786}
            sizes="(max-width: 768px) 94vw, 88vw"
            className={styles.productImage}
            priority
          />
          <figcaption>
            <span>诘星 StarInterview</span>
            <span>macOS 实机界面</span>
          </figcaption>
        </figure>

        <section className={styles.overviewIntro}>
          <p>从问题进入耳朵，</p>
          <p>到答案重新属于你。</p>
        </section>

        <section className={`${styles.chapter} ${styles.listenChapter}`} aria-labelledby="listen-title">
          <ChapterCopy
            index="01"
            eyebrow="LISTEN"
            title="先听懂，对方真正想问什么。"
            id="listen-title"
            reducedMotion={Boolean(reducedMotion)}
          >
            诘星会识别问题、停顿与追问的边界。你不需要在对方还没说完时，
            就慌着猜测应该从哪里开始回答。
          </ChapterCopy>
          <motion.div
            className={styles.listeningVisual}
            initial={reducedMotion ? false : { opacity: 0, scale: 0.94 }}
            whileInView={reducedMotion ? undefined : { opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            aria-hidden="true"
          >
            <div className={styles.questionFragments}>
              <span>请介绍一个</span>
              <strong>你真正解决过的难题</strong>
              <span>当时你做了什么？</span>
            </div>
            <div className={styles.waveform}>
              {[28, 58, 38, 82, 46, 94, 54, 72, 36, 64, 30, 48].map((height, index) => (
                <i key={`${height}-${index}`} style={{ height }} />
              ))}
            </div>
          </motion.div>
        </section>

        <section className={`${styles.chapter} ${styles.resumeChapter}`} aria-labelledby="resume-title">
          <ChapterCopy
            index="02"
            eyebrow="RECALL"
            title="协助你结构化表达你曾经做过的事。"
            id="resume-title"
            reducedMotion={Boolean(reducedMotion)}
          >
            诘星从你授权的拾星简历里寻找与问题有关的经历。项目、职责与结果，
            都来自你已经确认过的内容。
          </ChapterCopy>
        </section>

        <section className={`${styles.chapter} ${styles.answerChapter}`} aria-labelledby="answer-title">
          <ChapterCopy
            index="03"
            eyebrow="RESPOND"
            title="陪你把话表达清楚。"
            id="answer-title"
            reducedMotion={Boolean(reducedMotion)}
          >
            提示先出现结构和关键事实，不用背一段机器写好的台词。
            你仍然用自己的语气回答，只是不再独自面对空白。
          </ChapterCopy>
          <motion.div
            className={styles.answerVisual}
            initial={reducedMotion ? false : { opacity: 0, y: 60 }}
            whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            aria-hidden="true"
          >
            <div><span>S</span><p>当时是什么情境</p></div>
            <div><span>T</span><p>你要解决什么</p></div>
            <div><span>A</span><p>你采取了什么行动</p></div>
            <div><span>R</span><p>事情产生了什么结果</p></div>
          </motion.div>
        </section>

        <section className={styles.bridge}>
          <p>你的经历，留在拾星。</p>
          <h2>当面试开始，<br />诘星把它带回你身边。</h2>
          <p className={styles.bridgeNote}>
            同一份简历，由你授权读取。诘星不会代替你的判断，
            也不会把一场面试变成背诵。
          </p>
        </section>

        <footer className={styles.footer}>
          <div>
            <Image
              src="/brand/star-interview/wordmark.png"
              alt="诘星"
              width={1089}
              height={493}
              className={styles.wordmark}
            />
            <p>拾星 StarJob 同系列 · 原生 macOS 面试辅助工具 · 即将上线</p>
          </div>
          <Link href="/">继续使用拾星 <span aria-hidden="true">↗</span></Link>
        </footer>
      </section>
    </main>
  );
}

function ChapterCopy({
  index,
  eyebrow,
  title,
  id,
  children,
  reducedMotion,
}: {
  index: string;
  eyebrow: string;
  title: string;
  id: string;
  children: ReactNode;
  reducedMotion: boolean;
}) {
  return (
    <motion.div
      className={styles.chapterCopy}
      initial={reducedMotion ? false : { opacity: 0, y: 54 }}
      whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <p className={styles.chapterIndex}><span>{index}</span>{eyebrow}</p>
      <h2 id={id}>{title}</h2>
      <p className={styles.chapterBody}>{children}</p>
    </motion.div>
  );
}

function PerspectivePhrase({
  phrase,
  progress,
  reducedMotion,
}: {
  phrase: TunnelPhrase;
  progress: MotionValue<number>;
  reducedMotion: boolean;
}) {
  const start = phrase.delay;
  const midpoint = Math.min(0.72 + phrase.delay * 0.42, 0.82);
  const end = Math.min(0.92 + phrase.delay * 0.24, 0.98);
  const x = useTransform(progress, [start, end], [phrase.x, "0vw"]);
  const y = useTransform(progress, [start, end], [phrase.y, "0vh"]);
  const scale = useTransform(progress, [start, midpoint, end], [1, 0.34, 0.035]);
  const opacity = useTransform(progress, [start, midpoint, end], [1, 0.48, 0]);
  const blur = useTransform(progress, [start, midpoint, end], ["blur(0px)", "blur(0.7px)", "blur(3px)"]);

  return (
    <span className={styles.phraseAnchor}>
      <motion.span
        className={`${styles.tunnelPhrase} ${styles[phrase.tone]}`}
        style={reducedMotion ? { fontSize: phrase.size } : { x, y, scale, opacity, filter: blur, fontSize: phrase.size }}
      >
        {phrase.text}
      </motion.span>
    </span>
  );
}
