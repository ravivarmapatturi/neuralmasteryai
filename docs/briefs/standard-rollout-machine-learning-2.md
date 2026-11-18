# Agy implementation brief — Machine Learning batch 2

## Scope

Implement the next eight Machine Learning Learn pages in sidebar order:

1. `src/content/docs/machine-learning/logistic-regression.mdx`
2. `src/content/docs/machine-learning/unsupervised-learning.mdx`
3. `src/content/docs/machine-learning/decision-tree.mdx`
4. `src/content/docs/machine-learning/random-forest.mdx`
5. `src/content/docs/machine-learning/boosting.mdx`
6. `src/content/docs/machine-learning/xgboost-lightgbm-catboost.mdx`
7. `src/content/docs/machine-learning/support-vector-machines.mdx`
8. `src/content/docs/machine-learning/k-nearest-neighbors.mdx`

Read `docs/plans/standard-rollout-brief.md` and `docs/standards/page-standard.md` fully before editing. The brief's READ FIRST rules govern every edit.

## Required work

- Preserve existing code, output fences, diagrams, anchors, and technical derivations. Program output/logs stay in fenced `output` blocks; never rewrite them as bullets or delete them. Do not remove more code fences than the batch adds.
- Put exactly one ELI5 immediately under each H1. Add `Why it exists`, then `The big picture` with a page-specific PenFlow and a matched Worksheet where the page uses numbers. Use each page's real numeric example; recompute values.
- Keep mechanism headings after the big picture. Add the required `Worked example`, `Try it yourself`, `Common mistakes`, `When not to use it`, `Remember`, `Next`, and `Sources` in order. Every exercise ends with `# Try it:`. Avoid duplicate or placeholder examples.
- Add real, distinct captions; PenFlow boxes need meaningful titles and body lines. No ASCII flows, fake code fences, copied captions, or title-only boxes.
- Add all routes with SVG drawings to `tests/notebook-label-overlap.spec.ts`. Ensure visible labels are sentence case and at least 14 px; fix genuine clipping/overlaps without weakening the guard.
- Capture two representative pages at 1440 and 375 px in light and dark, full page, in `docs/evidence/rollout/ml-2/`. Verify readiness, console/page errors, and horizontal overflow. Run the three-viewport overlap guard for all eight SVG routes.
- Append the page scorecard, checks, screenshot paths, Pyodide outputs, and limitations to `docs/evidence/rollout/PROGRESS.md`.

## Verification and commit

Run `npm run check:notebook`, `npm run check:math`, `npm run check:mdx`, `npm run check:links`, and `npm run typecheck`; run full `npx vitest run` and browser work under `flock /tmp/nm-heavy.lock`, waiting if busy. Do not build unless `free -g` reports at least 5 GiB available; if so, hold the lock and use `NODE_OPTIONS="--max-old-space-size=6144"`.

Codex reviews and commits after verification. Do not commit or push from agy.

## Agy handoff result

The requested CLI invocation failed before editing: `error: unknown agent "Antigravity" (no custom agents are available)`. The user explicitly authorized Codex to implement if agy fails; Codex is taking over.
