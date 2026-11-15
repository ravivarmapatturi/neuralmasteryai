# Batch 2 evidence fix 2 — wait for rendered article content

## Objective

Replace the 12 screenshot files under `docs/evidence/search-ranking-recommendations/batch-2/` with captures that visibly contain the article content and the interactive diagram. Codex inspected the current desktop and mobile images and they show only the site header, a centered `Loading...` message, and navigation cards. Those images do not verify the pages or diagrams.

## Required capture procedure

1. Use the same local Vite + Playwright approach as the previous batch, with all heavy commands through `flock /tmp/nm-heavy.lock`.
2. For each page route and each theme/viewport (1200×900 and 375×812, light and dark), navigate directly and wait for the page's exact visible H1:
   - `/docs/search-ranking-recommendations/semantic-and-hybrid-search` → `Semantic & Hybrid Search`
   - `/docs/search-ranking-recommendations/ranking-fundamentals` → `Ranking Fundamentals & Link Analysis`
   - `/docs/search-ranking-recommendations/learning-to-rank` → `Learning to Rank`
3. Also wait for its diagram to be visible and for the page's `Loading...` placeholder to be detached. Do not rely on a fixed timeout or `networkidle` alone. If the page does not resolve, record the browser error/console and stop; do not save a placeholder screenshot.
4. Capture after scrolling the rendered diagram into view. Check the expected diagram title/text in the screenshot. Verify `document.documentElement.scrollWidth <= window.innerWidth` on each 375px route.
5. Overwrite the same 12 filenames. Inspect all captures with image/OCR; each must show the page heading and an actual visual, not `Loading...`.

## Allowed files

- `AGENT_TRACKER.md`
- This brief
- Twelve existing PNG files in `docs/evidence/search-ranking-recommendations/batch-2/`

Do not edit application, content, or test files in this correction. If the page itself fails to render, stop and report the exact failure for Codex; do not make a speculative source change.

## Verification

- Check each route/theme/viewport, visual readiness, and mobile overflow as stated above.
- Run `npm run check:tracker` and `git diff --check`.
- Build only if `free -g` reports at least 5 GiB available; otherwise record the measurement and defer build to CI.
- Review the diff against the allowed list, commit the evidence and append an exact report under this heading. Never push.

## Report from agy
