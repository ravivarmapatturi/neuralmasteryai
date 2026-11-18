# Agy implementation brief — Machine Learning batch 1

## Scope

Implement the first eight Machine Learning Learn pages in sidebar order:

1. `src/content/docs/machine-learning/overview.mdx`
2. `src/content/docs/machine-learning/roadmap.mdx`
3. `src/content/docs/machine-learning/ml-workflow-fundamentals.mdx`
4. `src/content/docs/machine-learning/supervised-learning.mdx`
5. `src/content/docs/machine-learning/linear-regression.mdx`
6. `src/content/docs/machine-learning/ridge-regression.mdx`
7. `src/content/docs/machine-learning/lasso-regression.mdx`
8. `src/content/docs/machine-learning/elastic-net.mdx`

Read `docs/plans/standard-rollout-brief.md` and `docs/standards/page-standard.md` fully before editing. The brief's READ FIRST rules govern every edit.

## Required work

- Apply the exact Part 1 structure and order to technical chapters. `overview` and `roadmap` use the short landing-page structure.
- Build page-specific prose, diagrams and PenFlow flows from each page's actual content. Keep every caption and every PenFlow box title unique and meaningful; never reuse generic captions or title-only boxes.
- For pages with worked numbers, add a `Worksheet` in The big picture and carry its numbers unchanged through the worked example and runnable/copyable exercise. Recompute each number from source data/code. For conceptual pages without a numeric worked method, use an existing quantitative example rather than inventing one.
- Put every formula after its picture and plain-language explanation, with an adjacent `where` list. Preserve inbound links/anchors, technical correctness, useful existing mechanisms, and valid runnable code. Every RunnableCode example ends with `# Try it:`.
- Keep program output, logs, plans, and CLI results inside fenced `output` blocks. Never replace output with bullets. Do not remove more code fences than you add.
- Ensure widget headers are sentence case and no displayed text is below 14 px. Add routes with SVG drawings to `tests/notebook-label-overlap.spec.ts`.
- Add four-view full-page screenshots (1440 and 375, light and dark) for two representative pages in `docs/evidence/rollout/ml-1/`. Verify route readiness, no page/console errors, and no horizontal overflow. Record any unverified route or runtime issue honestly.
- Update `docs/evidence/rollout/PROGRESS.md` with the batch scorecard, checks, screenshot paths, runtime results, and any skipped gate with reason.

- The review surfaced a clipped `Update w, b` label in the existing linear-regression gradient loop; adjust that diagram to readable, keyboard-accessible labels and rerun its route check.

## Verification and commit

Run static checks: `npm run check:notebook`, `npm run check:math`, `npm run check:mdx`, `npm run check:links`, and `npm run typecheck`. Run full `npx vitest run` and required browser work only while holding `flock /tmp/nm-heavy.lock`; wait if it is busy. Do not run a production build unless `free -g` reports at least 5 GiB available, and if run, hold the same lock and use `NODE_OPTIONS="--max-old-space-size=6144"`.

Codex will independently review the diff, evidence and checks. Do not commit; Codex will make the batch commit after review. Do not push.

## Acceptance

All eight pages satisfy the applicable structure, content, visual, code, number, and source rules in the standard; static gates pass; full unit suite passes; two representative pages have verified four-view browser captures; the SVG overlap guard covers all batch pages containing SVG drawings; and the progress log accurately reports evidence and limitations.

## Agy handoff result

The requested CLI invocation failed before editing: `error: unknown agent "Antigravity" (no custom agents are available)`. The user explicitly authorized Codex to implement if agy fails; Codex is taking over.
