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
- Append a `## Report from agy` section below with exact changes, commands and observed results, skipped checks, and commit hashes. Commit the implementation and report in a separate Part A batch; do not push.

## Report from agy
