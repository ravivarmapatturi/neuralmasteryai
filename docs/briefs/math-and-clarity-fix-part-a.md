# Brief: math-and-clarity-fix-part-a

## Objective

Implement Part A of `docs/plans/math-and-clarity-fix-2026-11.md` as an isolated batch: repair standalone display math sitewide, add a guard and CI step, and verify the affected search pages plus ten other changed pages at desktop and phone widths. Do not start Parts B or C.

## Allowed files

- `AGENT_TRACKER.md`
- `docs/briefs/math-and-clarity-fix-part-a.md`
- `scripts/fix-display-math.mjs`
- `scripts/check-math.mjs`
- `package.json`
- `.github/workflows/ci.yml`
- `src/content/docs/**/*.mdx` only where required by the mechanical rewrite or the formula-in-table correction below
- `tests/**` only if a focused test is needed for the scripts
- `docs/evidence/math-fix/**` for the Part A verification evidence
- `docs/plans/math-and-clarity-fix-report.md` (write only section A)

No other paths may be changed. Do not modify Part B/C prose, diagrams, headings, navigation, or unrelated application code.

## Required work

1. Implement `scripts/fix-display-math.mjs` as a deterministic, repeatable transformation. Rewrite each standalone line whose trimmed form is exactly `$$…$$` to an opening `$$`, the original body, and a closing `$$`, retaining the original line indentation. Do not transform fenced/indented code blocks, JSX string/attribute contents, `RunnableCode` code, or `$$…$$` occurring within a sentence. Handle Markdown list indentation correctly. Run it over all MDX under `src/content/docs/` once and inspect the diff.
2. Audit formulas in table cells across the 13 `search-ranking-recommendations` pages and the 10 other pages changed by the rewrite that contain the most complex table formulas. For fractions or long equations, replace the cell content with equivalent readable inline math (no stacked `\frac`) or move the formula into a display block immediately below the table. Preserve mathematical meaning and existing verified numeric values.
3. Add `scripts/check-math.mjs` and `npm run check:math`. It must fail with file and line diagnostics if an eligible standalone single-line `$$…$$` remains, while ignoring the excluded code/string contexts above. Add `npm run check:math` to `.github/workflows/ci.yml` beside the existing MDX/content checks (inspect the actual current workflow and place it alongside the relevant validation steps; do not remove or reorder unrelated checks).
4. Verify the 13 search pages and 10 other changed pages using Playwright against the dev server at 1440 px and 375 px. For every transformed formula, assert it renders as `.katex-display`; assert no display is vertically clipped (`scrollHeight <= clientHeight + 2`) and on 375 px it can scroll horizontally where needed without clipping. Save contact sheets for both widths under `docs/evidence/math-fix/`. Capture the routes, assertions, and results in the evidence/brief report. Stop any server/browser started by this task.
5. Add focused tests for the fixer/checker if appropriate. Do not weaken existing checks or tests.

## Commands and machine limits

- Detect another agy with `ps -eo comm=,args= | awk '$1=="agy"'` before starting. Only one agy may run.
- All heavy commands (typecheck, Vitest, build, Playwright, dev server) must run through `flock /tmp/nm-heavy.lock`.
- Available RAM was 2 GiB at dispatch. Check `free -g` immediately before a build; run the build only if at least 5 GiB is available. If below 5 GiB, record the deferral; do not start it.
- Required applicable checks: `npm run check:math`, `npm run check:mdx`, `npm run check:links`, `npm run typecheck`, and focused tests for script behavior. Run sequentially under the lock when heavy. Do not run full Vitest unless memory permits and it does not overlap another heavy command.
- Never push or merge.

## Acceptance criteria

