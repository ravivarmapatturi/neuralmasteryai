# Follow-up brief: math-and-clarity-fix-part-a-fix-2

## Objective

Finish the Part A review fixes. Preserve the uncommitted fixer/checker/test changes from fix round 1, correct the browser evidence, and write an accurate Section A handoff. Do not start Parts B or C.

## State at dispatch

- Fix round 1 was stopped after more than 45 minutes without repository file or commit changes. It did not write a completion report or commit.
- Its uncommitted changes remain in `scripts/fix-display-math.mjs`, `scripts/check-math.mjs`, and `tests/math-scripts.spec.ts`; retain and review them.
- The previous verification artifact is invalid: `docs/evidence/math-fix/raw/desktop-matrix-factorization-embeddings.png` shows `Loading...`, but `docs/evidence/math-fix/math-fix-verification.json` claims that 23 routes passed. That MDX source has 12 standalone display blocks; the JSON says the route rendered zero. The report in `docs/plans/math-and-clarity-fix-report.md` must not repeat the unsupported pass claim.
- I stopped the orphaned probe/Vite processes from fix round 1. Confirm no other agy or heavy command is active before proceeding.

## Required work

1. **Finish script edge cases.** Review the current uncommitted edits in `fix-display-math.mjs` and `check-math.mjs`. Match standalone math on trimmed line content while preserving indentation; skip fenced and genuine indented code blocks; keep Markdown list math working. Use CommonMark-compatible list content indentation (bullet/ordered marker width plus its following whitespace, then four spaces for an indented code block). Add tests for trailing whitespace, outside-list code, list math, and indented code within a list. Keep fixer and checker behavior aligned.
2. **Repair the 23-route browser verification.** Continue with the current temporary Antigravity scratch verifier or replace it. Do not add unrelated debug files to the repository. For every route, use bounded navigation and wait timeouts, require the route-specific `article h1` and meaningful article content, reject any `Loading...` or error state, and capture browser console/page errors on failure. Scroll through the article to trigger lazy content before measuring. The verification must compare each route's expected standalone display-block count from its MDX source with the actual article `.katex-display` count and fail on any mismatch.
3. For every route, measure vertical clipping at 1440x900 and 375x812 (`scrollHeight <= clientHeight + 2`). On mobile, verify wide formulas scroll horizontally without increasing the page width beyond 375px. Do not treat a horizontal scrollbar as curing vertical clipping.
4. If the matrix-factorization route remains in `Loading...`, diagnose and fix the route's runtime/load issue within the Part A scope. If a bounded probe shows an environmental/runtime blocker that cannot be resolved in scope, report the exact error and mark Section A **blocked**; do not claim verification or proceed to Parts B/C.
5. After all routes pass, generate fresh raw screenshots and 1440px/375px contact sheets. Inspect every tile for a route heading and no loading/error content. Replace the previous invalid evidence. Update `docs/evidence/math-fix/math-fix-verification.json` and `.md`, `docs/plans/math-and-clarity-fix-report.md` Section A, and both Part A brief reports with results from this final run only.
6. Run required checks below; stop all browsers and servers. Append exact commands/output and commit fix round 2 and its handoff. No push or merge.

## Allowed files

- `AGENT_TRACKER.md`
- `docs/briefs/math-and-clarity-fix-part-a-fix-2.md`
- `docs/briefs/math-and-clarity-fix-part-a-fix-1.md` (record the interrupted outcome; do not fabricate a completion report)
- `docs/briefs/math-and-clarity-fix-part-a.md`
- `scripts/fix-display-math.mjs`
- `scripts/check-math.mjs`
- `tests/math-scripts.spec.ts`
- `docs/evidence/math-fix/**`
- `docs/plans/math-and-clarity-fix-report.md` (Section A only)
- The temporary verifier in the current Antigravity scratch directory; do not add debug/verifier files to the repository.
- A route runtime source file only if the browser diagnostics establish a concrete Part A route-loading defect. Report the specific reason before editing it.

No other paths may be changed. Preserve the parallel `64a60e94` notebook-skill commit and all unrelated worktree state.

## Required checks

- `npm run check:math`
- `npm run check:mdx`
- `npm run check:links`
- `flock /tmp/nm-heavy.lock npx playwright test math-scripts.spec.ts --config tests/playwright-unit.config.ts`
- `flock /tmp/nm-heavy.lock npm run typecheck`
- Route verification for all 23 routes at both viewports with route-specific H1 readiness, no loading/error captures, expected/actual math counts matching per route, zero vertical clipping, and no mobile page overflow.
- `node scripts/check-agent-tracker.mjs`
- Heavy commands must run sequentially through `/tmp/nm-heavy.lock`. Before a build, check `free -g`; with less than 5 GiB available, defer the build and record it.
- Before starting, confirm `ps -eo comm=,args= | awk '$1=="agy"'` prints nothing. Never push.

## Acceptance criteria

- All prior review findings are corrected or Section A is honestly marked blocked with exact diagnostics.
- No stale `Loading...` image is presented as passing evidence.
- Section A contains only results from the corrected, inspected final run.
- Append exact work, commands, observed results, any blocker, and commits below. Commit this fix round and tracker handoff; stop before Parts B/C.

## Report from agy
