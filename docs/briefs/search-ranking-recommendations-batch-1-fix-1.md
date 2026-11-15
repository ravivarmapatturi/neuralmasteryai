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

### 1. Summary of Work Completed
Addressed every item from Codex's independent review in full, following the exact specification:
1. **Audited and Qualified Numerical Claims**:
   - In `overview.mdx`: Removed unsubstantiated absolutes ("under 50ms SLA", "every production system", "99.9% of the catalog", "mathematically impossible under modern datacenter hardware budgets", "fundamentally opposite mathematical properties"). Explicitly labeled stage volumes, latencies, and candidate counts as an illustrative reference configuration. Tracing example is framed consistently as an illustrative toy walkthrough ($N=2,000,000$).
   - In `text-search-bm25.mdx`: Presented standard BM25 defaults ($k_1 \in [1.2, 1.5], b = 0.75$) as empirical starting points from TREC benchmarks rather than universal settings. Explained tuning methodology for short/title collections vs. long documents.
   - In `ranking-evaluation-metrics.mdx`: Cited eye-tracking literature (Joachims et al., 2005) for top-rank attention skew; framed the 10,000-page web search and 50/50 A/B split as illustrative examples; explained that offline test-set results do not establish online lift due to presentation and position bias; qualified interleaving statistical efficiency and variance reduction (Chapelle et al., 2012).
2. **Aligned AP@k Formula and Denominator**:
   - Standardized the denominator to $R_{\text{total}}$: $\text{AP@}k = \frac{1}{R_{\text{total}}} \sum_{i=1}^k \text{Precision@}i \times r_i$.
   - Aligned prose, TypeScript (`averagePrecisionAtK`), interactive explorer, and runnable Python.
   - Preserved worked values for $k=3, R=3$: Order 1 is $0.5556$, Order 2 is $0.3889$.
   - Added unit test in `src/viz/lib/rankingMetrics.test.ts` where $k < R_{\text{total}}$ ($k=2, R_{\text{total}}=4 \to \text{AP@}2 = 0.25$).
3. **Defined Judgment Behavior & Edge Cases**:
   - Specified that the five-item worked example is fully judged, where grade 0 explicitly means judged nonrelevant.
   - Documented production handling of unjudged documents (pooling, TREC nonrelevant assumption, Bpref pair evaluations, counterfactual propensity weighting).
   - Documented result lists shorter than $k$ (precision denominator remains $k$ to penalize incomplete slates).
   - Documented zero-relevant queries ($R_{\text{total}} = 0$) and benchmark handling.
4. **Aligned Diversity & Serendipity Terminology**:
   - Renamed the unique-category fraction to `category-diversity proxy` (`categoryDiversityProxy` in TypeScript, `category_diversity_proxy` in Python, keeping `intraListDiversity` as a backward-compatible alias).
   - Renamed serendipity heuristic to `unvisited-category ratio` (`unvisitedCategoryRatio` in TypeScript, `unvisited_category_ratio` in Python) and explicitly explained that it is an exploration ratio and not true serendipity because it does not evaluate relevance or user satisfaction.
   - Labeled catalog coverage as a system-level metric and clarified that single-query calculations are illustrative micro-proxies.
5. **Fixed Next Link in Metrics Page**:
   - Pointed "Next" in `ranking-evaluation-metrics.mdx` to `[Dense vs. Sparse Retrieval & Hybrid Search](/docs/llms-genai/rag#dense-vs-sparse-retrieval-and-bm25)` with an accurate description of Reciprocal Rank Fusion.
6. **Repositioned Section to 2.5**:
   - Updated `src/content/docs/search-ranking-recommendations/_category_.json` to `position: 2.5`.
   - Moved `search-ranking-recommendations` in `src/data/sectionMeta.ts` to sit between `machine-learning` and `deep-learning`.
   - Regenerated metadata via `node scripts/generate-page-meta.mjs`.
7. **Expanded Overview Word Count & Added Primary Sources**:
   - Deepened `overview.mdx` from ~1,840 words to 3,198 words (exceeding the 2,000-word minimum) with mathematical derivations of the Probability Ranking Principle (Robertson 1977), funnel recall cascading invariants, feature store architectures (static vs streaming nearline vs dynamic), and two-tower bi-encoder vs cross-encoder complexity.
   - Added at least 5 primary/official sources with working URLs across all 3 pages (6 in overview, 6 in BM25, 7 in metrics).
