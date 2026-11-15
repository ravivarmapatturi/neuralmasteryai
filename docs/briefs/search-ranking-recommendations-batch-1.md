# Agy Brief: Search, Ranking & Recommendations — Batch 1

Implement batch 1 from `docs/plans/search-ranking-recommendations-2026-11.md`, following `docs/plans/search-ranking-recommendations-review.md` and the Learn, writing-voice, visual-learning, visualization, and UI-design skills. Teach from first principles; do not copy the owner sources. Make no design decisions beyond the explicit requirements below.

## Goal

Create the first three pages of the new Learn section: the shared search/recommendation pipeline, lexical search through BM25, and ranking/recommendation evaluation metrics. The reader should be able to explain retrieval versus ranking, calculate a BM25 score for a small corpus, and compare ranked lists using complementary metrics.

## Allowed files

- `AGENT_TRACKER.md` — append your completion row/update this task row and preserve all other entries.
- `docs/briefs/search-ranking-recommendations-batch-1.md` — append your report under the existing `## Report from agy` heading.
- `src/content/docs/search-ranking-recommendations/_category_.json`
- `src/content/docs/search-ranking-recommendations/overview.mdx`
- `src/content/docs/search-ranking-recommendations/text-search-bm25.mdx`
- `src/content/docs/search-ranking-recommendations/ranking-evaluation-metrics.mdx`
- `src/data/pageMeta.generated.json` — generated only by `node scripts/generate-page-meta.mjs`.
- `src/data/sectionMeta.ts` — add `search-ranking-recommendations` to the Models subsection list and increment Models `pageCount` by the three new pages. This is required because generated sidebar folders must be assigned to a learning group.
- `src/viz/diagrams/SearchRecommendationPipelineDiagram.tsx`
- `src/viz/diagrams/Bm25ScoringExplorer.tsx`
- `src/viz/diagrams/RankingMetricsExplorer.tsx`
- `src/viz/lib/bm25.ts` and `src/viz/lib/bm25.test.ts` — extend the existing helper without breaking its current API/tests; add full scoring only if the page explorer needs it.
- One focused test file for the new ranking-metrics calculation, named `src/viz/lib/rankingMetrics.test.ts`, and its implementation `src/viz/lib/rankingMetrics.ts` if the UI needs a pure calculation module.
- Visual evidence: `docs/evidence/search-ranking-recommendations/batch-1/` (screenshots/contact sheets only).

Do not change existing content pages in this batch. New pages may link to existing routes. Do not edit any file outside this list. If a required change falls outside it, stop and ask under the report heading.

## Required content

### 1. `overview.mdx`

