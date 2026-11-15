# Batch 3 verification and handoff fix

## Objective

Resume `search-ranking-recommendations-batch-3.md` after agy exited during verification; finish all missing acceptance checks, inspect scope/evidence, and append the complete report to the original brief. Implementation commits already exist: `3ef7b705` and `c9407574`.

## Work remaining

1. Inspect `scripts/verify-batch-3.mjs` and `scripts/debug-route.mjs`; neither is in the allowed batch-3 file list. They are untracked. Remove both after extracting any useful documented verification data; do not add scripts to the repository.
2. Check `docs/evidence/search-ranking-recommendations/batch-3/`. Currently only four PNGs exist (three desktop light, one recommendation-foundations mobile). Complete the required 12 captures (3 routes × 2 viewports × 2 themes), verify actual H1 and visual rendered, no loading/overlay, and mobile overflow. Inspect every image. Use an ephemeral script only under `/tmp` if needed; do not commit it.
3. Check previous agy log `/tmp/agy-search-ranking-recommendations-batch-3.log` for the interrupted typecheck, MDX/links, tests and browser work. Rerun anything without an observed exit code 0. Full Vitest must complete. Use one heavy command at a time through `flock /tmp/nm-heavy.lock`; build only if `free -g` shows >=5 GiB available.
4. Review all changed code/content against batch-3 brief, verify exact worked-example matches across prose/visual/Python, primary sources, writing-voice, routes and file scope. Fix real defects with a follow-up fix brief if necessary; stop and document any scope mismatch.
5. Complete the `## Report from agy` in `docs/briefs/search-ranking-recommendations-batch-3.md` with exact commands/results and commit hashes. Commit only allowed task files and report. Never push.

## Allowed files

- `AGENT_TRACKER.md`
- This fix brief and original batch-3 brief
- Batch-3 three chapter MDX files, visual source/tests, helpers/tests, generated metadata/section metadata if required
- `docs/evidence/search-ranking-recommendations/batch-3/*.png`
- Delete the two untracked diagnostic scripts named above; do not commit them

No unrelated files.

## Verification

Use `flock /tmp/nm-heavy.lock` for check:mdx, links, typecheck, focused and full vitest, browser/dev server, Pagefind/build if attempted. Check tracker and diff hygiene. Build only above memory threshold. Record exact outcomes. No push.

## Report from agy
