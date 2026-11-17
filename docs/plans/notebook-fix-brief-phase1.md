# Codex brief: notebook fixes, phase 1 (17 Nov 2026)

Owner approved fixing the final list (`docs/evidence/site-audit/final-issue-list.md`). You verify, write agy briefs, run agy, and review. Claude reviews and is the only one who pushes. Do NOT push.

Load `.agents/skills/notebook-page/SKILL.md`, `learn-page`, `visualization`, `writing-voice` first. One heavy job at a time: wrap builds/Playwright in `flock /tmp/nm-heavy.lock`.

## Phase 1a: global notebook look (sitewide, one change)
- Ruled paper + red margin line + "Neural Mastery · date" diary header on every Learn page and blog post (light and dark).
- Sketch (irregular pen) borders for all callouts, `SimpleExplanation`/ELI5 boxes, PredictFirst options, tables and widget/calculator cards. Replace small-caps eyebrow labels with Kalam sentence-case. Footnotes at least 14 px on phones.
- Widget formulas rendered with KaTeX, not code text.

## Phase 1b: pilot content on 3 pages
`tf-idf`, `bm25`, `recommendation-foundations` (Search & Recommendation): fix A1–A6, A8–A10 exactly as listed in `docs/plans/notebook-issues-2026-11.md`:
- pen SVGs: documents as arrows in vector space; cosine angle between two arrows; sparse vector as row of boxes; "automobile repair" vs "how to fix a car" two-column no-overlap drawing; search vs recommendation two lanes; user-item matrix.
- remove fake code fence and ASCII flow; plain words first, history/citations into one `GoDeeper`; flat `a/b` in table cells; real headings.
- Also fix A7 on the current context-engineering route if the AGENTS.md fence/ASCII flow exists there; report what you found.

## Gates before you stop
`npm run check:notebook` (pilot pages clean), `check:math`, `check:mdx`, `check:links`, `typecheck`, build. Real-browser screenshots at 1440 and 375, light AND dark, of the 3 pilot pages plus 2 untouched pages (to show the global look), saved under `docs/evidence/notebook-phase1/`. Commit locally with message ending `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Then STOP and write `docs/evidence/notebook-phase1/REPORT.md` (what changed, which checks passed, anything not done). Claude shows the owner before phase 2.
