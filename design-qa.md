# Design QA

final result: passed

## Visual sources

- Resume hierarchy source: `/var/folders/lb/lcqhvr552z52tr_dr3wrf9ym0000gn/T/codex-clipboard-045eef50-710f-40da-8e7b-121aceab0e23.png`
- Map segmented-control source: `/var/folders/lb/lcqhvr552z52tr_dr3wrf9ym0000gn/T/codex-clipboard-3b96a7b8-9930-4084-9a31-91b8636a4862.png`
- Filter-rail source: `/var/folders/lb/lcqhvr552z52tr_dr3wrf9ym0000gn/T/codex-clipboard-03861699-73f0-4299-b8d4-6cb9e5f9a9b2.png`
- Nebula scrolling source: `/var/folders/lb/lcqhvr552z52tr_dr3wrf9ym0000gn/T/codex-clipboard-24d0bbf7-4057-4a1d-8446-e7cecbe47e4d.png`
- Implemented desktop states: `/Users/wangrui/Documents/Web/.codex-artifacts/design-qa-liquid-scroll/resume-workspace.png`, `/Users/wangrui/Documents/Web/.codex-artifacts/design-qa-liquid-scroll/explore-filters-desktop.png`, `/Users/wangrui/Documents/Web/.codex-artifacts/design-qa-liquid-scroll/explore-nebula-scroll.png`
- Implemented mobile state: `/Users/wangrui/Documents/Web/.codex-artifacts/design-qa-liquid-scroll/explore-mobile.png`
- Combined comparison: `/Users/wangrui/Documents/Web/.codex-artifacts/design-qa-liquid-scroll/comparison.png`

## Viewports and states checked

- Desktop 1440 x 1024: `/resume`, `/explore` default state, and the 104-job technology nebula selected state.
- Mobile 390 x 844: `/explore` with both four-option segmented controls present.
- Checked default, selected, hover-capable, keyboard-focusable, and nested-scroll states.

## QA findings and iterations

- Resume selection and editor surfaces now use low-density transparent layers; selected content is signalled by a restrained edge accent instead of a heavy nested card.
- Map and location segmented controls now have one transparent track and one specular moving indicator. Both explicitly avoid backdrop blur, so the result reads as clear liquid glass rather than frosted glass.
- The filter rail has one rounded outline and a content-sized `self-start` surface. QA caught and removed the previous grid stretch that made its background as tall as the entire 206-row job list.
- Selecting the technology nebula renders all 104 jobs. The list viewport measured 382 px high with 7,545 px of scrollable content.
- A real pointer-wheel scroll changed the nested list from `scrollTop: 0` to `scrollTop: 620` while the page remained at `scrollY: 344.5`, confirming the job box scrolls independently.
- The detail pane has its own independent overflow region; the job-list region is focusable, labelled, touch-scroll enabled, and exposes a subtle scrollbar.
- No horizontal overflow at 1440 px or 390 px.
- `npx tsc --noEmit`, `npm run lint`, `npm run smoke`, `npm run build`, and `git diff --check` pass.
