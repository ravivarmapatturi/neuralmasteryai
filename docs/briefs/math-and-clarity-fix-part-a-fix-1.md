# Follow-up brief: math-and-clarity-fix-part-a-fix-1

## Objective

Correct the Part A review findings from the first browser-evidence pass. Keep this fix round limited to the Part A route verification, script edge cases, evidence, and truthful handoff. Do not start Parts B or C.

## Review findings and exact fixes

1. **Browser capture accepted a loading screen as a successful route.** `docs/evidence/math-fix/raw/desktop-matrix-factorization-embeddings.png` visibly shows `Loading...`; the same route's JSON entry reports `transformedMathCount: 0`, while [`src/content/docs/search-ranking-recommendations/matrix-factorization-embeddings.mdx`](../../src/content/docs/search-ranking-recommendations/matrix-factorization-embeddings.mdx) contains 12 standalone display-math blocks (first block begins at line 42). The current verifier waits for `article, main, h1`, which can match the shell before the route content loads.
   - Fix the temporary browser verifier to wait for the route-specific article H1 and meaningful article content, explicitly reject a `Loading...` state, and collect console/page errors on failures.
   - Scroll through each article to trigger any lazy content, then wait for math rendering to settle before measuring. Do not continue or save a passing result if a route does not reach readiness.
   - For each of the 23 routes, derive the expected standalone display-block count from its MDX source and assert that the rendered prose `.katex-display` count accounts for every expected block. Record expected and actual counts per route. Keep display math embedded in diagrams out of this prose count.
   - Recheck vertical clipping and mobile horizontal scrolling only after readiness. Any failure must fail the run and include route/formula diagnostics.
   - Recapture both contact sheets after all 23 routes pass. Inspect every tile for the correct article heading and no `Loading...` or error placeholder.
2. **The report says all 23 routes passed even though the saved evidence includes the loading capture.** Update `docs/plans/math-and-clarity-fix-report.md`, `docs/evidence/math-fix/math-fix-verification.md`, and `docs/evidence/math-fix/math-fix-verification.json` to reflect only the corrected final run. Do not state that all routes/formulas passed unless route readiness and expected-count assertions pass. Preserve the Part A section structure.
3. **The fixer does not follow the stated trimmed-line rule and its tests omit indented code.** In `scripts/fix-display-math.mjs` and `scripts/check-math.mjs`, the anchored regex rejects otherwise eligible lines with trailing whitespace. Make the trimmed-content match honor the plan while preserving indentation. Also correctly leave Markdown indented code blocks untouched, without breaking list-item math. Add tests for trailing whitespace, indented code, and the applicable list case to `tests/math-scripts.spec.ts`.

## Allowed files

- `AGENT_TRACKER.md`
- `docs/briefs/math-and-clarity-fix-part-a-fix-1.md`
- `docs/briefs/math-and-clarity-fix-part-a.md`
- `scripts/fix-display-math.mjs`
- `scripts/check-math.mjs`
- `tests/math-scripts.spec.ts`
- `docs/evidence/math-fix/**`
- `docs/plans/math-and-clarity-fix-report.md` (Section A only)
- The temporary verifier in the current Antigravity scratch directory; do not add a debug/verifier script to the repository unless the brief's authored test needs a permanent test file.

No other files may be changed. Do not alter learning-page prose or any Part B/C content.

## Required checks

- `npm run check:math`
- `npm run check:mdx`
- `npm run check:links`
- `flock /tmp/nm-heavy.lock npx playwright test math-scripts.spec.ts --config tests/playwright-unit.config.ts`
- `flock /tmp/nm-heavy.lock npm run typecheck`
- Route verification for all 23 pages at 1440x900 and 375x812, with per-route expected/actual display formula counts, zero loading/error captures, zero vertical clipping, and no mobile page overflow. Generate fresh contact sheets and review them.
- `node scripts/check-agent-tracker.mjs`
- Do not run a production build unless `free -g` reports at least 5 GiB available. All heavy commands must use `flock /tmp/nm-heavy.lock`, sequentially.
- Never push or merge.

## Acceptance criteria

- All review findings above are fixed and the final evidence is reproducible and route-complete.
- Section A and the Part A brief report contain accurate checks, evidence, and remaining build deferral only.
- Review every allowed-file diff, append exact results to `## Report from agy`, commit this fix round and handoff, and stop before Parts B/C.

## Report from agy
