# 拾星 — Metaphor-Driven Function Redesign
## Reinterpreting existing functions as information-carrying deep-space systems

> Scope note: no Hermes report is available in this conversation. Every file path is labeled **recommended new file** or **assumed existing (verify)**. Where a design needs a data field that may not exist (e.g. status-change timestamps), the doc says exactly what to check and what the fallback is. No feature below is decorative-only; each visual channel is listed with the product data it encodes.

---

## 1. Design principle: the metaphor is the information layer

The rule for every module: **a visual property may exist only if removing it would delete information.** Test for every proposal — cover the labels; can you still answer a real user question from the visuals alone?

| User question | Module | Visual answer |
|---|---|---|
| 哪些岗位快截止了？ | Jobs | Star lifecycle: dimming/flicker (§2) |
| 哪些岗位是新出的？ | Jobs | Detection ring (§2) |
| 我的哪些申请在推进，哪些停滞了？ | Applications | Doppler shift (§3) |
| 我这季度投了多少、走到哪了？ | Bottle | Archive strata + brightness (§4) |
| 哪些帖子值得看？ | Forum | Signal strength ticks + freshness dot (§5) |
| 有公司回复我吗？ | Notifications | Reception log + pulse (§6) |
| 这周我做得怎么样？ | Weekly | Observation log (§7) |
| 我这一季的历程是什么样的？ | Season end | Personal constellation (§8) |

Encoding budget (prevents the drift into game UI): each element gets at most **three** visual channels — one for identity (label), one for state (brightness/opacity), one for change (a single pulse or tint). Never color-code more than 2 hues per screen beyond the base monochrome + gold discipline already defined in the main visual spec.

---

## 2. Job browsing as star discovery

### 2.1 What each star encodes

A job star carries exactly these channels (everything else lives in hover tooltip and the list):

| Channel | Data | Rendering |
|---|---|---|
| Label | company short name | 1–2 CJK chars (existing `getShortLabel`) |
| **Lifecycle = deadline urgency** | `deadline - today` | see tier table below |
| Captured | user already applied | 4px muted-gold outer ring, static |
| **Detection = recency** | `posted_at` within 72h | one 1.8s expanding faint ring on first mount per session + `新` metadata tag in list |

Lifecycle tiers (derived at render time from `deadline` — **no new data model**):

| Tier | Condition | Star | List status text |
|---|---|---|---|
| steady | > 14d or no deadline | core `--star-white`, glow 8% | — |
| waning | 7–14d | brightness ×0.85, glow 5% | `剩 N 天` in `--text-muted` |
| flicker | 2–7d | 6s subtle opacity oscillation 0.75↔1.0 (CSS keyframe; off under reduced motion, replaced by a small `‼`-free text cue) | `剩 N 天` in `--text-secondary` |
| ember | < 48h | brightness ×0.6, core shifts to `--light-muted`, no glow | `即将截止` in `--text-danger` at 70% |
| collapsed | expired | 3px dark残骸 dot, drops out of the grid into a thin bottom band `已坍缩 (N)`, collapsed by default | row moves to list bottom, 40% opacity |

Why this beats a red badge: urgency becomes **ambient and comparative** — one glance at the field shows the "temperature" of an entire nebula (a mostly-ember Finance Nebula tells you a batch is closing) without a single alarm color. The anxiety-reduction is deliberate: dimming reads as "fading opportunity," not "EMERGENCY."

### 2.2 Filtering = observation parameters (观测参数)

The filter bar is restyled as an instrument panel — same controls, new framing:
- Eyebrow label `观测参数` (12px, .18em tracking, `--text-meta`) above the filter row.
- Filters are text toggles, not chips-with-borders: active = `--light-silver` + 2px underline at 40% opacity; inactive = `--text-muted`. Region/industry selection = "对准星云" — selecting one pans/condenses the starfield (existing deterministic relayout, §6 of main spec).
- Applied-filter summary reads as an instrument readout: `视场：北京 · 互联网 · 秋招一批 — 42 颗星` in tabular numerals.

### 2.3 Search = telescope focus (对焦)

