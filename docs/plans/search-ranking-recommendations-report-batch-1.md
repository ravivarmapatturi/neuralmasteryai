# Report: Search, Ranking & Recommendations — Batch 1

Status: ready for Claude's final review

## Commits (oldest first)

- `3c9e4bf3` plan
- `234d9900` Codex review, batch 1 brief and tracker registration
- `9b655d8e` BM25/ranking metric calculation functions and tests
- `82a4cda2` three interactive diagrams
- `fe887f81` overview, BM25 and evaluation metrics chapters
- `83f6cc0b` initial screenshot evidence
- `295ce09d` batch-1 review-fix brief
- `0964026f` Learn section position
- `7c6e991e` metric formula and naming corrections
- `0496fcca` diagram interaction and AP edge-case tests
- `a20a6440` overview claim audit and substantive expansion
- `72b23cec` BM25 parameter qualification and sources
- `df4cfa28` evaluation formula, judgment policy and terminology corrections
- `6d399844` recaptured screenshots with loaded metrics calculator
- `1ebd88a3` fix-1 report and tracker update
- `96421f10` follow-up visual clarification brief
- `98b29ab9` pipeline figure illustrative labels
- `94f389f0` recaptured overview screenshots
- `d09699c6` fix-2 report and tracker update
- This report commit

## What was built

- Three Learn pages: pipeline overview, text search and BM25, and ranking evaluation metrics.
- Interactive pipeline, BM25 scoring, and ranking metric explorers, backed by pure calculation helpers.
- Learn navigation metadata placing the section adjacent to Machine Learning.
- Primary/official technical sources on all three pages and screenshot evidence for 1200px/375px light/dark views.

## Review and corrections

Codex reviewed all three pages, calculation helpers, generated metadata, section order, and diagrams. Review found unsupported benchmark-like figures, an AP@k denominator mismatch, ambiguous judgment and edge-case behavior, diversity/serendipity naming mismatches, a wrong next-page link, insufficient overview depth/sources, missing diagram interaction tests, and unloaded metrics screenshots. Fix 1 addressed those items. A second review found the overview diagram still presented stage numbers like measured benchmarks; fix 2 clearly labeled all stage counts, latencies, scores, and lifecycle values as illustrative. The updated label is visible in desktop and mobile screenshots in both themes.

## Checks run by Codex

- `flock /tmp/nm-heavy.lock npm run check:mdx` → pass; 2,009 MDX files, 0 failures.
- `flock /tmp/nm-heavy.lock npm run check:links` → pass; 1,981 MDX files, 2,137 routes, no broken prose or anchor links. The checker notes one pre-existing approximate inline-math heading ID in Attention & Transformers.
- `flock /tmp/nm-heavy.lock npm run typecheck` → pass; `tsc -b` exited cleanly.
- `flock /tmp/nm-heavy.lock npx vitest run src/viz/lib/bm25.test.ts src/viz/lib/rankingMetrics.test.ts src/data/sectionMeta.test.ts src/viz/diagrams/SearchRecommendationPipelineDiagram.test.tsx src/viz/diagrams/Bm25ScoringExplorer.test.tsx src/viz/diagrams/RankingMetricsExplorer.test.tsx` → pass; 6 files, 56 tests.
- `node scripts/check-agent-tracker.mjs` → pass.
- Writing-voice banned phrase scan → 0 matches.
- `git diff --check` → pass.

## Screenshot evidence

| Page | Light desktop | Dark desktop | Light mobile | Dark mobile |
|---|---|---|---|---|
| Overview | [PNG](../evidence/search-ranking-recommendations/batch-1/overview-light-desktop.png) | [PNG](../evidence/search-ranking-recommendations/batch-1/overview-dark-desktop.png) | [PNG](../evidence/search-ranking-recommendations/batch-1/overview-light-mobile.png) | [PNG](../evidence/search-ranking-recommendations/batch-1/overview-dark-mobile.png) |
| Text search & BM25 | [PNG](../evidence/search-ranking-recommendations/batch-1/text-search-bm25-light-desktop.png) | [PNG](../evidence/search-ranking-recommendations/batch-1/text-search-bm25-dark-desktop.png) | [PNG](../evidence/search-ranking-recommendations/batch-1/text-search-bm25-light-mobile.png) | [PNG](../evidence/search-ranking-recommendations/batch-1/text-search-bm25-dark-mobile.png) |
| Ranking metrics | [PNG](../evidence/search-ranking-recommendations/batch-1/ranking-evaluation-metrics-light-desktop.png) | [PNG](../evidence/search-ranking-recommendations/batch-1/ranking-evaluation-metrics-dark-desktop.png) | [PNG](../evidence/search-ranking-recommendations/batch-1/ranking-evaluation-metrics-light-mobile.png) | [PNG](../evidence/search-ranking-recommendations/batch-1/ranking-evaluation-metrics-dark-mobile.png) |

## Not verified / risks

- Static production build was not run. Available RAM was 0 GiB at independent review time, below the repository's 5 GiB minimum; the build remains for CI.
- The full Vitest suite and full smoke suite were not part of this batch's required focused verification.
- No push or merge was performed. The branch is ready for Claude's final review.

## Decisions Claude must take

None.
