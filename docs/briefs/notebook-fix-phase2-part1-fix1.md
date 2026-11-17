# agy fix brief: Part 1 review corrections

Review commit `d2ed08c6` against `docs/plans/notebook-fix-brief-phase2.md` Part 1. Make only the corrections below, keep Part 2 untouched, and do not push.

## Findings and exact fixes

1. **Reload guard is cleared too early.** `src/App.tsx` clears `nm:preload-reload` in an effect when the app mounts. The route chunk that triggered the reload may not have loaded yet, so a repeat missing chunk can cause another reload. Remove the App-mount clearing. Clear the guard only after a lazy module import has successfully resolved (integrate this into the shared `lazyWithRetry`/import path), and add tests proving that a failed import leaves the guard in place and a successful import clears it.
2. **Storage failure comment is inaccurate.** In `src/lib/preloadError.ts`, the catch says it will “fallback to reload once”, but that path performs no reload. Update the comment and add an assertion for the actual behavior: the handler does not throw and the failed import remains available to the ErrorBoundary when session storage is unavailable.
3. **Diagnostic/report overclaims.** The current report says Vitest “proved” an unhandled rejection under `<Suspense>` unmounts the tree, but the test only exercises the `ErrorBoundary + lazyWithRetry` success path. Correct the wording to distinguish source-level diagnosis, test coverage, and reproduction. Add a focused regression test for the unhandled lazy-import rejection with no boundary if it can be tested reliably in this setup; otherwise say explicitly that this specific behavior was not exercised by the test.
4. **Attempt the plan’s stale-client reproduction without violating the build memory guard.** Do a bounded browser reproduction using an isolated temporary worktree or equivalent: serve the pre-fix app, force a lazy MDX route module request to fail after navigation (representing the removed old chunk), and record the observed app state/error; then serve the fixed app with the same forced failure and record the ErrorBoundary fallback/reload behavior. Use one server/browser run at a time under `flock /tmp/nm-heavy.lock`, bounded startup/navigation timeouts, and clean up all processes. Do not run a production build below 5 GiB available RAM. If the reproduction cannot be completed, report exactly what was attempted and why; do not call the behavior reproduced.

## Verification and report

- Run focused tests for preload recovery, retry behavior, and ErrorBoundary; then `npm run typecheck`, `npm run check:links`, and `npm run check:tracker`, all heavy commands under `flock /tmp/nm-heavy.lock`.
- Rerun `npm run check:mdx` if any content/report parser scope requires it. Do not run a production build unless `free -g` reports at least 5 GiB available.
- Append a correction report below, including exact commands, exit codes, browser route/results, and commit SHA. Keep the existing Part 1 report truthful; do not modify the source plan.
- Stage only Part 1 source/tests, this fix brief, `docs/briefs/notebook-fix-phase2-part1.md`, and `AGENT_TRACKER.md`. Preserve user-owned untracked files. Commit locally. Never push.
- If a requirement needs out-of-scope changes or cannot be safely resolved, stop and record the precise question under this brief's report.

## Report from agy