Typing in search does **not** instantly remove stars. Non-matching stars defocus: `filter: blur(1.5px); opacity: .25` over 300ms; matches stay sharp and gain 4% brightness. Clearing search refocuses everything (300ms). The list, meanwhile, filters normally and instantly — **the field defocuses, the list filters.** This is the clearest expression of the product rule: the field is a lens, the list is the truth. (Reduced motion / mobile: field hides non-matches with a plain 150ms fade, no blur.)

### 2.4 Overlap & readability

Unchanged from the main spec: staggered hex grid, 36-star cap with `+N` aggregation, full names only in tooltip/detail, list always complete and virtualized. Lifecycle tiers add zero layout cost — they modulate opacity/filter on existing nodes.

---

## 3. Application tracking as orbital migration + Doppler shift

The orbit geometry, rotation, aggregation, spiral migration, and rejected outer-field are already specified (main spec §8). This section adds the **momentum layer**.

### 3.1 Doppler mapping

| Momentum | Condition | Star tint | Meaning |
|---|---|---|---|
| Blueshift（推进中） | status changed ≤ 7 days ago | core `#AFC9E8` (a 6% cooler shift off `--light-ice`), glow 12% | approaching — actively moving |
| Neutral | 8–14 days | `--light-ice`, glow 8% | normal cadence |
| Redshift（停滞） | ≥ 15 days in same status, not terminal | core `#C4B2A3` (desaturated warm grey, S≈18% — deliberately far from `--gold-base` so it can never be confused with Offer), brightness ×0.8 | receding — needs attention |

Hard rules: tints apply to the 8px core dot only, never to labels or orbit lines; redshift never applies to `offer` or the outer dark field; saturation ceiling 20% keeps this out of "status rainbow" territory.

### 3.2 The redshift affordance (the PM reason this exists)

Hovering a redshifted star adds one line to the tooltip: `已停留 23 天 · 跟进一下？` where 跟进一下 is a SubtleActionLink opening the detail panel scrolled to notes/contact. This converts a passive visualization into the single most valuable behavior in application tracking — timely follow-up — without a notification, a badge, or a nag.

### 3.3 Data requirement (the one thing to verify)

Doppler needs `last_status_change_at` per application.
- **Check first (assumed existing — verify):** a status-history table or an `updated_at` column on `user_applications`.
- Fallback A: use `updated_at` if status changes are the dominant write (acceptable v1 approximation).
- Fallback B (clean, small migration): add `status_changed_at timestamptz` set by the existing status-update path. Do not build a history table just for this — that's §8's requirement, not §3's.

```ts
// lib/application-orbit.ts — addition (recommended)
export function momentumTier(a: Application, now: Date): 'blue' | 'neutral' | 'red' {
  if (TERMINAL.has(a.status)) return 'neutral';
  const days = daysBetween(a.statusChangedAt ?? a.updatedAt, now);
  return days <= 7 ? 'blue' : days < 15 ? 'neutral' : 'red';
}
```

---

## 4. My Bottle as captured star archive

Reframe: the bottle is not a trophy jar; it is the **season's archive** — the record of effort. Everything already specified (PNG glass layers, deterministic slot stacking, single gentle fall animation — main spec §9) stands; this section defines what the archive *encodes*:

- **Accumulation = chronology.** Slots fill in capture order bottom-up, so the bottle literally stratifies your season: early-September captures settle at the bottom, late-October ones sit on top. Hovering any star shows `捕获于 9月14日 · 字节跳动 · 一面` — the bottle becomes browsable memory, not decoration.
- **Brightness = current status.** In-progress `--light-ice`; interview stages +1px size; **Offer = `--gold-base`, 9px, permanent faint gold glow** — a season with two offers reads as two warm points in a cold field, exactly the restraint the identity demands.
- **Dim ≠ deleted.** Rejected/withdrawn stars stay at 30% opacity in place. The strata stay honest: a bottle of 40 stars with 3 gold and many dim ones is a *true* record of an autumn recruitment, and that truthfulness is the emotional value. A small footer readout: `本季已收集 40 颗 · 前进中 12 · Offer 2`（tabular, muted; no percentages, no "success rate" — that framing is rejected in §9）.
- **No chaotic drop.** New stars use the single 1100ms fall-and-settle; existing stars never displace (fixed slot map). If the bottle fills (slots exhausted), the caption becomes `瓶已满 — 本季 N 颗` and further stars land on the top layer with slight overlap allowed above the shoulder line — a full bottle is a milestone, render it with dignity rather than shrinking stars.

