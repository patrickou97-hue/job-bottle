# Job Bottle — Visual Redesign Implementation Specification

> Scope note: the Hermes inspection report was not attached to this conversation; only its constraint "no external image assets" was quoted (and overridden by the client). Every file path in this document is therefore a **recommended new file** or an **assumed existing file (unverified)** and is labeled as such. Nothing here should be treated as a confirmed reference to the current repo. All tokens, algorithms, and component contracts are codebase-independent and safe to implement as written.

---

## 1. Visual target definition

One sentence to align everyone: **Job Bottle should feel like the quiet interior of an observatory — a dark instrument you look *through*, not a dark website you look *at*.**

What separates that from the three failure modes:

| Axis | Generic dark SaaS | Game / solar system | Neon cyberpunk | **Job Bottle target** |
|---|---|---|---|---|
| Background | flat `#111` or `#1a1a2e` gradient | saturated purple space, big planets | magenta/cyan gradients | photographic near-black blue, faint structure, no visible gradient steps |
| Surfaces | cards with borders + shadows everywhere | rounded bubbles | glass panels with glow borders | almost no cards; content floats on darkness, separated by rhythm and hairlines |
| Color count | 6–10 accent colors for statuses | rainbow status colors | 2 fluorescent accents | 1 cold family (silver-blue) + 1 rare warm accent (muted gold), everything else is opacity steps of white |
| Glow | none, or drop-shadows | bloom on everything | outer-glow on everything | glow exists only where light *sources* exist: stars, offer, active selection. Max glow radius 24px, max glow opacity 0.25 |
| Motion | instant, 150ms snaps | bouncy springs, particles | flicker, scanlines | 500–1200ms, single easing family, movement reads as celestial mechanics (slow, inertial, no bounce) |
| Typography | Inter 14px everywhere | rounded display fonts | condensed techno fonts | MiSans/PingFang-class humanist sans, small sizes, wide tracking on labels only, tabular numerals |

Concrete rules that enforce the target:

- **Background**: one fixed image-based background for the entire user app. Content never paints its own full-bleed background. Perceived lightness of the darkest 80% of the screen stays under L\* ≈ 8.
- **Saturation ceiling**: no UI color exceeds ~35% saturation except star points themselves. The silver-blue family lives around S 20–30%. This single rule kills both "cyberpunk" and "game."
- **Contrast**: body text ≥ 7:1 against the darkened background (readability is non-negotiable in a job tool); decorative elements may drop to 1.3:1 — the gap between "content" and "atmosphere" contrast is itself the cinematic look.
- **Spacing**: 8px base grid; vertical section rhythm 64/96px on desktop, 40/56px mobile. Generous space *between* groups, tight space *within* rows — this is the MiMo rhythm.
- **List rhythm**: rows are 56px tall, divided by 1px hairlines at 5% white, no zebra striping, no row cards.
- **Glow intensity budget**: at any time, at most 3 glowing elements above 15% glow opacity in the viewport (hovered star, selected star, offer ring). Everything else ≤ 8%.
- **Surface opacity**: interactive surfaces are 2.5–5.5% white over the background. If a surface needs more than 8% to be visible, the design is wrong, not the opacity.
- **Animation speed**: nothing meaningful completes faster than 400ms; ambient motion has periods measured in minutes, not seconds.

The signature element (spend the boldness budget here, keep everything else quiet): **the circular application orbit system**. It is the one screen allowed to be visually dramatic. Jobs list, discussions, and admin stay almost typographic.

---

## 2. Exact color system

All values are CSS-ready. Define once in `styles/tokens.css` (**recommended new file**) as custom properties on `:root`; never hardcode hex in components.

### 2.1 Base background

```css
:root {
  /* base */
  --space-void:   #030509;                 /* deepest black-blue: vignette edges, admin sidebar */
  --space-base:   #060B14;                 /* page base color under the background image */
  --space-raised: #0A1220;                 /* secondary bg: admin content, modals fallback */
  --scrim-read:   rgba(3, 5, 9, 0.55);     /* darkening overlay above imagery, below content */
  --scrim-heavy:  rgba(3, 5, 9, 0.78);     /* behind open detail panels / dialogs */
}
```

`--space-base` is intentionally not pure black: pure `#000` makes the background image edges band visibly and makes glows look sooty. `#060B14` is black with a blue undertone (H≈215, S≈54%, L≈5%).

### 2.2 Cold light family

```css
:root {
  --light-silver:  #9FB4CE;   /* primary cold accent: links, active states, orbit labels */
  --light-muted:   #5E7794;   /* secondary cold: inactive metadata, orbit lines base */
  --light-ice:     #C3D3E6;   /* numerals, emphasized metadata, star cores (small) */
  --star-white:    #EDF2F9;   /* star points, primary headings — never full #FFF */
  --glow-cold:     rgba(159, 180, 206, 0.14);  /* default glow */
  --glow-cold-hi:  rgba(159, 180, 206, 0.25);  /* hover/selected glow ceiling */
}
```

### 2.3 Gold accent — rationed

```css
:root {
  --gold-base:  #C9A96E;                    /* desaturated champagne, NOT #FFD700 */
  --gold-muted: rgba(201, 169, 110, 0.55);  /* offer text, offer orbit label */
  --gold-glow:  rgba(201, 169, 110, 0.20);  /* offer ring glow, offer star halo */
}
```

**Gold is used for exactly three things:**
1. The offer orbit ring + offer-status stars (orbit page, bottle, list status dot).
2. The captured-count numeral on a nebula node when > 0 — the *numeral only*, not its label.
3. A 1px underline accent on the single primary CTA of the capture panel, on hover only.

**Gold is never used for:** buttons at rest, borders, headings, hover states of ordinary items, badges, the logo, dividers, gradients, focus rings, or any element that appears more than ~5 times per screen. If a reviewer can see gold in three places at once outside the offer context, remove one. This rationing is what prevents the "AI black-gold template" look.

### 2.4 Text colors

