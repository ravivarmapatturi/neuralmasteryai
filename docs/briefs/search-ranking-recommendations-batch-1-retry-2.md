# Follow-up Brief: Search, Ranking & Recommendations — Batch 1 Retry 2

The prior two agy launches left no changes or output. A detached `sleep` process also terminated when its `exec_command` shell exited, confirming that the command runner cleans up orphaned background processes. Preserve the agy process by keeping its launcher shell session open until the agy PID exits.

## Exact remaining work

Execute `docs/briefs/search-ranking-recommendations-batch-1.md` in full. Implement every allowed-file change, content requirement, visual, check, and review step listed there. Treat that file as the complete implementation specification. If it contains an unclear or incorrect instruction, stop and ask under this brief's `## Report from agy` section.

Append your completed implementation report under `## Report from agy` in this follow-up brief and the original batch-1 brief. Include the exact commands and their outputs, commit hashes, visual evidence paths, and anything that remains incomplete. Commit the reports and tracker update. Do not push.

## Report from agy

### Summary of Work Completed
Executed Batch 1 in full according to `docs/briefs/search-ranking-recommendations-batch-1.md` and `docs/plans/search-ranking-recommendations-review.md`:
1. Created `src/content/docs/search-ranking-recommendations/_category_.json` with position 7.15 and index metadata.
2. Implemented `overview.mdx`:
   - Answers how search and recommendation engines reduce millions of catalog items to an ordered top-k list.
   - Clarifies the fundamental difference between candidate generation (maximizing recall at scale) and ranking (maximizing precision over small sets) with a PredictFirst active recall challenge.
   - Illustrates the unified 5-stage linear funnel: Retrieval -> Hard Filtering -> Ranking -> Re-Ranking -> Serving.
   - Includes interactive visual `SearchRecommendationPipelineDiagram.tsx` tracing Candidate H1 (Noise-Cancelling Headphones).
   - Cross-links to existing Learning-to-Rank, Recommender Systems, RAG, Bandits, and Case Studies pages.
   - Includes When Not to Use It, Remember table, and primary source citations.
3. Implemented `text-search-bm25.mdx`:
   - Builds from tokenization, normalization, inverted index and posting lists to Boolean retrieval, TF-IDF limits, and Robertson BM25.
   - Derives the Robertson-Zaragoza / Lucene smoothed IDF formula: $\ln(1 + \frac{N - \text{df} + 0.5}{\text{df} + 0.5})$ and BM25 scoring with $k_1$ term-frequency saturation and $b$ length normalization.
   - Uses an illustrative 4-document toy corpus ($N=4$, $\text{avgdl}=4.0$) and query `"search ranking"` matching all equations, tables, interactive visual, and runnable code to 4 decimal places (D1: 1.1694, D2: 1.3574, D3: 0.3567, D4: 0.0000 at $k_1=1.2, b=0.75$).
   - Includes interactive explorer `Bm25ScoringExplorer.tsx` with live $k_1$ and $b$ sliders, document score bars, and term breakdowns.
   - Includes 2 browser-verified Python snippets in `<RunnableCode>` (pure BM25 calculation and Inverted Index with postings lookup), both containing `# Try it:` instructions.
4. Implemented `ranking-evaluation-metrics.mdx`:
   - Explains order-aware position discounting vs set-based unranked metrics.
   - Features a 5-item graded relevance toy list (A: 3, B: 2, C: 1, D: 0, E: 0) with total relevant $R_{\text{total}}=3$.
   - Proves mathematically and interactively that set metrics (Precision@3=0.6667, Recall@3=0.6667, HitRate@3=1.0) remain identical between Order 1 `[A, D, B, C, E]` and Order 2 `[D, A, B, C, E]`, while rank-aware metrics drop significantly (MRR: 1.0 -> 0.5, AP@3: 0.5556 -> 0.3889, NDCG@3: 0.9049 -> 0.6299).
   - Details DCG/NDCG gain conventions (exponential $2^g - 1$ vs linear $g$) and recommendation operational proxies (catalog coverage, intra-list diversity, novelty bits, serendipity ratio).
   - Explains offline held-out evaluation vs online A/B testing, team-draft interleaving, position bias, and the CTR Goodhart trap.
   - Includes interactive calculator `RankingMetricsExplorer.tsx` with presets, cutoff $k$ selector, DCG gain toggle, and accessible up/down reordering.
   - Includes 2 browser-verified Python snippets in `<RunnableCode>`.
5. Created pure calculation libraries and tests:
   - Extended `src/viz/lib/bm25.ts` with smoothed IDF, length normalization, term score, and corpus score while preserving all existing APIs.
   - Created `src/viz/lib/rankingMetrics.ts` with `precisionAtK`, `recallAtK`, `hitRateAtK`, `reciprocalRank`, `averagePrecisionAtK`, `dcgAtK`, `idcgAtK`, `ndcgAtK`, `catalogCoverage`, `intraListDiversity`, and `noveltyProxy`.
   - Added unit tests in `src/viz/lib/bm25.test.ts` and `src/viz/lib/rankingMetrics.test.ts`.
6. Updated `src/data/sectionMeta.ts`:
   - Added `search-ranking-recommendations` to the Models subsection list with landing `/docs/search-ranking-recommendations/overview`.
   - Incremented Models `pageCount` by 3 (from 83 to 86).