---

## 5. Discussions as signal network (信号网络)

The forum does **not** become a starfield. It becomes an **observatory receiver panel**: a restrained signal log where every typographic element encodes transmission data. This is the module where MiMo-style list discipline and the space metaphor fuse most completely.

### 5.1 Vocabulary mapping

| Forum concept | Signal concept | UI term |
|---|---|---|
| Post | signal packet | 信号 |
| Category | channel | 频道：讨论 / 经验 / 求助 / 分享 |
| Comment | echo | 回声 |
| Like | resonance | 共鸣 |
| Pinned | beacon | 信标 |
| Hot thread | strong source | (encoded, not labeled) |
| Old inactive | fading signal | (encoded via opacity) |
| New post | new transmission | 新信号 |
| Create post | transmit | 发送信号 |

### 5.2 Signal list row (extends DataListRow)

```
 ●  [求助]  秋招一批和二批可以同时投吗          ▮▮▮▮▯   回声 23 · 共鸣 41 · 2 小时前
 │    │              │                        │            └ metadata, 12px tabular
 │    │              │                        └ signal-strength ticks (activity)
 │    │              └ title 15px, --text-primary
 │    └ channel tag: 12px, bracketed, channel-specific treatment (below)
 └ freshness dot
```

- **Freshness dot** (6px): < 24h = `--light-ice` solid; 1–7d = `--light-muted`; older = hollow 1px ring. Encodes recency pre-attentively — you scan the dot column and see today's activity instantly.
- **Channel tags** stay monochrome except one: `讨论/经验/分享` all render in `--text-meta`; **`求助` (distress) renders in `--text-danger` at 70%** — the single permitted semantic color here, justified because surfacing help-requests is a community-health goal, not decoration.
- **Signal-strength ticks** (▮▮▮▮▯, five 2×8px marks): activity score = `log(replies+1)·recencyDecay(lastReplyAt)` bucketed 0–5, filled ticks `--light-silver` 60%, empty 12%. Encodes "is this thread alive" better than a raw reply count — a 200-reply thread dead for a month shows 1 tick; a 12-reply thread from this morning shows 4.
- **Fading**: threads with no activity > 30d drop title opacity to 65% — the log literally fades, no "archived" badge needed.
- **Beacons**: pinned posts sit in a separate 2-row block above the log under a `信标` eyebrow, marked with a 4px diamond `--light-silver`; no gold, no highlight bar.
- Sort control reads `按接收时间 / 按信号强度` (= newest / hot).

### 5.3 Post detail = signal + echo trace

Header block (readable surface): channel tag, title 20px, author + timestamp as `来源：Ray · 接收于 10-14 09:32`（tabular）, resonance control. Body: 14/24 text, max-width 68ch.
**Echo trace (comments):** each comment is a row with a 1px left hairline (`rgba(159,180,206,.15)`) running the block's height — the visual "trace" of the echo chain; nested replies indent 20px and continue the hairline. Timestamps tabular right-aligned. Comment input placeholder: `发送回声…`
**Resonance (like):** a plain interaction — `共鸣 41` in `--text-muted`; on tap the numeral ticks up and a single 400ms ring (12px, `--glow-cold`) pulses once around the count. State: activated = numeral in `--light-silver`. No heart icon, no fill animation, no counter bounce.
**Create post (发送信号):** ghost button per main-spec style; the compose panel's channel picker is four text toggles; on submit, the new row materializes in the log with a 400ms fade + 8px rise and its freshness dot at full `--light-ice` — arrival, not celebration.

### 5.4 Components (recommended new files)