```css
:root {
  --text-primary:   rgba(237, 242, 249, 0.92);  /* row titles, body */
  --text-secondary: rgba(195, 211, 230, 0.66);  /* descriptions, secondary cells */
  --text-muted:     rgba(159, 180, 206, 0.42);  /* metadata, timestamps, placeholders */
  --text-disabled:  rgba(159, 180, 206, 0.26);
  --text-numeric:   #C3D3E6;                    /* always with font-variant-numeric: tabular-nums */
  --text-meta:      rgba(159, 180, 206, 0.50);  /* 12px labels, letter-spaced */
  --text-danger:    rgba(214, 137, 137, 0.85);  /* rejected — desaturated, never alarm-red */
}
```

### 2.5 Surfaces

No card boxes. Surfaces are barely-there lightness shifts plus, where content sits over imagery, a blur.

```css
:root {
  /* subtle: hover targets, inline chips */
  --surface-subtle-bg:     rgba(255, 255, 255, 0.025);
  --surface-subtle-border: rgba(255, 255, 255, 0.00);   /* deliberately none */

  /* readable: detail panel, filter bar — anything with paragraphs over imagery */
  --surface-read-bg:       rgba(10, 18, 32, 0.58);
  --surface-read-border:   rgba(255, 255, 255, 0.06);   /* 1px, top edge only where possible */
  --surface-read-blur:     blur(14px) saturate(1.1);
  --surface-read-shadow:   0 24px 64px -32px rgba(0, 0, 0, 0.8); /* soft depth, no hard edge */

  /* hover */
  --surface-hover-bg:      rgba(255, 255, 255, 0.045);

  /* selected */
  --surface-selected-bg:   rgba(159, 180, 206, 0.07);
  --surface-selected-edge: inset 2px 0 0 rgba(159, 180, 206, 0.45); /* left light-edge, not a border */

  /* admin — solid, fast, no blur, no imagery */
  --surface-admin-bg:      #0C1322;
  --surface-admin-border:  rgba(255, 255, 255, 0.08);
}
```

Usage rules:
- The **only** full 1px borders in the user app are: the readable-surface top hairline, table header rules in admin, and input fields (`border: 1px solid rgba(255,255,255,0.10)`).
- Selection is shown by the `inset 2px 0 0` left light-edge + background tint, never by an outline box.
- `backdrop-filter` only on the detail panel and sticky filter bar (max 2 blurred layers per page — this is also the mobile performance budget).

---
## 3. Unified background implementation

### 3.1 Why the banding happens now

Banding + rectangular layering appears when (a) multiple sections each paint their own full-width gradient, so their edges meet as visible rectangles; (b) pure-CSS dark gradients quantize into 8-bit steps on large areas; (c) translucent panels stack over *different* local gradients, producing mismatched tints. The fix is architectural, not cosmetic: **exactly one background source in the whole user app, and it is an image, not a CSS gradient.** Photographic assets carry natural grain that dithers away banding for free.

### 3.2 Component structure

```
app layout (user routes)                     ← assumed existing file (unverified): e.g. app/(user)/layout.tsx
└── <SpaceShell>                             ← recommended new: components/layout/SpaceShell.tsx
    ├── <SpaceBackground />                  ← recommended new: components/layout/SpaceBackground.tsx
    ├── <UserNavbar />                       ← recommended new or refactor of existing navbar
    └── <main className="space-content">{children}</main>
```

Hard rules enforced by lint/review:
- No page or section under user routes may set `background`, `background-image`, or full-bleed gradient. Grep-able rule: `background:` in user page files ⇒ review flag.
- Panels use only the surface tokens from §2.5 (translucent over the shared background — they will always match tint because the background is shared).
- Admin routes do **not** mount `SpaceShell`; they mount `AdminShell` with solid `--space-admin` surfaces (§13-equivalent, see §12 ordering).

### 3.3 SpaceBackground layer stack (bottom → top)

```tsx
// components/layout/SpaceBackground.tsx  (recommended new file)
export function SpaceBackground() {
  return (
    <div className="space-bg" aria-hidden="true">
      <div className="space-bg__image" />
      <div className="space-bg__vignette" />
      <div className="space-bg__stars space-bg__stars--far" />
      <div className="space-bg__stars space-bg__stars--near" />
      <div className="space-bg__noise" />
      <div className="space-bg__meteor" />   {/* motion-gated, see below */}
    </div>
  );
}
```

```css
.space-bg {
  position: fixed;
  inset: 0;
  z-index: -1;
  background: var(--space-base);           /* paints instantly before image loads */
  overflow: hidden;
}

.space-bg__image {
  position: absolute; inset: 0;
  background-image: image-set(
    url("/assets/space/bg-desktop.avif") type("image/avif"),
    url("/assets/space/bg-desktop.webp") type("image/webp")
  );
  background-size: cover;
  background-position: center 30%;         /* denser starfield kept above the fold */
}
@media (max-width: 767px) {
  .space-bg__image {
    background-image: image-set(
      url("/assets/space/bg-mobile.avif") type("image/avif"),
      url("/assets/space/bg-mobile.webp") type("image/webp")
    );
  }
}

/* readability scrim: heavier at center-bottom where lists live */
.space-bg__vignette {
  position: absolute; inset: 0;
  background:
    radial-gradient(120% 90% at 50% 0%, transparent 0%, var(--scrim-read) 70%),
    linear-gradient(to bottom, rgba(3,5,9,0.20), rgba(3,5,9,0.55) 60%, rgba(3,5,9,0.62));
}

/* two parallax-free star layers: tiny box-shadow star sheets, tiled */
.space-bg__stars {
  position: absolute; inset: -50px;
  background-repeat: repeat;
}
.space-bg__stars--far  { background-image: url("/assets/space/stars-far.svg");  opacity: .5; }
.space-bg__stars--near { background-image: url("/assets/space/stars-near.svg"); opacity: .8; }

/* 2% film grain kills any residual banding from the vignette gradients */
.space-bg__noise {
  position: absolute; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
  opacity: 0.03;
  mix-blend-mode: overlay;
}

/* one meteor, rare, subtle */
.space-bg__meteor {
  position: absolute; top: 8%; left: -10%;
  width: 140px; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(237,242,249,0.7));
  opacity: 0;
  animation: meteor 70s linear infinite;
  animation-delay: 12s;
}
@keyframes meteor {
  0%, 96%   { opacity: 0; transform: translate(0, 0) rotate(18deg); }
  96.5%     { opacity: .6; }
  99%       { opacity: 0; transform: translate(60vw, 24vw) rotate(18deg); }
  100%      { opacity: 0; }
}

@media (prefers-reduced-motion: reduce), (max-width: 767px) {
  .space-bg__meteor { display: none; }
}
```

