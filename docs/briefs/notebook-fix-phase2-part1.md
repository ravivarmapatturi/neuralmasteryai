# agy brief: notebook fix phase 2, Part 1

Execute Part 1 of `docs/plans/notebook-fix-brief-phase2.md` only. Follow the source plan exactly and stop before Part 2. Do not push.

## Required sequence

1. Inspect the route loading architecture, deployment asset retention/configuration, error reporting, service worker registration, and all `Suspense` boundaries that can render docs routes. Record whether a missing old hashed chunk is confirmed as the cause and whether render errors, an empty/no-fallback Suspense boundary, or a service worker can also explain the white page.
2. Reproduce the stale-client failure: start from the existing app, produce/swap to a new build so the old hashed chunk is unavailable, then click a route that lazy-loads. Capture the browser console/network outcome and page state. Use bounded timeouts and clean up every server/browser you start. If the available environment cannot reproduce it, record the precise limitation and a bounded diagnostic; do not claim reproduction.
3. Implement all four plan fixes: one guarded `vite:preloadError` reload (sessionStorage guard against loops), a retrying `lazy()` helper used for lazy route imports, a root and route ErrorBoundary with a friendly “Reload page” action instead of a blank screen, and tests. Keep the changes scoped to this failure path and use existing project patterns.
4. Add tests for reload loop protection, lazy import retry, root/route render error fallback, and the user-visible reload action as applicable to the implementation. Do not weaken existing assertions.
5. Run the focused tests, `npm run typecheck`, `npm run check:links`, and required relevant checks. Heavy commands, browser runs, and servers must be serialized through `flock /tmp/nm-heavy.lock`. Never run a production build unless `free -g` reports at least 5 GiB available. Capture the exact command and observed result.
6. Independently inspect every changed line, inspect test quality, and commit the Part 1 implementation locally. Do not start Part 2.

## Constraints

- Only edit source, tests, and configuration needed for Part 1, this brief, and `AGENT_TRACKER.md`.
- Preserve unrelated existing worktree files and do not stage them.
- Before starting, confirm no other `agy --dangerously` process is active and confirm at least 2 GiB available memory. Use only one agy process.
- Do not push.
- If an instruction is unclear or a required change needs scope beyond Part 1, stop and record the precise question below; do not guess.

## Report from agy
