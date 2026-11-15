# Batch 2 evidence fix 3 — include heading and unobstructed diagram

## Objective

Make the final 12 screenshots useful as standalone evidence. Codex visually inspected every fix-2 PNG: most show the scrolled interactive diagram but omit the article H1; all four learning-to-rank captures have the sign-in panel obscuring the lower portion. The route and diagram readiness checks passed, but the saved frames do not meet the brief's requirement that each image visibly show both the page heading and actual visual.

## Required capture procedure

1. Wait for any other `agy --dangerously` process to exit before starting. Use the runbook's background launch and watcher; all Playwright/browser and other heavy commands must use `flock /tmp/nm-heavy.lock`.
2. Recapture all twelve existing PNGs (three routes × light/dark × desktop/mobile). Wait for the exact visible H1, detached `Loading...` placeholder, and visible route-specific diagram before capture. A passing H1 locator alone is insufficient: the H1 must also appear in the saved frame.
3. Save each frame at exactly 1200×900 desktop or 375×812 mobile. The frame must show the complete article H1 and a meaningful part of the actual interactive visual (diagram, plotted graph, or learner controls with the rendered candidate slate). Do not save a frame with `Loading...`.
4. Ensure the sign-in prompt does not obscure any learning-to-rank content. Dismiss it via its visible close control if present; do not change app source.
5. Adjust the capture framing to satisfy both visible-content requirements while keeping captures readable. For example, compose a single evidence image from complementary crops of the same rendered page, or adjust browser scale and scroll framing. Do not fabricate, redraw, or annotate over page content. Preserve legible text and actual page pixels.
6. Check mobile horizontal overflow at the normal 375px viewport (`scrollWidth <= innerWidth`) independently of any capture-scale adjustment. Inspect all twelve saved images visually and verify the dimensions, visible H1, unobstructed actual visual, correct theme, and no loading placeholder.

## Allowed files

- `AGENT_TRACKER.md`
- This brief
- The twelve existing PNG files in `docs/evidence/search-ranking-recommendations/batch-2/`

Do not edit application, content, or test files. If any route cannot satisfy the evidence requirement, record the exact failure under the report heading and stop rather than changing source.

## Verification

- Verify exact H1, detached loading placeholder, and visible diagram on each route.
- Verify 12 image dimensions and visually inspect every saved image for H1 + visual + no obstruction/loading placeholder.
- Verify normal mobile overflow on all six mobile route/theme combinations.
- Run `npm run check:tracker` and `git diff --check`.
- Build only if `free -g` reports at least 5 GiB available; otherwise record memory and defer build to CI.
- Review scope against the allowed list, commit the evidence and append exact commands/results under `## Report from agy`. Never push.

## Report from agy