Notes:
- The two gradient layers in the vignette are the only CSS gradients in the app; the noise layer above them dithers their steps.
- The star SVG sheets are ~2KB deterministic files (generate once with a seeded script: 120 far dots at r 0.5–0.8px, 40 near dots at r 0.8–1.4px on a 900×900 tile). Twinkle, if desired later, is one CSS `opacity` keyframe on the near layer with an 11s period — optional, and off under reduced motion.
- Mobile performance: fixed background div (no `background-attachment: fixed`, which is broken/slow on iOS), AVIF ≤ 220KB, no blur in the background stack, meteor removed.

---

## 4. image2.0 asset strategy

All assets live in `/public/assets/space/` (**recommended new directory**), optimized to AVIF+WebP for photographs and PNG for anything needing alpha. Shared negative prompt for every asset: *no text, no watermark, no logo, no UI frame, no border, no planet with rings, no earth, no cartoon style, no neon colors, no purple-pink galaxy cliché, no lens flare hexagons, no oversaturation.*

| # | Asset | Path | Ratio | Alpha | Prompt (core) | Usage |
|---|---|---|---|---|---|---|
| 1 | Desktop background | `bg-desktop.avif` (+webp) | 16:9, 2560×1440 | no | "Ultra-dark deep space photograph, near-black blue #060B14 base, very sparse small white stars, one extremely faint cold blue-grey nebula wisp in upper third, 90% of frame is calm darkness, cinematic, photoreal, muted, low contrast, no bright objects in lower half" | §3 image layer. Lower-half emptiness is mandatory — that's where lists render. |
| 2 | Mobile background | `bg-mobile.avif` (+webp) | 9:19.5, 1170×2532 | no | Same as #1 plus "vertical composition, faint nebula wisp only in top 25%, bottom 60% almost pure darkness" | Mobile media query. |
| 3 | Region-galaxy gateway asset | `galaxy-region.png` | 1:1, 1024 | **yes** | "A single soft elliptical galaxy of cold silver-blue tones on fully transparent background, wispy irregular silhouette, no circular vignette, no square edges, dim, photoreal, painterly softness, edges dissolve to transparency" | Gateway page node for "按地区探索". |
| 4 | Industry-galaxy gateway asset | `galaxy-industry.png` | 1:1, 1024 | yes | Same as #3 but "spiral structure viewed at an angle, slightly warmer grey-blue" | Gateway node for "按行业探索". |
| 5 | Captured-galaxy asset | `galaxy-captured.png` | 1:1, 1024 | yes | Same family, "compact dense cluster of faint stars, one subtle warm champagne-gold point of light at center, everything else cold blue" | Gateway node for "我的捕获" — the one sanctioned gold point. |
| 6 | Beijing Nebula | `nebula-beijing.png` | 1:1, 768 | yes | "Small irregular cold nebula, transparent background, vertical elongated structure, silver-blue with faint ice-white core, dim, photoreal, dissolving edges" | Nebula node in region view. Differentiate cities by *silhouette*, not color. |
| 7 | Shanghai Nebula | `nebula-shanghai.png` | 1:1, 768 | yes | Same family, "horizontal sweeping wisp structure" | " |
| 8 | Internet Nebula | `nebula-internet.png` | 1:1, 768 | yes | Same family, "loose open cluster with fine filaments" | Industry view. |
| 9 | Finance Nebula | `nebula-finance.png` | 1:1, 768 | yes | Same family, "dense compact core with faint symmetric halo" | " |
| 10 | Consulting Nebula | `nebula-consulting.png` | 1:1, 768 | yes | Same family, "two small interacting wisps" | " |
| 11 | Bottle front overlay | `bottle-front.png` | 3:4, 900×1200 | **yes** | "Empty glass bottle photographed against pure transparent background, front glass surface only, subtle cold rim light on left edge, faint specular highlight, dark ambient, photoreal product photography, interior fully transparent/empty, no cork, no label, no liquid" | Top layer of BottleStage (§9). Stars render *behind* it. |
| 12 | Bottle back layer | `bottle-back.png` | 3:4, 900×1200 | yes | "Only the back interior wall of the same glass bottle, extremely faint, 15% visible glass hint, transparent background" | Bottom layer; optional — ship #11 first, add #12 only if depth feels missing. |

Practical generation notes:
- Generate all nebula assets (3–10) **in one session with a shared style reference** so they read as a family; then normalize levels in post (same black point, same max brightness ≤ 70% white).
- image2.0 outputs won't have true alpha; matte removal is a required post step (dark background → luminance-to-alpha in an editor, or generate on solid `#00FF00` never — use pure black and extract). Budget 30 min per asset for cleanup.
- Nebula PNGs: quantize to 8-bit + `oxipng`/`squoosh`, target ≤ 90KB each; backgrounds ≤ 220KB AVIF.
- Load nebula assets with `loading="lazy"` and `decoding="async"`; preload only `bg-*.avif` via `<link rel="preload" as="image">` in the user layout.

---
## 5. Galaxy / nebula entrance — killing the "image + text card" look

### 5.1 Why it currently reads as cards

