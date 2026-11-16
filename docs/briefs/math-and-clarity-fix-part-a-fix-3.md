# Follow-up brief: math-and-clarity-fix-part-a-fix-3

## Objective

Complete the last allowed Part A fix round with one bounded, observable diagnostic for the matrix-factorization route, finish the script edge-case review, and either provide valid evidence or mark Part A blocked accurately. Do not start Parts B or C.

## State at dispatch

- Fix rounds 1 and 2 were stopped after more than 45 minutes with no repository changes. Neither returned a final report.
- The pending uncommitted changes from round 1 remain in `scripts/fix-display-math.mjs`, `scripts/check-math.mjs`, and `tests/math-scripts.spec.ts`; preserve them.
- The round-2 single-route process did not return logs and left a Vite server behind; I stopped the agent, probe, lock holder, and server.
- The original matrix-factorization screenshot still shows `Loading...`; the expected source count is 12 standalone math blocks.
- This is the third and final fix round allowed by the runbook.

## Required work

1. Review and correct the current fixer/checker/list-indentation changes. The list code indentation threshold must be based on the list marker's content column plus four spaces. Keep trailing-whitespace matching and list math correct. Add precise tests; run the focused suite and required math/MDX/link/type checks.
2. Run one bounded browser diagnostic for `/docs/search-ranking-recommendations/matrix-factorization-embeddings` directly under `flock /tmp/nm-heavy.lock`. Do not start an unbounded or nested background task. Capture stdout/stderr to `/tmp/agy-math-part-a-fix-3.log`; use bounded server startup, browser launch, navigation, and article-ready timeouts, and clean up the server/browser in `finally`. The diagnostic must record HTTP response status, route H1, article text length, source expected math count, rendered `.katex-display` count, console/page errors, and total elapsed time.
3. If the route reaches its expected H1 and renders all 12 expected displays within the bounded timeout, run the full 23-route verification using the corrected verifier, with per-route expected/actual counts, no loading/error states, zero vertical clipping at both widths, and no mobile page overflow. Regenerate and visually inspect both contact sheets.
4. If the single route still does not load within the bounded timeout, do not repeat probes or claim a pass. Record the captured error/output, fix any clear in-scope Part A defect found, then mark Section A blocked and stop before Parts B/C.
5. Update `docs/evidence/math-fix/**`, Section A in `docs/plans/math-and-clarity-fix-report.md`, the Part A brief and this brief with only observed results. Remove/replace invalid loading captures so they are not presented as proof.
6. Update tracker, commit the final fix round and handoff, stop all servers/browsers, and never push.

## Allowed files

- `AGENT_TRACKER.md`
- `docs/briefs/math-and-clarity-fix-part-a-fix-3.md`
- `docs/briefs/math-and-clarity-fix-part-a-fix-2.md` (record interrupted outcome only)
- `docs/briefs/math-and-clarity-fix-part-a.md`
- `scripts/fix-display-math.mjs`
- `scripts/check-math.mjs`
- `tests/math-scripts.spec.ts`
- `docs/evidence/math-fix/**`
- `docs/plans/math-and-clarity-fix-report.md` (Section A only)
- Temporary files under the current Antigravity scratch directory; diagnostic log only at `/tmp/agy-math-part-a-fix-3.log`.
- A runtime source file only if the bounded diagnostic proves a concrete route-loading defect, with the error and reason recorded in the report.

No other paths may be changed. Preserve unrelated shared-worktree commits.

## Commands and machine limits

- Confirm `ps -eo comm=,args= | awk '$1=="agy"'` prints nothing before start.
- Heavy commands run sequentially via `flock /tmp/nm-heavy.lock`.
- Required checks: `npm run check:math`, `npm run check:mdx`, `npm run check:links`, `npx playwright test math-scripts.spec.ts --config tests/playwright-unit.config.ts`, `npm run typecheck`, and tracker validation.
- Run the browser diagnostic with a strict timeout and preserve its log. Do not run a production build unless `free -g` shows at least 5 GiB available.
- No further fix round is permitted after this one; if blocked, report the unresolved failure to Claude.

## Acceptance criteria

- Either all Part A acceptance checks pass with inspected route-complete evidence, or Section A is marked blocked with the concrete observed failure and no false pass claim.
- Exact commands, exit codes, diagnostics, and commits are appended below.

## Report from agy
