# Codex brief: phase 2 + owner feedback (17 Nov 2026)

You verify, write agy briefs, run agy, review. Do NOT push; Claude pushes. Load notebook-page, learn-page, visualization, writing-voice, ui-design skills. Heavy jobs under `flock /tmp/nm-heavy.lock`. Commit locally in small commits ending `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

Do the parts IN THIS ORDER. After Part 1 and Part 2, commit and write `docs/evidence/notebook-phase2/PART1-2.md`, then continue; Claude may push those first.

## Part 1 (urgent bug): blank page on click, fine after refresh
Owner sees a fully white page on `/docs/...` after clicking a link; a refresh fixes it. Claude's diagnosis: after each deploy the old hashed JS chunks are removed; a tab with the old app tries to lazy-load a chunk that no longer exists, the import fails, and with no error boundary React unmounts to white. There is no `vite:preloadError` handler and no ErrorBoundary in `src`.
- Confirm the cause (reproduce: load the site, swap to a new build, click a lazy route), and check whether anything else can cause it (Suspense with no fallback, service worker, a render error).
- Fix: `window.addEventListener('vite:preloadError', …)` → one guarded reload (sessionStorage flag so it can't loop); a retrying `lazy()` wrapper; a root + route ErrorBoundary that shows a friendly "Reload page" note instead of white. Add a test.

## Part 2 (owner feedback on the look)
- REMOVE the horizontal ruled lines everywhere. Owner: "our notebook is pure white book with side ruler." Keep the red margin line (owner likes it). The page is plain white (light) / its dark counterpart, no lines. Update `notebook-page` SKILL.md and the guard tests to say this.
- ONE type scale for every page: H1, H2, H3, H4, body, small text, table text, table header, callout text, caption must be the same size, weight, colour and spacing on every Learn page, blog post and lab. Currently they differ between pages. Define them once as tokens in the shared CSS; remove per-page or per-component overrides of font-size/weight for headings, tables and body.
- Add an automatic guard so this cannot happen again: a Playwright check that opens at least 15 pages from different sections (at 1440 and 375) and asserts computed font-size/line-height/weight for h1–h4, p, table th/td, callout body are identical across pages and that no `background-image` ruled lines exist; wire it into `npm run check:notebook` or a new `check:typography` that CI runs. Also a static check that rejects new `font-size` overrides on headings/tables in content components.

## Part 3: phase 2 content fixes
Using `docs/evidence/site-audit/notebook-violations.json` and the final issue list: fix fake code fences, ASCII diagrams (redraw as pen SVGs), maths in tables, pseudo-headings, missing visuals, and academic tone (plain words first, history into GoDeeper). Order: remaining 10 Search & Recommendation pages, then `harness-engineering/context-and-instruction-design` (A7), then MLOps, Machine Learning, Blog, Deep Learning, Agents. Work in batches of ~8 pages; commit each batch after `check:notebook` is clean for those pages plus check:math, check:mdx, check:links, typecheck. Keep a running `docs/evidence/notebook-phase2/BATCHES.md` (pages, what changed, checks, screenshots light/dark 1440/375 for 2 pages per batch). Recompute every worked number.

Stop after the Search pages + A7 batch are done, or when you hit something you must ask about, and write the report.

## Part 2b (owner, 21:14): overlapping labels — added after launch, do before Part 3
Screenshot `docs/plans/owner-overlap-2026-11-17.png` (live tf-idf vector-space visual, 1440 px): y-axis label "TF("learning", d)" cut off on the left; "D1 & D3 (0.25, 0.25)" and "Collinear (45° diagonal)" drawn on top of the "Notebook observation" box; "45° line of balance" crosses the box; "(0,0)" and "D4 (0, 0)" collide. Fix every phase 1 pen visual (all 6 plus this one) so no text touches another text, a line, or the frame, at 1440, 768 and 375. Add an automatic overlap guard: Playwright gets bounding boxes of every SVG `<text>` and HTML label inside each visual on the pilot + Search pages and fails on any intersection or any text outside the SVG viewBox. Run it in CI.