Anything with (a) a rectangular hit area you can *see*, (b) text inside the same visual container as the image, or (c) uniform grid alignment reads as a card gallery. The fix: the nebula **is** the element — an irregular transparent PNG floating on the shared background, with the label *outside* it, connected by a hairline, and nodes placed on an organic (but deterministic) constellation layout rather than a grid.

### 5.2 NebulaNode anatomy

```
            ·  (faint local star dust, optional)
        ╭─ nebula PNG, irregular silhouette ─╮
        │        (280–360px desktop)         │
        ╰────────────────────────────────────╯
                       │  24px hairline, rgba(159,180,206,.25), rotated 30–60°
                       ╰──  北京星云            ← label: 15px, --star-white, weight 500
                            42 个机会 · 3 已捕获 ← meta: 12px tabular, --text-muted;
                                                   the "3" only is --gold-muted
```

Component contract (**recommended new file** `components/galaxy/NebulaNode.tsx`):

```ts
interface NebulaNodeProps {
  id: string;              // "beijing" | "internet" | ...
  asset: string;           // /assets/space/nebula-beijing.png
  label: string;           // 北京星云
  jobCount: number;
  capturedCount: number;
  anchor: { x: number; y: number };  // % coordinates in the constellation stage
  labelSide: 'right' | 'left' | 'below';  // precomputed to avoid overlap
  onEnter: (id: string) => void;
}
```

### 5.3 Placement — constellation, not grid

Nodes are placed on a hand-tuned (not runtime-random) anchor map per view, stored in config:

```ts
// lib/galaxy-config.ts (recommended new file)
export const REGION_ANCHORS: Record<string, {x:number; y:number; scale:number; labelSide:LabelSide}> = {
  beijing:  { x: 24, y: 30, scale: 1.00, labelSide: 'right' },
  shanghai: { x: 62, y: 22, scale: 0.92, labelSide: 'right' },
  shenzhen: { x: 44, y: 58, scale: 0.96, labelSide: 'below' },
  hangzhou: { x: 76, y: 52, scale: 0.84, labelSide: 'left'  },
  chengdu:  { x: 18, y: 68, scale: 0.80, labelSide: 'right' },
  other:    { x: 82, y: 78, scale: 0.70, labelSide: 'left'  },
};
```

Rules: minimum center distance 28% of stage width; scale encodes job count bucket (log scale, 0.7–1.0 — a nebula with 3× the jobs is *slightly* larger, never dominant); label sides are chosen in config so no two labels can collide at any breakpoint. Hand-tuned anchors are the right call for ≤ 8 nodes per view — an algorithm here buys nothing and risks ugliness.

### 5.4 States

| State | Treatment |
|---|---|
| Default | PNG at `opacity: .85; filter: brightness(.95)`; label `--text-secondary`; meta `--text-muted`. Ambient: 90s `scale 1 → 1.015 → 1` breathe (off under reduced motion). |
| Hover / focus-visible | 600ms `cubic-bezier(0.22,1,0.36,1)`: `opacity: 1; filter: brightness(1.12)`; a radial glow pseudo-element fades to `--glow-cold` (max 24px spread); label → `--star-white`; hairline extends 24→34px. **No scale jump, no border, no background.** Keyboard focus adds a 1px dotted `--light-muted` outline offset 12px (accessibility, but styled as an observation reticle, radius 50%). |
| Pressed / entering | 800ms: node scales 1→2.2 while opacity 1→0 and `filter: blur(0→6px)`; simultaneously the destination nebula-detail view fades in from 96% scale. Reads as "flying into" the nebula. With Motion (Framer), a `layoutId` per nebula gives a true shared-element transition; the scale+blur crossfade is the no-dependency fallback. |

### 5.5 Flow and responsive behavior

`/galaxy` (gateway: 3 large nodes — 按地区 / 按行业 / 我的捕获) → `/galaxy/region` or `/galaxy/industry` (5–8 nebula nodes) → `/galaxy/region/beijing` (observation window, §6). Breadcrumb: a single muted line top-left, `银河 / 地区 / 北京星云`, 12px letter-spaced — the only persistent chrome on these pages.

Mobile: constellation collapses to a vertical flow — each node 200px, anchored alternately left/right of center at ±12%, labels always below. Same components, one media query on the stage.

---

## 6. Job star observation window

### 6.1 Three-level state machine — never render 167 stars

```ts
type ObservationState =
  | { level: 'gateway' }                                   // region vs industry vs captured
  | { level: 'galaxy';  mode: 'region' | 'industry' }      // nebula nodes
  | { level: 'nebula';  mode: 'region' | 'industry'; nebulaId: string;
      focusedJobId?: string; expandedOverflow?: boolean };
```

Transitions: `enterGalaxy(mode)` / `enterNebula(id)` / `focusJob(id)` / `back()` (nebula→galaxy→gateway, ESC or breadcrumb click, 500ms reverse of the entering transition). State lives in the URL (route params + `?job=` search param) so refresh and share links are stable — never in component state alone.

The observation window itself is a fixed-height stage (desktop: 52vh min 420px; mobile: 320px) sitting **above** the readable list on the same page. It is not a modal.

### 6.2 Deterministic starfield layout

Design decisions: staggered hex grid (guarantees equal spacing → no overlap ever), stable hash used **only** for ±jitter within a cell and for angle assignment, hard cap on rendered stars with explicit aggregation.

