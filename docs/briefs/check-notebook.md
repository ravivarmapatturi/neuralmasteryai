# Implementation brief: check:notebook

## Objective

Implement the guard specified in `docs/plans/check-notebook-2026-11.md`. First run report mode to audit the whole content set and save `docs/evidence/site-audit/notebook-violations.json`; do not modify existing pages or add allowlist exceptions. Add `npm run check:notebook`, changed-files CI enforcement, comprehensive rule fixtures, and `docs/plans/check-notebook-report.md`.

## Allowed files

- `AGENT_TRACKER.md`
- `docs/briefs/check-notebook.md`
- `scripts/check-notebook.mjs`
- `scripts/check-notebook.allow.json` (empty by default)
- `package.json`
- `.github/workflows/ci.yml`
- checker tests and fixtures under `tests/` (add no fixture path outside that tree)
- `docs/evidence/site-audit/notebook-violations.json`
- `docs/plans/check-notebook-report.md`

Do not touch content pages, BM25, shared styling/components, or Part A work.

## Required behavior

1. Scan Learn MDX and blog MDX. Report actionable path, line, and skill rule for all violations. Respect MDX JSX string props and treat `RunnableCode` code as executable code, not prose/fences.
2. Implement rules 1, 2, 3, 4, 5, and 9 exactly as described by the plan. Include tests for positive and negative cases, including the owner’s exact bare-fence example `Corpus Size (N) = 1,000 documents`.
3. `--report` writes the full-site JSON audit and per-page counts without failing on findings. Normal invocation checks changed MDX files from `git diff --name-only origin/main` (changed-file mode required in CI); support a documented full scan if needed.
4. Allowlist JSON exists and is empty; schema requires path, rule, and reason. Do not use exceptions to bypass findings.
5. CI adds notebook changed-file enforcement next to math check. Add a report-mode npm script if useful, but `check:notebook` must be the enforced changed-file command.
6. Write report with exact scope, totals by rule, page totals, command results, and known limitations. No claims beyond observed data.

## Verification

Sequentially run every heavy command under `flock /tmp/nm-heavy.lock`:
- `npm run check:notebook:report` (or the agreed report command)
- the focused checker unit test command
- `npm run check:notebook`
- `npm run check:tracker`

Also inspect generated report and sample representative findings. Do not run build or browser work in this task. Do not start while another agy process is active. Wait for `/tmp/nm-heavy.lock`; do not stop the video render. Commit changes on this branch. Never push.

## Acceptance

The report captures full-site findings, unit fixtures cover every implemented rule and benign counterexamples, changed-file mode passes on the current diff, CI enforces it, tracker validates, report is committed, and all listed paths are within the allowlist.

## Report from agy
