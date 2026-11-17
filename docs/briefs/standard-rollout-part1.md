# Agy brief: standard rollout Part 1 coin celebration

Implement only Part 1 of `docs/plans/standard-rollout-brief.md` in this worktree. Do not start page batches.

## Required behavior

Replace the Mark as understood reward toast/confetti with a gold coin showing “+10” that flips in 3D (`rotateY`, about 900 ms) in the screen center, shows a short sparkle ring, then shrinks and travels to the XP/streak counter in the navbar, which pulses once. Do not cover page text with confetti. Under `prefers-reduced-motion`, do not flip or fly; show a calm fading “+10” badge. Use handwritten font, standard pen colors, and text at least 14 px. Preserve reward semantics: only the first understood transition awards +10; toggling off/re-marking must not duplicate.

## Required checks and commit

Add/update a unit test and a Playwright check proving the old reward toast is absent and the coin appears. Run focused unit tests and that browser check under `flock /tmp/nm-heavy.lock`; record exact commands/results in this brief under “Report from agy”. Run typecheck. Do not run a build when available RAM is below 5 GiB. Commit this part locally with a conventional message ending in `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Do not push.

## Report from Codex

- `npm run typecheck` — passed.
- `npx vitest run` — passed twice, 231 files and 1,172 tests each run.
- `flock /tmp/nm-heavy.lock -c 'TEST_PORT=4173 PLAYWRIGHT_SERVER_CMD="node node_modules/vite/bin/vite.js --host localhost --port 4173" npx playwright test tests/smoke.spec.ts tests/notebook-label-overlap.spec.ts --workers=1'` — coin celebration and reduced-motion coin tests passed. Overall run: 13 passed, 4 failed. The unrelated failures were three SVG checks whose dev article remained at `Loading…` and one deep-link check that requires prerendered `dist/` output.
- Production build — skipped because `free -g` reported 3 GiB available, below the repository's 5 GiB minimum.
- Screenshots/build evidence — not applicable to the coin component; browser coin assertions passed. The page rollout screenshot set is still in progress.