```ts
// lib/star-layout.ts  (recommended new file)

/** FNV-1a — stable across sessions, no dependency */
export function stableHash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** 1–2 CJK chars for inside the star; collisions get a disambiguating 2nd char */
export function getShortLabel(companyName: string, taken: Set<string>): string {
  const clean = companyName.replace(/(有限|责任|公司|集团|科技|股份)/g, '');
  let label = clean.slice(0, 1);
  if (taken.has(label)) label = clean.slice(0, 2);
  let i = 2;
  while (taken.has(label) && i < clean.length) label = clean[0] + clean[i++];
  taken.add(label);
  return label;
}

export function groupJobsByNebula(jobs: Job[], mode: 'region' | 'industry') {
  const key = mode === 'region' ? classifyRegion : classifyIndustry; // lib/galaxy-classifier.ts
  const groups = new Map<string, Job[]>();
  for (const job of jobs) {
    const k = key(job);
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(job);
  }
  // deterministic order inside each group: priority, then id — NOT insertion order
  for (const list of groups.values()) {
    list.sort((a, b) =>
      Number(b.isCaptured) - Number(a.isCaptured) ||
      deadlineScore(a) - deadlineScore(b) ||
      a.id.localeCompare(b.id));
  }
  return groups;
}

const MAX_VISIBLE = 36;           // 6 rows × ~6–7 cols fits a 52vh stage without crowding
const CELL_W = 84, CELL_H = 76;   // px; sized for a 40px star + label clearance
const JITTER = 9;                 // px, < (CELL - star)/2 so overlap is impossible

export function buildNebulaStarLayout(jobs: Job[], stageW: number): StarPlacement[] {
  const { visible, overflow } = aggregateOverflowStars(jobs, MAX_VISIBLE);
  const cols = Math.max(4, Math.floor(stageW / CELL_W));
  const taken = new Set<string>();

  const placed = visible.map((job, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const h = stableHash(job.id);
    return {
      jobId: job.id,
      shortLabel: getShortLabel(job.companyName, taken),
      x: col * CELL_W + (row % 2 ? CELL_W / 2 : 0)        // hex stagger
         + ((h % 1000) / 1000 - 0.5) * 2 * JITTER,
      y: row * CELL_H
         + (((h >> 10) % 1000) / 1000 - 0.5) * 2 * JITTER,
      sizeTier: job.isCaptured ? 'captured' : job.isHot ? 'bright' : 'normal',
    };
  });

  if (overflow.length) placed.push(makeOverflowStar(overflow, placed));
  return centerInStage(placed, stageW);   // translate the whole field to center it
}

export function aggregateOverflowStars(jobs: Job[], max: number) {
  if (jobs.length <= max) return { visible: jobs, overflow: [] as Job[] };
  return { visible: jobs.slice(0, max - 1), overflow: jobs.slice(max - 1) };
  // jobs is already priority-sorted; captured + urgent are always visible
}
```

The overflow star renders as a slightly larger dim cluster labeled `+128`; clicking it either paginates the stage (swap in next 35) or simply scrolls to the list — recommend the latter for v1 (zero new UI). Because layout depends only on sorted job ids + stage width bucket (quantize `stageW` to 80px steps to avoid resize churn), **refreshing never moves a star**.

### 6.3 Star anatomy

40px circle: radial fill `rgba(195,211,230,0.16) → transparent`, 1.5px core dot `--star-white`, label centered 13px `--text-primary`. Captured: 4px gold-muted outer ring at 40% opacity. Hot/urgent: core dot `--light-ice` with 8px `--glow-cold`. Hover: glow to `--glow-cold-hi`, label to `--star-white`, and a floating tooltip (readable surface, §2.5) with full company + role name — this is where the full name lives; it never renders in the field itself.

---

## 7. Starfield ↔ readable list coexistence

Page anatomy for `/jobs` and nebula routes: observation stage (top) → sticky filter bar (readable surface, blur) → DataList (§10) → detail panel (right slide-over on desktop ≥1280px, bottom sheet on mobile).

Single source of truth (**recommended new file** `lib/observation-store.ts`, Zustand or context):

```ts
interface ObservationSync {
  hoveredJobId: string | null;   // set by star OR row; both subscribe
  selectedJobId: string | null;  // opens detail panel
  filters: JobFilters;           // region, industry, batch, search — drives BOTH layers
  nebulaId: string | null;       // acts as an implicit filter on the list
}
```

Interaction contract:
- **Hover star → list row** gains `--surface-hover-bg` + left light-edge at 25%. **Hover row → star** gains hover glow. Both direction handlers debounce 40ms to avoid flicker.
- **Click star** → `selectedJobId`, detail panel slides in (360ms), and `listRef.scrollToItem(jobId, 'smart')` brings the row into view with the selected treatment.
- **Click row** → same selection; the stage pans/centers the star (transform on the field container, 500ms) and pulses its glow once.
- **Filters** recompute both the list and `buildNebulaStarLayout` input; because layout is deterministic, filtering visibly "condenses" the field rather than reshuffling it.
- **Nebula selection** is shown in the filter bar as a removable token `北京星云 ×`; clearing it returns to the all-jobs field (aggregated by nebula at level 2, per §6.1).
- The list is always complete (virtualized) even when the field aggregates — the field is a lens, the list is the truth. This single sentence is the design's answer to "must not become hard to use."

List row spec is in §10.

---
## 8. Circular application orbit system

The signature screen. `/my-applications` renders an SVG orbit stage (desktop: 720px square, centered; ≥1440px: 800px) with the readable application DataList below it.

### 8.1 Geometry

```ts
// lib/application-orbit.ts  (recommended new file)
export const ORBITS = [
  { status: 'opened',       r: 340, label: '已打开官网',   period: 240 },
  { status: 'applied',      r: 296, label: '已投递',      period: 210 },
  { status: 'written_test', r: 252, label: '笔试',        period: 185 },
  { status: 'first_round',  r: 206, label: '一面',        period: 160 },
  { status: 'second_round', r: 162, label: '二面',        period: 140 },
  { status: 'final_round',  r: 118, label: '终面',        period: 120 },
  { status: 'offer',        r:  64, label: 'Offer',       period: 100 },
] as const;   // viewBox 800×800, center 400,400
```

Radii shrink slightly non-uniformly (44→42→…) so inner orbits feel compressed — progress visibly *accelerates* toward the center. Periods shorten inward: inner orbits rotate faster, like real orbital mechanics; the whole system reads as physics, not decoration.

### 8.2 Rendering rules