`components/signals/SignalLog.tsx`, `SignalRow.tsx`, `SignalStrengthTicks.tsx`, `ChannelTag.tsx`, `EchoThread.tsx`, `ResonanceControl.tsx`, `TransmitComposer.tsx` — all thin wrappers over the existing DataList primitives; `lib/signal-score.ts` for the activity bucketing (pure function, unit-testable).

---

## 6. Notifications as signal reception — **future phase unless notifications already exist (verify)**

If the current codebase has no notification model, ship the *visual language* only where it's free (the navbar affordance) and defer the rest.

- **Navbar affordance:** replace the bell concept with a 6px reception dot beside 我的瓶子/用户区: unread items → dot solid `--light-ice` with one 2s pulse on arrival (never looping); none → hollow ring at 20%. No count badge — the count lives inside.
- **Reception log (接收记录):** a panel styled exactly like the signal list — each notification a row: signal-type tag `[面试邀请] [笔试链接] [状态更新] [回声] [新星探测]`, source (company/star or thread), one-line content, tabular timestamp. Unread rows carry the solid freshness dot + `--text-primary` title; read rows drop to `--text-secondary` and hollow dot. Interview invitations are the only rows permitted a `--glow-cold` left light-edge — the "strong incoming signal."
- **Why not a bell:** the generic bell-with-red-badge imports exactly the anxiety economy this product refuses; a quiet reception log frames company responses as *information received at your observatory*, restoring a sense of agency to the most stressful moments of 秋招.
- Data model (when built): `notifications(id, user_id, type, source_ref, payload, created_at, read_at)` + realtime subscription; until then, the freshness-dot pattern can already run off existing forum-reply queries if those exist (**verify**).

---

## 7. Weekly summary as observation log (观测日志) — retention feature, next phase

A single quiet page (and optionally an email later), generated from existing data — captures, status changes, deadlines, forum activity. Written as an astronomer's record, not a dashboard:

```
观测日志 · 第 42 周（10.13 – 10.19）

本周捕获        4 颗星
轨道内移        2 项（笔试 → 一面：字节跳动、美团）
停滞信号        3 项已超过 14 天未更新
即将截止        11 个已关注岗位在 7 天内截止
新探测          互联网星云本周新增 17 颗星
回声            你的信号「秋招一批和二批…」收到 9 次回声
```

Two-column key/value rows, tabular numerals, eyebrow header, zero charts, zero percentages, zero comparisons to other users, zero streak language. **Why it isn't a dashboard:** a dashboard asks "how am I performing?"; a log states "what happened in the sky you're watching." Same data, opposite emotional contract — and the "停滞信号 / 即将截止" lines are the retention hooks: they give a concrete, calm reason to open the app this week. Data: all derivable from existing tables + `status_changed_at` (§3.3); no new schema. Recommended: `app/observation-log/page.tsx` + `lib/weekly-log.ts` (recommended new files), computed on request (no cron needed for v1).

---

## 8. Personal constellation — season artifact, **post-launch**