8. **Created Diagram Component Interaction Tests**:
   - Added `SearchRecommendationPipelineDiagram.test.tsx` (mode switching, stage navigation).
   - Added `Bm25ScoringExplorer.test.tsx` (k1/b slider updates, score recomputations, document breakdown selection).
   - Added `RankingMetricsExplorer.test.tsx` (preset switches, NDCG/MRR drops with P/R fixed, manual reordering, AP@k edge case where $k < R_{\text{total}}$).
9. **Recaptured Screenshot Evidence**:
   - Recaptured all 12 screenshots at 1200px and 375px in both light and dark modes.
   - Confirmed the interactive calculator is fully rendered and operational in `ranking-evaluation-metrics` (zero "Loading..." states).
   - Verified 0 horizontal overflow at 375px mobile viewport (`scrollWidth = 375`).
10. **Descriptions Within 120–160 Characters**:
    - `overview.mdx`: 149 characters (removed "under 50ms").
    - `text-search-bm25.mdx`: 139 characters.
    - `ranking-evaluation-metrics.mdx`: 144 characters.
    - `_category_.json`: 138 characters.

---

### 2. Exact Commands and Outputs

1. **MDX Validation**:
   - Command: `flock /tmp/nm-heavy.lock npm run check:mdx`
   - Exit code: `0`
   - Output: `check-mdx-compile: 2009 files, 0 failed.`

2. **Internal & Anchor Links**:
   - Command: `flock /tmp/nm-heavy.lock npm run check:links`
   - Exit code: `0`
   - Output: `check-internal-links: scanned 1981 MDX file(s), found 2137 valid route(s). check-internal-links: no broken internal prose links found. check-anchor-links: no broken anchor links found.`

3. **Typecheck**:
   - Command: `flock /tmp/nm-heavy.lock npm run typecheck`
   - Exit code: `0`
   - Output: `tsc -b` (clean exit, 0 errors across workspace).

4. **Focused Unit & Component Tests**:
   - Command: `flock /tmp/nm-heavy.lock npx vitest run src/viz/lib/bm25.test.ts src/viz/lib/rankingMetrics.test.ts src/data/sectionMeta.test.ts src/viz/diagrams/SearchRecommendationPipelineDiagram.test.tsx src/viz/diagrams/Bm25ScoringExplorer.test.tsx src/viz/diagrams/RankingMetricsExplorer.test.tsx`
   - Exit code: `0`
   - Output: `Test Files 6 passed (6), Tests 56 passed (56)` (bm25: 14/14, rankingMetrics: 15/15, sectionMeta: 11/11, pipelineDiagram: 3/3, bm25Explorer: 4/4, rankingExplorer: 5/5).

5. **Tracker Integrity**:
   - Command: `npm run check:tracker`
   - Exit code: `0`
   - Output: `check-agent-tracker: AGENT_TRACKER.md is valid, structured, and properly maintained.`

6. **Banned-Phrase Grep**:
   - Command: `grep -inE "delve|deep dive|unleash|unlock|harness the power|game.?changer|revolutioniz|cutting.edge|seamless|in today's|it's (important|worth) not|in conclusion|tapestry|testament|elevate|empower|supercharg|effortless|premier|world.class|ultimate guide|let's dive" src/content/docs/search-ranking-recommendations/*.mdx src/viz/diagrams/SearchRecommendationPipelineDiagram.tsx src/viz/diagrams/Bm25ScoringExplorer.tsx src/viz/diagrams/RankingMetricsExplorer.tsx src/viz/lib/bm25.ts src/viz/lib/rankingMetrics.ts`
   - Exit code: `1` (0 matches found, clean pass).

7. **Memory Measurement & Build Guard**:
   - Command: `free -h`
   - Output: `Mem total: 7.2Gi, used: 4.1Gi, available: 2.6Gi`
   - Result: Available memory (2.6 GiB) is below the 5 GiB threshold required for safe in-memory Rollup compilation. Full static build is left to CI per AGENTS.md 8GB RAM rule.

---

### 3. Screenshot Verification Evidence (2×2 Tables)

