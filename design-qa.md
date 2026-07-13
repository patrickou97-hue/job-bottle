# Design QA

Final result: passed

## Visual source

- Selected direction: `/Users/wangrui/.codex/generated_images/019f5972-e281-7452-a72e-a2a3a9ae28cd/exec-67eafe22-bbbb-4dbc-b74b-c274ef9fb2a8.png`
- Implemented state: `/Users/wangrui/Documents/Web/.codex-artifacts/apple-ui/explore-selected-desktop.png`
- Side-by-side comparison: `/Users/wangrui/Documents/Web/.codex-artifacts/apple-ui/design-comparison.png`

## Viewports and states checked

- Desktop: 1440 x 1024, `/explore` default and selected-nebula states.
- Desktop: `/forum` feed, post detail inspector, and publish sheet.
- Mobile: 390 x 844, `/explore`, `/forum` publish sheet, and `/resume` editor.
- Signed-out profile route and onboarding notice; signed-in profile surfaces were verified through the shared primitives and source-level structure because no test account was available.

## QA findings

- Preserved the existing deep-space palette, nebula imagery, Chinese information architecture, and real job data.
- Matched the selected direction with a dominant nebula, floating glass result sheet, and bottom segmented dock without replacing the product identity.
- Kept the original company-star drill-down available as an explicit secondary view.
- Normalized controls, segmented tabs, panels, windows, and sheets to a compact macOS-style radius scale; full circles remain only for semantic pills, toolbar icons, avatars, and celestial objects.
- Verified the primary tabs, filters, publish flow, post inspector, resume tabs, drawer close behavior, Escape handling, focus return, and reduced-motion branches.
- No horizontal overflow at 1440 px or 390 px on the checked routes.
- Corrected the drawer blur contract and Next image sizing/loading behavior found during QA.
- `npm run build`, `npm run lint`, `npx tsc --noEmit`, `npm run smoke`, and `git diff --check` pass.
