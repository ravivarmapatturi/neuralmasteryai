# Article overflow verification — 2026-11-09

Fetched and fast-forwarded this worktree to origin/main (`b4ce62ef`) before changes.
The reported page overflow did not reproduce after the merge. Existing shared
CSS and VisualizationContainer fixes (including `5b01a099`) already constrain
wide code, tables, and math to their local scrolling regions. No CSS change was needed.

The AI landscape post checked here is `/blog/what-is-changing-in-ai-engineering-and-what-to-learn-next`.
The other route is `/docs/context-engineering/token-budgeting-and-compaction`.

Dev server: `npx vite --host 127.0.0.1 --port 5173` (no build/predev).
Measured `document.documentElement.scrollWidth` in Chromium with actual theme
storage, fresh pages, loaded fonts, and a full article scroll to load deferred
visualizers. Body scrollWidth was checked separately and matched the document.

| Route | Theme | Viewport | Before regression check added | After |
| --- | --- | --- | --- | --- |
| Token budgeting | Light | 375 | 375 | 375 |
| Token budgeting | Dark | 375 | 375 | 375 |
| AI landscape post | Light | 375 | 375 | 375 |
| AI landscape post | Dark | 375 | 375 | 375 |

Both routes also measured 1440 at a 1440px viewport in light and dark.
Reproduce with `node scripts/check-article-overflow.mjs` while the dev server is
running. The check asserts both document and body width for these eight cases.

Validation: `npm run typecheck`; `npm run check:links`;
`npx vitest run src/data/interviewCounts.test.ts src/components/InterviewPage.test.tsx`
(11 tests). Build, Pagefind, full Vitest, and full Playwright excluded by user.

A final repeat of all eight cases passed with KaTeX fonts served successfully
(HTTP 200). The default Vite filesystem allow list blocked fonts resolved through
this worktree's shared node_modules. For the repeat, a temporary `/tmp` config
extended `server.fs.allow` to the parent neuralmastery directory; no repository
configuration changed. Results stayed identical with the intended math fonts.
The dev server and browser were stopped after verification.