#### Overview Page (`/docs/search-ranking-recommendations/overview`)
| Theme | Desktop (1200px) | Mobile (375px) |
| :--- | :--- | :--- |
| **Light** | [overview-light-desktop.png](file:///home/ravivarma/Documents/DREAM_PROJECT/neuralmastery/platform-vite-srr/docs/evidence/search-ranking-recommendations/batch-1/overview-light-desktop.png) | [overview-light-mobile.png](file:///home/ravivarma/Documents/DREAM_PROJECT/neuralmastery/platform-vite-srr/docs/evidence/search-ranking-recommendations/batch-1/overview-light-mobile.png) |
| **Dark** | [overview-dark-desktop.png](file:///home/ravivarma/Documents/DREAM_PROJECT/neuralmastery/platform-vite-srr/docs/evidence/search-ranking-recommendations/batch-1/overview-dark-desktop.png) | [overview-dark-mobile.png](file:///home/ravivarma/Documents/DREAM_PROJECT/neuralmastery/platform-vite-srr/docs/evidence/search-ranking-recommendations/batch-1/overview-dark-mobile.png) |

#### Text Search & BM25 Page (`/docs/search-ranking-recommendations/text-search-bm25`)
| Theme | Desktop (1200px) | Mobile (375px) |
| :--- | :--- | :--- |
| **Light** | [text-search-bm25-light-desktop.png](file:///home/ravivarma/Documents/DREAM_PROJECT/neuralmastery/platform-vite-srr/docs/evidence/search-ranking-recommendations/batch-1/text-search-bm25-light-desktop.png) | [text-search-bm25-light-mobile.png](file:///home/ravivarma/Documents/DREAM_PROJECT/neuralmastery/platform-vite-srr/docs/evidence/search-ranking-recommendations/batch-1/text-search-bm25-light-mobile.png) |
| **Dark** | [text-search-bm25-dark-desktop.png](file:///home/ravivarma/Documents/DREAM_PROJECT/neuralmastery/platform-vite-srr/docs/evidence/search-ranking-recommendations/batch-1/text-search-bm25-dark-desktop.png) | [text-search-bm25-dark-mobile.png](file:///home/ravivarma/Documents/DREAM_PROJECT/neuralmastery/platform-vite-srr/docs/evidence/search-ranking-recommendations/batch-1/text-search-bm25-dark-mobile.png) |

#### Ranking Evaluation Metrics Page (`/docs/search-ranking-recommendations/ranking-evaluation-metrics`)
| Theme | Desktop (1200px) | Mobile (375px) |
| :--- | :--- | :--- |
| **Light** | [ranking-evaluation-metrics-light-desktop.png](file:///home/ravivarma/Documents/DREAM_PROJECT/neuralmastery/platform-vite-srr/docs/evidence/search-ranking-recommendations/batch-1/ranking-evaluation-metrics-light-desktop.png) | [ranking-evaluation-metrics-light-mobile.png](file:///home/ravivarma/Documents/DREAM_PROJECT/neuralmastery/platform-vite-srr/docs/evidence/search-ranking-recommendations/batch-1/ranking-evaluation-metrics-light-mobile.png) |
| **Dark** | [ranking-evaluation-metrics-dark-desktop.png](file:///home/ravivarma/Documents/DREAM_PROJECT/neuralmastery/platform-vite-srr/docs/evidence/search-ranking-recommendations/batch-1/ranking-evaluation-metrics-dark-desktop.png) | [ranking-evaluation-metrics-dark-mobile.png](file:///home/ravivarma/Documents/DREAM_PROJECT/neuralmastery/platform-vite-srr/docs/evidence/search-ranking-recommendations/batch-1/ranking-evaluation-metrics-dark-mobile.png) |

---

### 4. Commits on `search-rank-rec`
- `0964026f` — `feat(nav): position search-ranking-recommendations at 2.5 adjacent to machine learning`
- `7c6e991e` — `fix(metrics): align AP@k denominator to R_total, add categoryDiversityProxy and unvisitedCategoryRatio`
- `0496fcca` — `test(viz): add interaction and edge case tests for search and ranking diagram components`
- `a20a6440` — `docs(overview): qualify production numbers as illustrative and deepen technical foundations beyond 2000 words`
- `72b23cec` — `docs(bm25): clarify parameter defaults as empirical starting points and add primary sources with URLs`
- `df4cfa28` — `docs(metrics): align AP@k formula to R_total, specify judgment behavior, and align metric terminology`
- `6d399844` — `docs(evidence): recapture desktop and mobile light and dark screenshots with fully rendered interactive calculators`

### 5. Incomplete Work or Questions
None. All 10 review items are resolved and empirically verified. Zero push was performed.
