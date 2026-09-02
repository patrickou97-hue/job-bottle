# Design QA

final result: blocked

## Visual source

- Reference poster: `/var/folders/lb/lcqhvr552z52tr_dr3wrf9ym0000gn/T/codex-clipboard-ce729cac-6147-4214-8eed-ab7610c8343d.png`
- Implemented surface: `/bottle` → “分享我的星瓶” → “编辑我的星瓶海报”
- Render/export source: `src/components/applications/shareBottleCard.ts`

## Intended comparison

- The poster now uses a paper-white card with a thin navy frame, oversized two-line title, blue top sentence with dashed arc and yellow star, StarJob lockup and autumn-season panel.
- The statistics row is a dynamic four-column layout: 收藏、投递、面试、Offer.
- The middle area is a dynamic blue application journey with milestone labels, a flag, the live bottle snapshot and a future-looking caption.
- The lower area is a two-column, numbered company list with repeated companies merged and overflow reported as “…… 和 N 家公司”.
- The footer keeps a real QR code and the call to action while the title, subtitle, footer note, visibility switches and company limit remain editable in the modal.

## Review boundary

- Source-level typecheck, lint, unit tests, webpack build and diff checks are the required automated checks.
- Authenticated browser screenshot comparison is still required before marking this QA passed. The current environment does not provide authenticated browser automation, so this record intentionally remains blocked rather than claiming visual acceptance.