Requires a status-history table (`application_status_events(application_id, from_status, to_status, changed_at)` — **verify whether Hermes shows any history mechanism; if not, this blocks on a migration** and should start recording *now* even if the feature ships later, because you can't reconstruct history retroactively).

- Each resolved application's recorded path (orbit radii over time) is frozen as a polyline; the set of paths composes the user's season constellation on the deep-space background. Offers terminate in a gold vertex; rejections in a small hollow ring where the path stopped — visible, dignified, unlabeled.
- Share artifact: server-generated (or client-canvas — exempt from the no-Canvas rule since it's an export, not UI) 3:4 image — constellation + `2026 秋季 · 从 9.02 到 11.15 · 捕获 40 · 抵达 2` + product mark. No rate, no ranking, nothing comparable between users by design: two people's constellations differ in *shape*, not score.
- Emotional thesis: 秋招 produces months of effort that usually evaporates into a spreadsheet. A constellation makes the whole journey — including paths that stopped partway — into an object worth keeping. That is the artifact people screenshot, and the only viral mechanic this product should ever have.

---

## 9. Explicit rejections

| Rejected | Why |
|---|---|
| XP / levels / points | Converts job searching into grinding; numbers-go-up UI is the definition of the gacha look the identity bans. |
| Streaks / daily check-in | Incentivizes daily *app-opening*, not good applying; punishes rest during an already exhausting season; streak-break guilt is anxiety by design. |
| Rankings / leaderboards / cohort comparison | "你落后于 73% 的同学" is technically trivial and emotionally corrosive; recruitment outcomes are too noisy for the comparison to even be informative. The deep-field idea (aggregate anonymous scale) delivers community feeling without ranking — even that is optional. |
| Gamified rewards / loot / badges for milestones | Badges are dashboard furniture; the bottle and constellation already are the reward system, grounded in real events. |
| Confetti / explosions / gold bursts on capture or offer | Breaks the restraint budget; an offer's gold star gains meaning precisely because gold is otherwise absent. |
| Sound effects | Job tools run in libraries, offices, and interviews' waiting rooms; even tasteful audio fails the context. |
| Neon / saturation creep | Every saturated status color added moves the product one step toward cyberpunk dashboard; the 20–35% saturation ceiling is load-bearing. |

---

## 10. Implementation priority

| Idea | Value | Difficulty | New data | Usability risk | Verdict |
|---|---|---|---|---|---|
| Star lifecycle (deadline urgency) §2.1 | ★★★★★ | Low (render-time derivation) | none | low | **Now** |
| Telescope focus search §2.3 | ★★★ | Low | none | low (list unaffected) | **Now** |
| Observation-parameters filter styling §2.2 | ★★★ | Low | none | none | **Now** |
| Doppler momentum §3 | ★★★★★ | Low–Med | `status_changed_at` or `updated_at` fallback | low | **Now** (with fallback A) |
| Forum signal log §5 | ★★★★ | Med (restyle + score fn) | none (derives from existing posts/comments/likes — **verify field names**) | low | **Now** |
| Bottle archive semantics §4 | ★★★★ | Low (extends existing bottle plan) | none | none | **Now** (rides Phase 8 of main spec) |
| Reception log / notifications §6 | ★★★★ | Med–High | notification model | med | **Next phase** (navbar dot language can ship now if any unread source exists) |
| Observation log §7 | ★★★★ | Med | none (needs §3 field) | none | **Next phase / retention** |
| Personal constellation §8 | ★★★★ | High | status-history table | none | **Post-launch — but ship the history-recording migration now** |
| Everything in §9 | — | — | — | — | **Reject** |

Acceptance criteria for the "Now" batch are embedded in the coding-agent prompt below.

---

## 11. Coding-agent prompt — first implementable batch

> **Batch scope: star lifecycle urgency, Doppler momentum, forum signal-log visual language. Preserve all readable lists. No new data models unless the specified fallback is impossible.**
>
> Prerequisites: the token system (`styles/tokens.css`), SpaceShell background, DataList components, and deterministic starfield from the main visual spec are assumed in place; if any is missing, implement that phase first and report.
>
> **Task 1 — Star lifecycle (deadline urgency).**
> In `lib/star-layout.ts` (or create as a recommended new file `lib/star-lifecycle.ts`), add `lifecycleTier(job, now): 'steady'|'waning'|'flicker'|'ember'|'collapsed'` per the tier table in §2.1, derived only from the existing job deadline field — locate its actual column/prop name first and report it. Apply tiers in `OpportunityStar` as opacity/brightness/glow modifiers and a 6s CSS opacity oscillation for `flicker` (disable under `prefers-reduced-motion`, substituting the static waning treatment). `collapsed` jobs: exclude from the grid, render count-only band `已坍缩 (N)` under the stage, move rows to list bottom at 40% opacity with status `已截止`. Add list deadline text per §2.1 column 4. Acceptance: tiers verifiably change with mocked system dates; no layout shift between tiers; reduced-motion shows no oscillation; expired jobs never occupy grid slots.
>
> **Task 2 — Doppler momentum on the orbit system.**
> Check `user_applications` for a status-change timestamp or history; if only `updated_at` exists, use it and leave a `// FALLBACK-A` comment; do NOT create a history table. Implement `momentumTier` (§3.3) in `lib/application-orbit.ts` and apply core-dot tints: blueshift `#AFC9E8` + glow 12%, neutral `--light-ice`, redshift `#C4B2A3` + brightness ×0.8 — tint the 8px core only, never labels or orbit lines; never apply redshift to offer/terminal states. Add tooltip line for redshifted stars: `已停留 N 天 · 跟进一下？` linking to the application detail panel. Acceptance: three tiers visible with mocked timestamps; gold offer stars unaffected; tints imperceptible in the readable list (list shows a plain `N 天未更新` metadata string instead).
>
> **Task 3 — Forum as signal log.**
> Restyle the discussions list using existing DataList primitives per §5.2: freshness dot (3 states from created/last-activity timestamps), bracketed channel tags (`求助` in `--text-danger` 70%, all others `--text-meta`), title 15px, right metadata `回声 N · 共鸣 N · 时间` tabular, and `SignalStrengthTicks` (recommended new component) driven by `lib/signal-score.ts`: `bucket(log(replies+1) * exp(-daysSinceLastReply/10))` into 0–5 — verify the actual reply/like field names before wiring. Threads inactive > 30d: title opacity 65%. Pinned posts → `信标` block per §5.2. Rename UI strings: 发送信号 (create), 回声 (comments), 共鸣 (likes); resonance tap = numeral tick + one 400ms `--glow-cold` ring, no icons, no bounce. Comment threads get the 1px left hairline echo-trace with 20px nested indent. Do NOT alter any posting/commenting/liking mutation logic — markup, styles, and pure derivation functions only.
>
> **Global constraints:** no Canvas/Three.js; no new dependencies; all derivations pure functions with unit tests (`lifecycleTier`, `momentumTier`, `signalScore`); deterministic across refreshes; mobile 360px verified; every string user-facing in Chinese per the vocabulary in §5.1. Report any schema/field mismatch instead of guessing.

---

## Appendix A — Typography addendum: a more characterful Chinese font pairing

Context: the main spec set body text in MiSans/HarmonyOS Sans — correct for data rows, but the client finds it flat as the *only* voice. (Note: Claude's own interface uses proprietary Latin faces with no CJK coverage, so "the font Claude uses" isn't transplantable; the right move is a **pairing** that adds character exactly where the observatory metaphor wants it.)

**Recommended pairing (both OFL / free for commercial use, self-hostable):**

| Role | Face | Why |
|---|---|---|
| Body, lists, data, admin | **MiSans / HarmonyOS Sans SC** (unchanged) | Tabular numerals, screen rendering, neutrality where data density lives. Do not make lists "fun" — that's where usability lives. |
| Display voice: H1, nebula labels, orbit-page title, 观测日志, constellation artifact, empty states | **思源宋体 Noto Serif SC**, weight 500–600 | A serif over deep-space imagery reads as *scientific journal / observatory record* — exactly the product's fiction. It adds gravitas and character without any cuteness, keeps the "professional, restrained" identity, and its thin strokes render beautifully in `--star-white` on near-black. |

CSS: `--font-display: "Noto Serif SC", "Source Han Serif SC", serif;` applied only to the display roles above (≈ 6 places app-wide); subset the woff2 aggressively (the display strings are a small character set — a 200–400KB subset is achievable vs. 8MB full).

**Alternatives, with honest tradeoffs:**
- **霞鹜文楷 LXGW WenKai** (OFL): warm, literary, handwriting-adjacent — genuinely charming for 观测日志 and the constellation artifact, but at H1 sizes over the whole app it drifts toward "文艺小清新" and softens the cinematic precision. Viable as a *third* voice used only in the weekly log, if you want more warmth there.
- **得意黑 Smiley Sans** (OFL): energetic oblique display face, very "fun" — and wrong here; its sports-poster energy fights the quiet-observatory identity. Rejected.
- **Serif for everything**: rejected — serif data tables at 12–15px on dark backgrounds lose to sans for legibility.

The one-line answer: **keep MiSans for information, add Noto Serif SC as the observatory's voice for titles and logs.** That contrast — instrument-precise sans against a literary serif in the headings — is itself a memorable design signature, and it costs one font file.

*End of document.*
