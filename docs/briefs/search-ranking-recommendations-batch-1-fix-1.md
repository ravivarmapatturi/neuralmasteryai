# Batch 1 review fixes — search, ranking, recommendations

## Objective

Correct the specific content, formula, visual-test, navigation and evidence issues found in Codex's independent review of batch 1. Keep changes within the allowed files below. Do not push.

## Required fixes

1. **Remove or properly qualify unsupported production numbers.** Audit every numerical claim in all three pages and visuals. In `overview.mdx`, this includes the latency, catalog-size, candidate-count, feature-count, dimensionality, reliability and capacity numbers. Retain only calculations and numbers explicitly framed as a worked toy example; mark the complete pipeline example as illustrative consistently in prose, table and diagram. Remove claims that retrieval/ranking are opposites, that something is mathematically impossible, and absolutes such as “every production system”. In `ranking-evaluation-metrics.mdx`, remove or source claims about click concentration, hit-rate convention, MRR primacy, exponential gain as standard web search, unobserved-corpus percentages, causal CTR windows, A/B durations, interleaving traffic savings and variance elimination. Label the 10,000-page and 50/50 examples as illustrative. Explain that offline test-set results do not establish online lift. Audit every numeric statement on BM25 too; present defaults as starting points, not universal settings.
2. **Align AP@k.** Page prose currently divides by `min(k, R_total)` while `averagePrecisionAtK` divides by `R_total`. Pick the latter denominator, align prose, TypeScript, explorer and Python example, and add a test where `k < R_total`. Preserve the existing k=3 / R=3 worked values.
3. **Define judgment behavior.** Say the five-item metric example is fully judged and grade 0 means judged nonrelevant. Explain production handling of unjudged items, result lists shorter than k, and queries with no relevant items.
4. **Align diversity and serendipity names with implementations.** Name the unique-category fraction a category-diversity proxy and use that definition consistently in prose, TypeScript and Python. The existing serendipity implementation counts unvisited categories but does not check relevance: either implement a clearly defined proxy that requires both held-out relevance and novelty, with a fixture, or rename it `unvisited-category ratio` and say it is not serendipity. Keep catalog coverage labeled system-level and explain that the single-query explorer is only a proxy.
5. Fix the “Next: Semantic & Hybrid Search” link in `ranking-evaluation-metrics.mdx`: point to the existing dense/sparse retrieval coverage (RAG page) and describe the destination accurately.
6. Move the new section in `src/data/sectionMeta.ts` to position `2.5`, adjacent to Machine Learning and before Deep Learning, then run `node scripts/generate-page-meta.mjs` (through the heavy-command lock).
7. `overview.mdx` is below the Learn skill's 2,000-word minimum. Add substantive explanation to reach the minimum; no padding. Add at least five relevant primary or official technical sources to each of the three pages with working URLs.
8. Add focused component render/interaction tests for all three diagrams using the established testing pattern and mocked light `useVizTokens()` values: pipeline mode/stage changes; BM25 `b`/`k1` changes the score; metrics reorder/preset changes MRR/NDCG while precision/recall stay fixed. Include the AP@k edge case.
9. Correct screenshot evidence: the metrics desktop images currently show “Loading...” and no calculator. Recapture only after the page and calculator render. Verify each route at 1200px and 375px in light and dark themes, check no horizontal overflow, and exercise controls and keyboard. Provide contact sheets for all pages if available; otherwise put a 2×2 table with four individual screenshot links per page in the final batch report. Do not claim an unloaded screenshot as verification.
10. Keep all page descriptions within 120–160 characters. Remove the unsupported sub-50ms phrase from the overview description.

## Allowed files

- `AGENT_TRACKER.md`
- This fix brief, `docs/briefs/search-ranking-recommendations-batch-1.md`, and `docs/briefs/search-ranking-recommendations-batch-1-retry-2.md` (append reports only to the last two)
- The three `src/content/docs/search-ranking-recommendations/*.mdx` pages and their `_category_.json`
- `src/data/sectionMeta.ts` and generated `src/data/pageMeta.ts`
- `src/viz/lib/rankingMetrics.ts` and `src/viz/lib/rankingMetrics.test.ts`
- The three diagram component test files under `src/viz/diagrams/` for this batch
- Existing batch-1 screenshot files under `docs/evidence/` (replace incorrect captures; keep paths stable)

Do not edit other files. If a necessary change falls outside this list, stop and ask in the report.

## Required verification

Run each heavy command only through `flock /tmp/nm-heavy.lock`, sequentially:

1. `npm run check:mdx`
2. `npm run check:links`
3. `npm run typecheck`
4. `npx vitest run src/viz/lib/bm25.test.ts src/viz/lib/rankingMetrics.test.ts src/data/sectionMeta.test.ts <the-three-new-diagram-test-files>`
5. `npm run check:tracker` and the human-facing text banned-phrase grep from `writing-voice`.
6. Build only if `free -g` reports at least 5 GiB available. If below 5 GiB, record the measurement and leave build to CI. Do not run a build, Playwright, dev server or other heavy job alongside another heavy command.

Review your own diffs against the allowed-file list. Keep commits small and on this branch. Never push.

## Report from agy
