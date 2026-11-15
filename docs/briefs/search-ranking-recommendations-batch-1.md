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
