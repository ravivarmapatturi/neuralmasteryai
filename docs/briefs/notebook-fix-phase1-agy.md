# Agy implementation brief: notebook fixes, phase 1

Execute `docs/plans/notebook-fix-brief-phase1.md` exactly. The owner approved the final issue list. Do not push. Stop after the evidence report exists and is complete.

## Required reading

- `AGENTS.md` and `AGENT_TRACKER.md`
- `.agents/skills/agent-tracker/SKILL.md`
- `.agents/skills/notebook-page/SKILL.md`
- `.agents/skills/learn-page/SKILL.md`
- `.agents/skills/visualization/SKILL.md`
- `.agents/skills/writing-voice/SKILL.md`
- `.agents/skills/ship-gate/SKILL.md`
- `docs/plans/notebook-issues-2026-11.md`
- `docs/plans/notebook-fix-brief-phase1.md`

The tracker entry is already registered. Confirm it and run `npm run check:tracker` before implementation. Do not modify overlapping checker files owned by the active checker task.

## Scope

1. **Phase 1a, one global change:** provide ruled paper, a red margin line, and a “Neural Mastery · date” diary header on every Learn page and blog post in light and dark themes. Make callouts, `SimpleExplanation`/ELI5 boxes, PredictFirst choices, tables, and widget/calculator cards use irregular pen-drawn borders. Change small-caps eyebrow labels to Kalam sentence case. Ensure footnotes render at least 14px on phones. Render widget formulas with KaTeX rather than code text.
2. **Phase 1b, three pilot pages only:** `tf-idf`, `bm25`, and `recommendation-foundations` in Search & Recommendation. Resolve A1–A6 and A8–A10 exactly as specified in `docs/plans/notebook-issues-2026-11.md`. Required drawings: document arrows in vector space; cosine angle between arrows; sparse vector as boxes; “automobile repair” vs “how to fix a car” in two non-connecting columns; separate search and recommendation lanes; and a user-item matrix. Remove fake code/ASCII flow, put theory/history/citations together in one `GoDeeper`, write flat `a/b` in table cells, and use real headings.
3. **A7 conditional audit:** inspect the actual AGENTS.md fence and ASCII flow in `harness-engineering/context-and-instruction-design` and the current `context-engineering` route. Fix A7 on the current context-engineering route only if the described AGENTS.md fence/ASCII flow is present there. Record what was found and where. Do not broaden the pilot to other content pages.

Keep routes stable. Follow the existing component/token architecture and relevant skills. If an exact requirement conflicts with existing code or is unclear, stop and record the question in this brief under “Report from agy”; do not silently choose a different design.

## Required verification and evidence

- Run `npm run check:notebook`; all three pilot pages must be clean.
- Run `npm run check:math`, `npm run check:mdx`, `npm run check:links`, and `npm run typecheck`.
- Build only if `free -g` reports at least 5 GiB available. At the current 4 GiB reading, defer build and record the exact output. Do not run heavy jobs concurrently.
- Run build and every real-browser/Playwright job under `flock /tmp/nm-heavy.lock`, one at a time. Capture real page screenshots at 1440px and 375px, in light and dark, for all three pilot pages and two untouched pages showing the global look. Save them under `docs/evidence/notebook-phase1/`. Check page readiness, console errors and phone overflow; ensure screenshot files show the actual page, not overlays.
- Inspect the diff and use the writing-voice banned-phrase grep on edited human-facing content.
- Commit locally with a conventional message whose commit message ends exactly with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Do not push.
- After the local commit, write `docs/evidence/notebook-phase1/REPORT.md` with scope, changed files/features, exact commands and observed results, screenshot paths and what they verify, A7 findings, build deferral if applicable, commit SHA, and anything incomplete. Stop immediately after writing this report. Do not make a follow-up commit for the report unless the primary brief unambiguously requires it; tell Codex if the report remains uncommitted.

## Report from agy

Implementation was committed as `9bd14720`. The agy CLI then exited with a DNS resolution error before returning its final report. Codex independently reviewed the change, corrected screenshot readiness, reran the requested checks and full Vitest, and will record the final handoff in `docs/evidence/notebook-phase1/REPORT.md`.