- Answer: how do search and recommendation systems turn a large catalogue into a short ordered list?
- Name and correct the misconception that retrieval and ranking are the same operation.
- Introduce candidate generation → filtering → ranking → re-ranking/business constraints → serving as one linear pipeline. Search begins with an explicit query; recommendation can begin from a user/session context, but both need candidate generation and ordering.
- Include one labeled, interactive visual of this exact pipeline. Keep it linear; distinguish request inputs without inventing parallel stages.
- Include one small, explicitly illustrative candidate example carried consistently through prose and visual. Define candidates, ranking score and final list.
- Introduce the roadmap and link to the next batch topic preview plus the existing [Learning-to-Rank](/docs/machine-learning/learning-to-rank), [Recommender Systems](/docs/machine-learning/recommender-systems), [RAG](/docs/llms-genai/rag), [Bandits](/docs/reinforcement-learning/bandits), and [recommendation system case study](/docs/ml-system-design/case-studies#recommendation-systems) pages where relevant.
- Follow the Learn page skeleton (frontmatter, H1, one ELI5, PredictFirst before the misconception correction, topic-specific H2s, when not to use, Remember, Next, Sources). Use RunnableCode only where it teaches an actual calculation; do not pad the overview with code.

### 2. `text-search-bm25.mdx`

- Answer: how does lexical retrieval find and score documents efficiently when query wording matters?
- Build from tokenization/normalization → inverted index → Boolean matching → TF-IDF intuition → BM25, then query expansion, spelling/fuzzy matching and their trade-offs. Keep the central mechanism on BM25, not a catalog of algorithms.
- Derive one explicitly stated Robertson-style BM25 formula and IDF variant. Define `N`, `df`, `tf`, document length, average length, `k1`, `b`, query-term handling and score. Note that variants differ and defaults are starting points, not universal optima.
- Use one small toy corpus and one query for the worked table, the interactive visual, and runnable Python. Compute the term statistics and at least two document scores explicitly; outputs must match to a stated rounding precision. Label all toy values as illustrative.
- The visual must calculate the full displayed BM25 scores and expose `k1` and `b` controls. It must show the effect of term-frequency saturation and document-length normalization without conflating them. Use accessible controls, keyboard support, theme tokens, reduced-motion behavior if animated, and mobile-readable labels.
- Add standard-library Python that reproduces the same scores and a second useful `RunnableCode` exercise if it adds substance. Both snippets must have `# Try it:` instructions. Do not parse embedded Python strings. If any snippet uses `ast.parse`, `compile` or `exec`, apply `textwrap.dedent(...).strip()` first and verify it in Pyodide.
- Discuss absent terms, repeated query terms, IDF smoothing, title/body fields, long-document normalization and semantic mismatch. Link to the existing [RAG BM25 and hybrid retrieval discussion](/docs/llms-genai/rag#dense-vs-sparse-retrieval-and-bm25) and relevant databases search material without replacing its route.
- Sources must include Robertson & Zaragoza (2009) and a standard IR textbook or primary source. Every numeric claim must be computed, cited, or labeled illustrative.

### 3. `ranking-evaluation-metrics.mdx`

- Answer: how can we tell whether a ranked list helps users find relevant results without hiding what a metric ignores?
- Use a short graded relevance list and the exact same values in the prose, interactive calculator, and runnable Python. Explicitly state the gain convention for DCG/NDCG and relevance thresholds for binary metrics.
- Build a calculator where readers can reorder a small fixed set of results by keyboard-accessible controls and observe Precision@k, Recall@k, MRR, MAP, DCG/NDCG and hit rate update. At least one interaction should make clear that set metrics can stay fixed while rank-aware metrics change.
- Define each metric, its denominator and cutoff; explain averaging across queries. Specify how missing judgments and fewer than `k` returned items are handled in this toy calculator.
- Cover catalog coverage, intra-list diversity, novelty and serendipity for recommendations with explicit operational proxy definitions and a warning that these do not have one universal formula. Explain offline held-out evaluation versus online A/B tests and interleaving; distinguish primary outcomes from guardrails and call out position/exposure bias and CTR's limitations.
- Link to [Learning-to-Rank](/docs/machine-learning/learning-to-rank#ranking-evaluation-metrics) for its existing full metric and training derivations and to [Recommender Systems](/docs/machine-learning/recommender-systems#evaluating-a-recommender-offline) for top-N recommendation evaluation. Do not copy their worked tables or repeat the LTR loss derivation.
- Cite Manning et al. (2008) and Järvelin & Kekäläinen (2002). All calculator outputs must be computed from displayed values, not hard-coded.

## Shared page and visual requirements

- Each MDX page has a plain title, 120–160 character description, one `<ELI5>` directly after H1, 1–3 plausible `<PredictFirst>` challenges with explanations, a worked example, a `When Not to Use It` table, a concise `Remember` table, a next-page link, and sources. Do not repeat the same generic intro across the three pages.
- Use `NotebookCallout` only for a real invariant or warning. Use exact existing component import paths and valid props.
- Each major page has at least one diagram that answers a stated question, uses `useVizTokens()`, `VisualizationContainer` and `VisualizationHeader`, has labeled arrows/nodes and a full-sentence caption, and fits 375px without horizontal scrolling. Do not hardcode colors.
- Work examples before abstract generalizations. Any example-only counts/values must be called illustrative. No invented production benchmark numbers.
- Do not claim a metric is “standard” without a scoped citation. Do not claim BM25, dense retrieval, or a business metric always wins.
- Run the writing-voice banned-phrase grep on all new human-facing text and fix every hit.
- Generate page metadata with `node scripts/generate-page-meta.mjs`; do not hand-edit the generated page metadata.

## Steps and checks

1. Inspect current `Bm25` and NDCG visuals/helpers before editing; preserve existing tests and public APIs.
2. Create the category metadata, three pages, diagrams and focused pure-function tests. Update the Models grouping and page count as specified.
3. Run `node scripts/generate-page-meta.mjs` and `npm run check:tracker`.
4. Through `flock /tmp/nm-heavy.lock`, run `npm run check:mdx`, `npm run check:links`, `npm run typecheck`, and the focused Vitest files for BM25, ranking metrics, `sectionMeta.test.ts`, and any new diagram test. Run one command at a time.
5. Run the banned-phrase grep. Validate every formula and worked result independently with a short script or hand calculation, and record the outputs.
6. Start the app only through `flock /tmp/nm-heavy.lock`; visually verify each page and all controls in both themes at 1200px and 375px. Capture readable contact sheets under the allowed evidence directory. Check keyboard operation and browser console. Run each RunnableCode block and confirm no traceback.
7. Review your diff against the allowed file list; do not weaken or remove tests. Commit in small conventional commits on `search-rank-rec`, with no push.
8. Append a factual report below. Include changed files, each exact command and exit status/output, visual routes/viewports/themes and evidence paths, runnable-code outcome, commits, limitations, and questions. Commit the report/tracker update.

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

### Follow-Up: Review Fixes (Batch 1 Fix 1)
All review findings in `docs/briefs/search-ranking-recommendations-batch-1-fix-1.md` have been addressed and verified in full. See `docs/briefs/search-ranking-recommendations-batch-1-fix-1.md` for the detailed report, commit history (`0964026f` through `6d399844`), and 2×2 screenshot contact tables.