- **Orbit lines**: `stroke: var(--light-muted); stroke-opacity: .14; stroke-width: 1`; empty orbits drop to `.07`. Offer ring: `stroke: var(--gold-muted); stroke-opacity: .30` plus one blurred duplicate ring (`stroke-width: 5; opacity: .12; filter: blur(3px)`) as its glow. Center: a 6px `--star-white` core with 20px `--glow-cold` halo — the "goal star," no icon, no logo.
- **Orbit labels**: 11px, `letter-spacing: .12em`, `--text-meta`, positioned at 135° (upper-left) on each ring via `<textPath>` or absolute placement; labels do **not** rotate with the orbit.
- **Star placement**: `angle = stableHash(applicationId) % 360`, then one spacing pass per orbit enforcing ≥ `18°` separation (sort by angle, push conflicts clockwise). Star = 8px dot `--light-ice` + company short-label 12px placed radially outward, counter-rotated to stay upright.
- **Rotation**: each orbit's star-group is a `<g>` with `animation: spin var(--period) linear infinite`. Counter-rotation for labels: an inner `<g>` with the same animation reversed. Pausing on hover of the stage (`animation-play-state: paused`) makes stars clickable without chase.
- **Aggregation**: > 12 stars on one orbit → chunk into arc-cluster nodes of ≤ 8 (`网易 +5`), expanding into a temporary fan on click. The list below always shows all.
- **Hover**: star scales 1.4, glow to `--glow-cold-hi`, tooltip (readable surface) with company / role / status / days-in-status; corresponding list row highlights (same sync store pattern as §7).
- **Click**: opens the application detail panel (status history, links, notes, status-change actions).

### 8.3 Status migration animation

On status update (e.g. applied → written_test): animate the star along an inward spiral — interpolate radius `r₁→r₂` and add +40° of angle over **1200ms**, `cubic-bezier(0.22, 1, 0.36, 1)`, with a brief trail (a 1px stroke path fading over 800ms). Implemented as a Motion `animate()` on `cx/cy` computed from polar coords, or a CSS custom-property transition with `@property` registered `--r`/`--a`. Backward moves (corrections) use the same spiral outward — same dignity, no sad styling.

**Rejected / withdrawn**: the star drifts radially outward past the outer ring over 900ms, fading to 25% opacity, and settles into a sparse dim "outer field" band (radius 380–396) — visible history, not deletion. A `已结束 (12)` toggle under the stage shows/hides them; they always remain in the list with `--text-danger` / `--text-muted` status text.

### 8.4 Reduced motion & mobile

- `prefers-reduced-motion`: no rotation, no spiral — status changes crossfade the star between positions (200ms opacity). All information remains.
- Mobile (< 768px): stage shrinks to 92vw square, labels hidden until tap, rotation period ×2 (slower = calmer on small screens), aggregation threshold drops to 8. Below 360px, the stage collapses to a compact static "ring summary" (7 concentric arcs with counts) and the list is primary. The list is always the accessible fallback; the orbit is `aria-hidden` with an offscreen text summary.

---

## 9. Bottle and star stacking

### 9.1 Layering — PNG overlay, three layers

