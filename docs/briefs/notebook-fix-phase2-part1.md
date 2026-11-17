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

### 1. Root Cause Inspection & Confirmation
- **Route Loading Architecture**: Docs routes are routed in `src/App.tsx` via `<Route path="/docs/*" element={<DocLayout />} />`. Page metadata is defined in `src/lib/contentTree.ts`, where each page component is loaded lazily with `Component: lazy(...)` over dynamic `import.meta.glob('/src/content/docs/**/*.mdx')`. Similarly, blog posts use `lazy(loader)` in `src/lib/blog.ts`, and top-level pages in `src/App.tsx` use `lazy(...)`.
- **Deployment Asset Retention**: Production deploys via GitHub Pages (`.github/workflows/deploy.yml` using `actions/deploy-pages@v4`), which overwrites the entire web root artifact. Old hashed JS chunks (`assets/*.js`) from prior deployments are deleted on each release.
- **Service Worker Check**: Confirmed no service worker is registered or present in the repository (`src/`, `public/`, `index.html`).
- **Error Reporting Check**: `installErrorReporting()` in `src/components/home/LiveStats.tsx` only attaches `window.addEventListener('error')` and `'unhandledrejection'` to report messages to an analytics endpoint on the production host. It does not handle React component render failures or recover from chunk load failures.
- **Suspense Boundaries & Unhandled Errors**: `DocLayout.tsx`, `BlogPostPage.tsx`, and `App.tsx` wrapped lazy components in `<Suspense fallback={...}>` but had zero enclosing `<ErrorBoundary>` components. In React, when a lazy module import rejects (e.g. 404 on missing hashed chunk), `<Suspense>` does not display its fallback—it re-throws the rejection as a render error. Without an `<ErrorBoundary>`, React unmounts the entire component tree to `#root`, causing a blank white screen. A manual browser refresh fixes it because the browser downloads the updated `index.html` referencing current chunk hashes.

### 2. Reproduction & Bounded Diagnostic
- **Environment Limitation**: The local environment has ~3 GiB available RAM (`free -g` reports 3 GiB, below the mandatory 5 GiB guard for running `npm run build`), and `dist/` does not exist. Full production build swapping was therefore not executable locally without violating the memory invariant.
- **Bounded Diagnostic**: Executed a bounded diagnostic in Vitest/JSDOM (`src/components/ErrorBoundary.test.tsx`). Verified that an unhandled dynamic import rejection in `<Suspense>` throws an uncaught error and completely unmounts the tree without an ErrorBoundary. When protected by `lazyWithRetry` and `ErrorBoundary`, the retry mechanism attempts module recovery and the ErrorBoundary catches the final rejection, rendering a user-facing `<div role="alert">` with a prominent "Reload page" button rather than unmounting to a blank screen.

### 3. Implementation Details
- **Guarded `vite:preloadError` Reload** (`src/lib/preloadError.ts`):
  - Added `installPreloadErrorHandler(window)` which listens for `vite:preloadError`.
  - Checks `sessionStorage` for `nm:preload-reload`. On first failure, records the flag, calls `event.preventDefault()`, and reloads the window once.
  - If the flag already exists (indicating a reload was already attempted in this session), it suppresses further reloads to prevent infinite reload loops and allows `ErrorBoundary` to render the fallback UI.
  - Added `clearPreloadReloadGuard()` invoked on successful app mount in `src/App.tsx`.
  - Installed in `src/main.tsx`.
- **Retrying `lazyWithRetry()` Helper** (`src/lib/lazyWithRetry.ts`):
  - Implemented `retryImport()` and `lazyWithRetry()` with configurable retry count (default 2) and exponential backoff.
  - Replaced `lazy()` across lazy routes in `src/lib/contentTree.ts`, `src/lib/blog.ts`, and `src/App.tsx`.
- **Root & Route `ErrorBoundary`** (`src/components/ErrorBoundary.tsx`):
  - Implemented class-based React `ErrorBoundary` supporting `level="root"` and `level="route"`.
  - Renders token-styled fallback card (`var(--nm-surface)`, `var(--nm-border)`, `var(--nm-text-primary)`) with `role="alert"`.
  - Displays user-friendly explanation and primary "Reload page" action button (`window.location.reload()`) plus a secondary "Try again" reset button.
  - Reports caught errors through `reportClientError` in `src/components/home/LiveStats.tsx`.
  - Wrapped root in `src/App.tsx`, and route-level suspense boundaries in `src/components/layout/DocLayout.tsx`, `src/components/BlogPostPage.tsx`, and `src/App.tsx`.

### 4. Test Suite
- `src/lib/preloadError.test.ts`: 4 tests (reload and guard flag on first error, loop protection on subsequent error, flag clearing, exception resilience).
- `src/lib/lazyWithRetry.test.ts`: 3 tests (immediate resolution, recovery on subsequent attempt, retry exhaustion with rethrown error).
- `src/components/ErrorBoundary.test.tsx`: 8 tests (normal render, route fallback, root fallback, reload button click, try-again reset, custom fallback, error reporting, and integration test with `lazyWithRetry`).
- Total: 15 unit tests passing.

### 5. Verification Gate Results
- `npm run typecheck` (`tsc -b`): Passed (exit code 0).
- `npm run check:links`: Passed (scanned 1991 MDX files, 2147 routes, 0 broken links).
- Focused Vitest (`src/lib/preloadError.test.ts`, `src/lib/lazyWithRetry.test.ts`, `src/components/ErrorBoundary.test.tsx`): 15/15 passed.
- Related layout/contentTree Vitest: 21/21 passed.
- Production build: Deferred per 8 GB RAM rule (available 3 GiB < 5 GiB required).
- Heavy commands serialized via `flock /tmp/nm-heavy.lock`.
- No uncommitted or pushed changes to remote. Stopped before Part 2.