7. Regenerated page metadata via `node scripts/generate-page-meta.mjs` (wrote 1981 pages, 44 categories).

### Exact Verification Commands & Outputs
All heavy commands executed through `flock /tmp/nm-heavy.lock` sequentially:

1. Tracker validation:
   - Command: `npm run check:tracker`
   - Exit code: 0
   - Output: `check-agent-tracker: AGENT_TRACKER.md is valid, structured, and properly maintained.`

2. MDX Compilation Check:
   - Command: `flock /tmp/nm-heavy.lock npm run check:mdx`
   - Exit code: 0
   - Output: `check-mdx-compile: 2009 files, 0 failed.`

3. Link and Anchor Integrity:
   - Command: `flock /tmp/nm-heavy.lock npm run check:links`
   - Exit code: 0
   - Output: `check-internal-links: scanned 1981 MDX file(s), found 2137 valid route(s). check-internal-links: no broken internal prose links found. check-anchor-links: no broken anchor links found.`

4. Typecheck:
   - Command: `flock /tmp/nm-heavy.lock npm run typecheck`
   - Exit code: 0
   - Output: `tsc -b` (clean exit, 0 errors across entire workspace).

5. Focused Unit Tests:
   - Command: `flock /tmp/nm-heavy.lock npx vitest run src/viz/lib/bm25.test.ts src/viz/lib/rankingMetrics.test.ts src/data/sectionMeta.test.ts`
   - Exit code: 0
   - Output: `Test Files 3 passed (3), Tests 42 passed (42)` (bm25: 14/14, rankingMetrics: 18/18, sectionMeta: 10/10).

6. Banned-Phrase Grep:
   - Command: `grep -inE "delve|deep dive|unleash|unlock|harness the power|game.?changer|revolutioniz|cutting.edge|seamless|in today's|it's (important|worth) not|in conclusion|tapestry|testament|elevate|empower|supercharg|effortless|premier|world.class|ultimate guide|let's dive" src/content/docs/search-ranking-recommendations/*.mdx src/viz/diagrams/SearchRecommendationPipelineDiagram.tsx src/viz/diagrams/Bm25ScoringExplorer.tsx src/viz/diagrams/RankingMetricsExplorer.tsx src/viz/lib/bm25.ts src/viz/lib/rankingMetrics.ts`
   - Exit code: 1 (0 matches found, clean pass).

7. In-Browser Visual Verification & Pyodide Execution:
   - Verified on local dev server across 3 routes:
     - `/docs/search-ranking-recommendations/overview`
     - `/docs/search-ranking-recommendations/text-search-bm25`
     - `/docs/search-ranking-recommendations/ranking-evaluation-metrics`
   - Tested at 1200px (Desktop) and 375px (Mobile) in both light and dark modes.
   - Mobile 375px scrollWidth checked: exactly 375px (0 horizontal overflow).
   - Real browser Pyodide execution verified for all 4 `<RunnableCode>` blocks:
     - `text-search-bm25` Snippet 1 (BM25 calculation): Output `BM25 Score: 1.1694`, `1.3574`, `0.3567`, `0.0` (zero tracebacks).
     - `text-search-bm25` Snippet 2 (Inverted index): Output `[(D2, 1.3574), (D1, 1.1694), (D3, 0.3567)]` (zero tracebacks).
     - `ranking-evaluation-metrics` Snippet 1 (Ranking metrics): Output Order 1 `P@3: 0.6667, R@3: 0.6667, HitRate: 1.0, MRR: 1.0, AP@3: 0.5556, DCG@3: 8.5, NDCG@3: 0.9049`; Order 2 `MRR: 0.5, AP@3: 0.3889, NDCG@3: 0.6299` (zero tracebacks).
     - `ranking-evaluation-metrics` Snippet 2 (Recommendation operational proxies): Output `diversity_ratio: 1.0, mean_novelty_bits: 3.18, serendipity_ratio: 0.6667` (zero tracebacks).

### Visual Evidence Paths
Captured 12 screenshot contact sheets under `docs/evidence/search-ranking-recommendations/batch-1/`:
- `overview-light-desktop.png`
- `overview-dark-desktop.png`
- `overview-light-mobile.png`
- `overview-dark-mobile.png`
- `text-search-bm25-light-desktop.png`
- `text-search-bm25-dark-desktop.png`
- `text-search-bm25-light-mobile.png`
- `text-search-bm25-dark-mobile.png`
- `ranking-evaluation-metrics-light-desktop.png`
- `ranking-evaluation-metrics-dark-desktop.png`
- `ranking-evaluation-metrics-light-mobile.png`
- `ranking-evaluation-metrics-dark-mobile.png`

### Commits
- `9b655d8e` — `feat(viz): implement BM25 scoring and ranking evaluation pure calculations with tests`
- `82a4cda2` — `feat(viz): add pipeline, BM25 scoring explorer, and ranking metrics diagrams`
- `fe887f81` — `feat(docs): add search-ranking-recommendations overview, BM25, and ranking metrics chapters`
- `83f6cc0b` — `docs(evidence): capture 1200px and 375px light and dark screenshots for batch 1 diagrams`

### Limitations & Questions
- Full static production build (`npm run build`) was omitted locally per AGENTS.md 8 GB RAM rule (available system memory 3.0 GB < 5 GB threshold) to avoid out-of-memory process aborts; CI will execute the full static build and Pagefind index.
- No questions or blockers encountered; all requirements executed strictly per specification.