Use the image2.0 **PNG** overlay (asset #11) rather than SVG: photoreal glass with rim light is exactly what image models do well and hand-drawn SVG does poorly; the bottle is a static prop, so PNG costs nothing in flexibility.

```
BottleStage (recommended new: components/bottle/BottleStage.tsx)
  z1  bottle-back.png      opacity .5   (optional, asset #12)
  z2  <div class="bottle-stars">        absolutely positioned star dots
  z3  bottle-front.png                  glass, rim light — stars show through its transparency
  z4  caption: 「已收集 23 颗星」        12px meta, tabular numeral
```

The star layer is clipped by a `clip-path: path(...)` matching the bottle's interior silhouette (trace it once from the PNG; store as a constant) so stars can never escape the glass.

### 9.2 Deterministic pseudo-physical stacking — precomputed slots, no physics engine

```ts
// lib/bottle-stacking.ts  (recommended new file)
// Precompute once: fill the interior polygon bottom-up with staggered rows.
export function buildBottleSlots(interior: Polygon, starR = 7): Slot[] {
  const slots: Slot[] = [];
  const rowH = starR * 1.74;                       // hex packing height
  for (let y = interior.bottom - starR; y > interior.top; y -= rowH) {
    const [xMin, xMax] = interior.widthAt(y);      // silhouette narrows at shoulders/neck
    const offset = slots.length % 2 ? starR : 0;   // stagger alternate rows
    for (let x = xMin + starR + offset; x <= xMax - starR; x += starR * 2.05) {
      slots.push({ x, y });
    }
  }
  return slots;                                    // bottom-left → top-right order
}

// Assignment: capture order maps to slot order + tiny per-star jitter from stableHash.
// Refresh-stable because slot index = index in captures sorted by captured_at, id.
export function assignStar(captureIndex: number, appId: string, slots: Slot[]) {
  const s = slots[Math.min(captureIndex, slots.length - 1)];
  const h = stableHash(appId);
  return {
    x: s.x + ((h % 100) / 100 - 0.5) * 3,          // ±1.5px — organic, never colliding
    y: s.y + (((h >> 7) % 100) / 100 - 0.5) * 2,
    rotation: (h % 40) - 20,                        // if stars ever get a shape
  };
}
```

The result *looks* physically settled (bottom-up, staggered, slightly irregular) with zero simulation, zero randomness across refreshes, and O(n) render.

### 9.3 New-star animation

On capture (or when arriving at `/my-bottle` with a pending new star): the star fades in at the bottle neck, then falls to its assigned slot over **1100ms** with `cubic-bezier(0.34, 1.12, 0.64, 1)` — one gentle overshoot of ~4px, no bounce chain, no neighbor displacement (slots are fixed; nothing scatters). A 300ms `--glow-cold` pulse on landing. Reduced motion: fade in at the slot, 200ms.

Status connection: bottle stars tint by current status — normal `--light-ice`; offer `--gold-base` at 9px with a permanent faint `--gold-glow`; rejected/withdrawn dim to 30% opacity but stay in the bottle (collected history — the bottle records effort, not just wins; this is emotionally the right call for autumn recruitment).

---

## 10. Typography and data-list system (MiMo-style restraint, deep-space identity)

### 10.1 Font stack & scale

```css
:root {
  --font-sans: "MiSans VF", "MiSans", "HarmonyOS Sans SC", "PingFang SC",
               "Noto Sans SC", -apple-system, "Segoe UI", sans-serif;
  /* MiSans is freely licensed for commercial use; self-host the VF woff2 (~2 weights-worth). */
}
```

| Role | Size/line | Weight | Tracking | Color |
|---|---|---|---|---|
| H1 (page) | 26/36 | 500 | .01em | --star-white |
| H2 | 20/30 | 500 | .01em | --text-primary |
| Section label (eyebrow) | 12/16 | 500 | **.18em** | --text-meta |
| Row title | 15/22 | 500 | 0 | --text-primary |
| Body / description | 14/24 (CJK line-height 1.7) | 400 | 0 | --text-secondary |
| Metadata | 12/18 | 400 | .04em | --text-muted |
| Numerals | inherit | 400 | 0 | --text-numeric + `font-variant-numeric: tabular-nums` |

CJK rules: never letter-space body CJK text (tracking is for short Latin-ish labels and eyebrows only); mixed CJK/Latin gets hair-spacing via `text-autospace`/manual thin spaces in labels; line-height 1.7 for paragraphs, 1.4 for titles. The MiMo feel comes from: small sizes, only two weights (400/500 — **no bold 700 anywhere**), wide-tracked tiny eyebrows, and tabular numerals everywhere a number appears.

### 10.2 List components (recommended new files under `components/data/`)

**DataList / DataListRow** — the shared list for jobs, applications, discussions:

```css
.data-row {
  display: grid;
  grid-template-columns: 40px 1fr auto;   /* index · content · actions/status */
  align-items: center;
  min-height: 56px;
  padding: 0 16px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  transition: background .18s ease;
}
.data-row:hover    { background: var(--surface-hover-bg); }
.data-row.selected { background: var(--surface-selected-bg); box-shadow: var(--surface-selected-edge); }
```

- **IndexNumber**: 12px, `--text-disabled`, tabular, right-aligned, `01 02 …` — quiet structure, MiMo's most recognizable move; justified here because lists genuinely are ordered (by deadline/heat).
- **Row content**: title 15px; below it one metadata line: `字节跳动 · 后端开发 · 北京 · 秋招一批` with `·` separators at `--text-disabled`.
- **SubtleActionLink**: 13px `--light-silver`, no underline at rest, `text-underline-offset: 4px` underline on hover, never a button unless it mutates data. Primary mutation ("捕获" / "打开官网") is a 32px-high ghost button: `border: 1px solid rgba(159,180,206,.25); background: transparent;` hover fills `--surface-hover-bg`.
- **StatusText/StatusDot**: 6px dot + 12px text. Dot colors: opened `--light-muted` · applied `--light-silver` · tests/interviews `--light-ice` (differentiated by text, not by rainbow) · offer `--gold-base` · rejected `--text-danger` at 60%. This near-monochrome status scale is a deliberate anti-dashboard move.
- **Dividers between sections**: 24px gap + 12px eyebrow, no `<hr>` weight.
- Discussion list reuses DataListRow with avatar-less rows (author as metadata); admin tables use a separate plain table style on `--surface-admin-bg` with visible header rule — admin is allowed to look like a table, that's its job.

---

## 11. Motion language

One easing family, three duration tiers, ambient periods in minutes.

```css
:root {
  --ease-out-cine: cubic-bezier(0.22, 1, 0.36, 1);   /* everything decelerating */
  --ease-in-out:   cubic-bezier(0.65, 0, 0.35, 1);   /* crossfades, page transitions */
  --dur-ui: 180ms;        /* hovers on list rows, link underlines */
  --dur-move: 500ms;      /* panel slide, star focus pan, hover glow bloom */
  --dur-scene: 900ms;     /* capture flight, nebula enter, spiral migration (–1200ms) */
}
```

| Moment | Spec |
|---|---|
| Nebula hover | 600ms glow+brightness (§5.4); no transform except the 90s ambient breathe |
| Nebula enter | 800ms scale 1→2.2 + blur 6px + fade, destination fades from scale .96 |
| Capture flight | 900ms along a quadratic Bézier (`offset-path: path(...)`) from star position to the navbar bottle icon; star scales 1→0.5, one 300ms subtle glow on the icon, +1 numeral ticks. **No particles, no confetti, no gold burst, no screen shake.** |
| Orbit rotation | linear infinite, 100–240s (§8.1); paused on stage hover |
| Status migration | 1200ms inward spiral (§8.3) |
| Bottle fall | 1100ms, single 4px overshoot (§9.3) |
| Page transition | 400ms opacity + 8px translateY rise, `--ease-in-out`; no slide carousels |
| Reduced motion | global: kill rotation, breathe, meteor, flights, spirals; replace every scene animation with ≤ 200ms opacity crossfade; `@media (prefers-reduced-motion: reduce)` in tokens.css + a `useReducedMotion` gate for JS-driven animation |

Properties allowed to animate: `opacity`, `transform`, `filter` (blur/brightness ≤ 6px/1.15). Never animate layout properties, `box-shadow` spread, or color on large surfaces.

---

## 12. Implementation order (hand this section to the coding agent)

> All file paths below are **recommended new files** unless marked *(assumed existing — verify against repo before editing)*. Global engineering constraints for every phase: do not touch Supabase auth, jobs fetching, `user_applications` writes, or admin authorization logic except where a phase explicitly coordinates with them; no Canvas/Three.js — CSS/SVG/DOM/Motion only; every layout deterministic across refreshes; mobile usable at 360px; reduced-motion supported from Phase 1.

**Phase 1 — Unified background + tokens** *(prerequisite for everything)*
Goal: one background, zero banding, token system live.
Files: `styles/tokens.css`, `components/layout/SpaceBackground.tsx`, `components/layout/SpaceShell.tsx`; user layout *(assumed existing — verify)* mounts SpaceShell; **delete** every page/section-level gradient found in user routes; add `/public/assets/space/` with bg-desktop, bg-mobile, stars-far.svg, stars-near.svg, noise (inline).
Acceptance: scrolling any user page shows zero horizontal color seams; DevTools shows exactly one element painting a background image; Lighthouse mobile perf ≥ 85; reduced-motion hides meteor.
Risks: hidden section backgrounds in legacy CSS (grep `background`); image weight (enforce ≤ 220KB AVIF).

**Phase 2 — Typography + DataList refactor**
Goal: /jobs, /my-applications, /discussions lists on the §10 system; MiSans self-hosted.
Files: `components/data/DataList.tsx`, `DataListRow.tsx`, `StatusDot.tsx`, `SubtleActionLink.tsx`; refactor existing list pages *(assumed existing — verify names)*.
Acceptance: no `font-weight: 700` in user routes; all numerals tabular; row height 56px; no card borders around rows; list virtualized if > 100 rows.
Risks: regression in existing filter logic — refactor markup only, do not touch data hooks.

**Phase 3 — Galaxy gateway + nebula routes**
Goal: `/galaxy`, `/galaxy/region`, `/galaxy/industry`, `/galaxy/region/[region]`, `/galaxy/industry/[industry]` with NebulaNode assets.
Files: `components/galaxy/GalaxyGateway.tsx`, `NebulaNode.tsx`, `ConstellationStage.tsx`, `lib/galaxy-config.ts`, `lib/galaxy-classifier.ts`; assets #3–#10.
Acceptance: no visible rectangle around any nebula at any breakpoint; labels never collide 360px–2560px; keyboard navigable; enter transition ≤ 800ms.
Risks: image2.0 alpha cleanup quality; classifier needs a defined `other` bucket for unmapped regions/industries.

**Phase 4 — Deterministic starfield**
Goal: observation window on nebula routes + `/jobs`.
Files: `lib/star-layout.ts`, `components/opportunity/OpportunityStarfield.tsx`, `OpportunityStar.tsx`.
Acceptance: two refreshes produce pixel-identical layouts; zero label overlap with 500 mock jobs; ≤ 36 stars rendered; 60fps hover on mid-tier mobile.
Risks: stage-width quantization forgotten → layout churn on resize.

**Phase 5 — List ↔ star synchronization + detail panel**
Files: `lib/observation-store.ts`, `components/opportunity/OpportunityDetailPanel.tsx`; wire DataListRow hover/click.
Acceptance: all six sync behaviors in §7 work; hover sync adds no dropped frames (test with CPU 4× throttle).
Risks: hover feedback loops — one store, both layers read-only subscribers.

**Phase 6 — Capture interaction**
Goal: capture flow with Supabase-first write.
Files: `components/capture/CaptureAnimation.tsx`; wire into star tooltip + list ghost button.
Sequence: click → button locks → `insert user_applications` (rely on/verify a unique `(user_id, job_id)` constraint — *verify in Supabase schema*) → on success run flight animation + navbar counter tick + status `opened`; on failure release button + inline error, star does not move; duplicate → button renders `已捕获` disabled from initial data.
Acceptance: write precedes animation; double-click cannot double-insert; offline shows error without visual state change.
Risks: if the unique constraint doesn't exist, add it via migration **before** shipping this phase.

**Phase 7 — Circular orbit system**
Files: `lib/application-orbit.ts`, `components/applications/ApplicationOrbitSystem.tsx`, `ApplicationOrbitStar.tsx`; `/my-applications` renders orbit above the existing list.
Acceptance: §8 geometry/labels/aggregation/rejected-band all present; status update animates the spiral; reduced-motion crossfade; 360px fallback ring-summary; list remains the complete record.
Risks: SVG text counter-rotation math; cap DOM nodes via aggregation before testing with heavy accounts.

**Phase 8 — Bottle + polish**
Files: `lib/bottle-stacking.ts`, `components/bottle/BottleStage.tsx`; assets #11 (+#12 optional); final responsive + performance pass (blur-layer budget, preload audit, `content-visibility: auto` on long lists).
Acceptance: refresh-stable stacking; new-star fall per §9.3; offer stars gold; Lighthouse mobile ≥ 85 on /jobs, /my-applications, /my-bottle.
Risks: interior clip-path tracing accuracy; bottle PNG weight.

---

### Paste-ready kickoff prompt for the coding agent

> Implement Phase 1 of the Job Bottle visual redesign. (1) Create `styles/tokens.css` with the exact custom properties from §2 of the attached spec and import it globally. (2) Create `components/layout/SpaceBackground.tsx` and `components/layout/SpaceShell.tsx` per §3.3 — fixed, z-index −1, layers: base color, media-queried background image (`/public/assets/space/bg-desktop.avif`, `bg-mobile.avif` — use temporary near-black placeholders if assets aren't generated yet), vignette, two tiled star SVG layers, 3%-opacity SVG-noise overlay, one meteor element gated behind `prefers-reduced-motion` and min-width 768px. (3) Mount SpaceShell in the user-facing layout only — locate the actual layout file first and report its path; do NOT wrap admin routes. (4) Search all user-route pages/components for `background`, `background-image`, and gradient declarations; remove full-bleed ones and replace panel styles with the surface tokens; list every file you changed. (5) Do not modify any Supabase, auth, data-fetching, or admin-authorization code. Acceptance: one background-painting element in DevTools, no visible color seams on any user page, meteor absent under reduced motion, Lighthouse mobile performance ≥ 85. Report anything in the codebase that conflicts with this plan instead of guessing.

---

*End of specification.*