- Mechanical rewrite is idempotent and the diff contains only intended math formatting plus necessary table formula simplifications.
- `check:math` passes locally and is in CI.
- All 13 search pages and ten sampled changed pages pass the Playwright formula/render/clipping checks at both widths; contact sheets exist and match the reported checks.
- Every allowed-file diff has been reviewed. No Part B/C work has begun.
- Append a `## Report from agy

### 1. Summary of Changes
- **`scripts/fix-display-math.mjs`**: Implemented deterministic, idempotent script to rewrite standalone single-line `$$...$$` into 3-line block math while retaining indentation. Excludes fenced code, RunnableCode, multiline JSX tags, and inline math within sentences. Scanned 1,991 MDX files; converted 304 display formulas across 81 files.
- **Table formulas audit**: Audited tables across all 13 search pages (`overview`, `text-search-bm25`, `tf-idf`, `bm25`, `ranking-evaluation-metrics`, `semantic-and-hybrid-search`, `ranking-fundamentals`, `learning-to-rank`, `recommendation-foundations`, `matrix-factorization-embeddings`, `deep-recommenders`, `exploration-feedback-loops`, `search-recommendation-system-design`) and 10 sampled changed pages (`llm-inference-optimization`, `token-and-cost-attribution`, `continuous-batching-and-speculative-decoding`, `recurrent-looped-transformers`, `quantization-and-compression`, `roofline-and-kv-cache`, `linear-regression`, `attention-transformers`, `edge-and-tinyml-architecture`, `model-serving`). Replaced all squashed/stacked `\frac` expressions in table cells with clean readable inline math (`/`) while preserving verified mathematical meaning and numbers.
- **`scripts/check-math.mjs` & package/CI wiring**: Added guard script `scripts/check-math.mjs`, added `"check:math": "node scripts/check-math.mjs"` to `package.json`, and added `Math format validation` step (`npm run check:math`) to `.github/workflows/ci.yml` beside internal link validation.
- **Tests**: Created `tests/math-scripts.spec.ts` with 7 test cases covering rewriting, indentation preservation, idempotency, code fences, RunnableCode, inline math, and check-math diagnostics.
- **Browser verification status: blocked**: The original 23-route dataset/contact sheets contain an invalid desktop matrix-factorization capture (loading state; recorded 0 displays, while source has 32). The final bounded diagnostic passed only for that route (HTTP 200, expected/rendered displays 32, correct H1, no page errors; 24 resource 403 console messages). No corrected full-route dataset or contact sheets were produced; do not use the original artifacts as completion proof.
- **Report**: Created `docs/plans/math-and-clarity-fix-report.md` with Section A.
- **Part B/C**: Zero Part B/C work was started.

### 2. Exact Commands and Output
1. `npm run check:math`
   - **Output**: `[check:math] PASSED: All display math across 1991 MDX file(s) correctly formatted as multi-line blocks.` (Exit code 0)
2. `npm run check:mdx`
   - **Output**: `check-mdx-compile: 2019 files, 0 failed.` (Exit code 0)
3. `npm run check:links`
   - **Output**: `check-internal-links: scanned 1991 MDX file(s), found 2147 valid route(s). no broken internal prose links found. check-anchor-links: no broken anchor links found.` (Exit code 0)
4. `flock /tmp/nm-heavy.lock npx playwright test math-scripts.spec.ts --config tests/playwright-unit.config.ts`
   - **Output**: `7 passed (738ms)` (Exit code 0)
5. `flock /tmp/nm-heavy.lock npm run typecheck`
   - **Output**: `tsc -b` (Exit code 0)
6. Final bounded diagnostic: `flock /tmp/nm-heavy.lock node <temporary bounded route diagnostic>`
   - **Observed output**: HTTP 200; expected source display count 32; rendered `.katex-display` count 32; H1 `Matrix Factorization & Latent Factor Embeddings`; article text length 28,550; still-loading false; page errors 0; 24 console resource errors (HTTP 403); elapsed 32.37s. The 23-route sweep was not run in this final round and is not accepted as verified because its checked-in matrix desktop capture shows a loading state.
7. `node scripts/check-agent-tracker.mjs`
   - **Output**: `check-agent-tracker: AGENT_TRACKER.md is valid, structured, and properly maintained.` (Exit code 0)

### 3. Deferrals / Could Not Do
- **Production Build (`npm run build`)**: Deferred to CI per the repository 8GB RAM rule. Memory check immediately before build showed `free -g` available was 2 GiB (2,897 MiB), which is below the mandatory 5 GiB safety threshold.

### 4. Commits (Separate Batch on `search-rank-rec`, No Push)
- `e660ce25`: `feat(math): add fix-display-math and check-math scripts, CI guard, and tests`
- `554b8507`: `style(math): rewrite standalone display math to block format and simplify table formulas`
- `256f41bd`: `docs(math): add Part A browser verification evidence and Section A report`
- Handoff commit: see current branch history. Final review fix round 3 stopped at the documented 45-minute no-change threshold; no Parts B/C started. No push.

## Report from agy

### 1. Summary of Changes
- **`scripts/fix-display-math.mjs`**: Implemented deterministic, idempotent script to rewrite standalone single-line `$$...$$` into 3-line block math while retaining indentation. Excludes fenced code, RunnableCode, multiline JSX tags, and inline math within sentences. Scanned 1,991 MDX files; converted 304 display formulas across 81 files.
- **Table formulas audit**: Audited tables across all 13 search pages (`overview`, `text-search-bm25`, `tf-idf`, `bm25`, `ranking-evaluation-metrics`, `semantic-and-hybrid-search`, `ranking-fundamentals`, `learning-to-rank`, `recommendation-foundations`, `matrix-factorization-embeddings`, `deep-recommenders`, `exploration-feedback-loops`, `search-recommendation-system-design`) and 10 sampled changed pages (`llm-inference-optimization`, `token-and-cost-attribution`, `continuous-batching-and-speculative-decoding`, `recurrent-looped-transformers`, `quantization-and-compression`, `roofline-and-kv-cache`, `linear-regression`, `attention-transformers`, `edge-and-tinyml-architecture`, `model-serving`). Replaced all squashed/stacked `\frac` expressions in table cells with clean readable inline math (`/`) while preserving verified mathematical meaning and numbers.
- **`scripts/check-math.mjs` & package/CI wiring**: Added guard script `scripts/check-math.mjs`, added `"check:math": "node scripts/check-math.mjs"` to `package.json`, and added `Math format validation` step (`npm run check:math`) to `.github/workflows/ci.yml` beside internal link validation.
- **Tests**: Created `tests/math-scripts.spec.ts` with 7 test cases covering rewriting, indentation preservation, idempotency, code fences, RunnableCode, inline math, and check-math diagnostics.
- **Browser verification status: blocked**: The original 23-route dataset/contact sheets contain an invalid desktop matrix-factorization capture (loading state; recorded 0 displays, while source has 32). The final bounded diagnostic passed only for that route (HTTP 200, expected/rendered displays 32, correct H1, no page errors; 24 resource 403 console messages). No corrected full-route dataset or contact sheets were produced; do not use the original artifacts as completion proof.
- **Report**: Created `docs/plans/math-and-clarity-fix-report.md` with Section A.
- **Part B/C**: Zero Part B/C work was started.

### 2. Exact Commands and Output
1. `npm run check:math`
   - **Output**: `[check:math] PASSED: All display math across 1991 MDX file(s) correctly formatted as multi-line blocks.` (Exit code 0)
2. `npm run check:mdx`
   - **Output**: `check-mdx-compile: 2019 files, 0 failed.` (Exit code 0)
3. `npm run check:links`
   - **Output**: `check-internal-links: scanned 1991 MDX file(s), found 2147 valid route(s). no broken internal prose links found. check-anchor-links: no broken anchor links found.` (Exit code 0)
4. `flock /tmp/nm-heavy.lock npx playwright test math-scripts.spec.ts --config tests/playwright-unit.config.ts`
   - **Output**: `7 passed (738ms)` (Exit code 0)
5. `flock /tmp/nm-heavy.lock npm run typecheck`
   - **Output**: `tsc -b` (Exit code 0)
6. Final bounded diagnostic: `flock /tmp/nm-heavy.lock node <temporary bounded route diagnostic>`
   - **Observed output**: HTTP 200; expected source display count 32; rendered `.katex-display` count 32; H1 `Matrix Factorization & Latent Factor Embeddings`; article text length 28,550; still-loading false; page errors 0; 24 console resource errors (HTTP 403); elapsed 32.37s. The 23-route sweep was not run in this final round and is not accepted as verified because its checked-in matrix desktop capture shows a loading state.
7. `node scripts/check-agent-tracker.mjs`
   - **Output**: `check-agent-tracker: AGENT_TRACKER.md is valid, structured, and properly maintained.` (Exit code 0)

### 3. Deferrals / Could Not Do
- **Production Build (`npm run build`)**: Deferred to CI per the repository 8GB RAM rule. Memory check immediately before build showed `free -g` available was 2 GiB (2,897 MiB), which is below the mandatory 5 GiB safety threshold.

### 4. Commits (Separate Batch on `search-rank-rec`, No Push)
- `e660ce25`: `feat(math): add fix-display-math and check-math scripts, CI guard, and tests`
- `554b8507`: `style(math): rewrite standalone display math to block format and simplify table formulas`
- `256f41bd`: `docs(math): add Part A browser verification evidence and Section A report`
- Handoff commit: updates `docs/briefs/math-and-clarity-fix-part-a.md` and `AGENT_TRACKER.md`.
