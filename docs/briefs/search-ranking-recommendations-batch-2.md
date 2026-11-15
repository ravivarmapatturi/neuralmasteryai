# Batch 2 implementation brief — semantic retrieval, ranking, Learning to Rank

## Objective

Implement plan pages 3–5 in the established Search, Ranking & Recommendations Learn section: semantic and hybrid search; ranking fundamentals with link analysis/PageRank; and Learning to Rank (pointwise, pairwise, listwise). Keep old routes stable and link related existing chapters instead of duplicating them.

## Before writing

- Read `AGENTS.md`, `.agents/skills/learn-page/SKILL.md`, `writing-voice`, `visual-learning`, `visualization`, `ui-design`, `ship-gate`, and the three batch-1 pages for voice and technical continuity.
- Read `src/content/docs/machine-learning/learning-to-rank.mdx`, `src/content/docs/llms-genai/rag.mdx` (or the current RAG route), and `src/content/docs/llms-genai/retrieval-and-reranking-architectures.mdx`. Reuse their existing content/links; do not restate complete existing chapters.
- Record each page’s one question, misconception, worked-example numbers, and page type in the tracker notes.

## Pages and teaching scope

### 1. `src/content/docs/search-ranking-recommendations/semantic-and-hybrid-search.mdx`

Teach when lexical retrieval, dense bi-encoder retrieval, and late interaction differ; derive hybrid fusion with one worked Reciprocal Rank Fusion example. Explain embeddings, query/document encoders, approximate nearest-neighbor search at an engineering level, HNSW vs IVF/PQ trade-offs, ColBERT late interaction, and cross-encoder reranking. Link to the existing RAG retrieval coverage. Use a shared tiny query/document example across prose, visual and Python.

### 2. `src/content/docs/search-ranking-recommendations/ranking-fundamentals.mdx`

Teach what a ranker scores, feature families, relevance labels, click/position bias and logging-time feature correctness. Introduce link analysis by deriving PageRank on a small directed graph with the same adjacency matrix and damping value in prose, diagram and runnable Python. Explain convergence, dangling nodes, personalization at a conceptual level, and when PageRank is an unsuitable relevance signal. Cross-link to the existing bandits page only for exploration; do not drift into recommender foundations.

### 3. `src/content/docs/search-ranking-recommendations/learning-to-rank.mdx`

Teach pointwise, pairwise and listwise objectives through one small ranked example. Explain RankNet's pairwise logistic loss and gradients, LambdaRank's metric-sensitive swaps, and LambdaMART's boosted-tree implementation at interview depth. Distinguish training objectives from evaluation metrics (link to batch-1 metrics) and from feature engineering (link to ranking fundamentals). Name the existing `machine-learning/learning-to-rank.mdx` page as a complementary existing route, not a replacement; don't break or rename its URL.

## Learn-page acceptance for each page

- 2,000–5,000 prose words, one concept per page, direct first-party prose.
- Exactly one `<ELI5>` directly after H1; 1–3 meaningful `<PredictFirst>` prompts before surprising results; `<GoDeeper>` for derivation; max four `NotebookCallout`s, using only amber/cobalt/green/coral.
- At least one `useVizTokens()` visualization per major mechanism; use the existing visualization primitives/container/header/PillSelect as appropriate. Every visual has a full-sentence caption. Controls must reveal a mechanism, not decorate it.
- At least two `<RunnableCode>` blocks when useful; Python standard library/NumPy only, with a labelled result and a useful Try-it edit. Test the actual snippets in Pyodide/browser before reporting pass.
- One computed worked example carried with identical numbers across prose, visual and code. Every factual number is either computed on-page, explicitly illustrative, or supported by an in-context primary/official source.
- Include common failures and fixes, a `When not to use it` table, a `Remember` table (10 rows max), an accurate Next link, and at least five relevant primary/official sources with URLs.
- Frontmatter descriptions 120–160 characters. Add pages to the existing section sidebar with sequential positions 4–6. Run `node scripts/generate-page-meta.mjs` through the heavy lock.

## Visuals and tests

Create three focused visuals under `src/viz/diagrams/` (names may be `SemanticHybridSearchDiagram`, `PageRankVisualizer`, and `LearningToRankDiagram`):

- Semantic/hybrid: lexical, dense and RRF ranks for a small fixed result set; controls alter RRF constant or channel weights and visibly change order. Keep RRF's specified formula explicit.
- PageRank: small directed graph, step-through mass updates and convergence. Label all edges/nodes and damping. Default state shows a useful result; keep it readable at mobile width.
- Learning to Rank: one fixed query with graded document labels; choose objective and show what pointwise scores, pairwise ordering, and listwise permutation loss optimize. Clearly separate LambdaRank's lambda gradients from LambdaMART's tree learner.

Add one focused React Testing Library + Vitest interaction test per visual, following `src/viz/diagrams/RankingMetricsExplorer.test.tsx`: mock `useVizTokens()` with light tokens and verify each control changes the intended state/result. Add focused pure helper tests if helpers are introduced. Keep all colors token-based, include accessible labels and keyboard-operable controls, and respect reduced motion where motion is used.

## Navigation and integration

- Keep the existing folder and section ordering. New page positions: 4, 5, 6 after current three pages.
- Generate metadata; do not hand-edit generated page meta.
- Link batch-1 overview to the new semantic/hybrid page only if that requires changing an allowed existing file. If an incoming link requires editing an out-of-scope page, do not make it; record the exact suggested batch-4 integration in the report.
- Do not edit existing ML/RAG/architectures/bandits pages in this batch.

## Screenshots and UI verification

For each new route, capture the actual rendered page/visual at 1200px and 375px in light and dark themes under `docs/evidence/search-ranking-recommendations/batch-2/`. Verify no horizontal overflow, no loading/blank visual, and clean console. Exercise every control and keyboard Tab/Enter. Use a small table of individual links in the final report if contact sheets are unavailable. Capture only after content is loaded.

## Allowed files

- `AGENT_TRACKER.md`
- This brief and `docs/briefs/search-ranking-recommendations-batch-2-retry-2.md` (agy may create retry brief only if this run exits without a report)
- Three new `.mdx` pages under `src/content/docs/search-ranking-recommendations/`
- New diagrams and focused tests under `src/viz/diagrams/`; new calculation helper/tests under `src/viz/lib/` only if needed
- Generated `src/data/pageMeta.generated.json`
- `docs/evidence/search-ranking-recommendations/batch-2/`

Do not edit other files. Keep all source routes stable. If the brief requires an out-of-scope file, stop and write the question in `## Report from agy`.

## Verification

Run each heavy command sequentially, only through `flock /tmp/nm-heavy.lock`:

1. `node scripts/generate-page-meta.mjs`
2. `npm run check:mdx`
3. `npm run check:links`
4. `npm run typecheck`
5. `npx vitest run <new diagram/helper tests> src/data/sectionMeta.test.ts`
6. `npm run check:tracker`, `git diff --check`, and writing-voice banned phrase grep.
7. Browser screenshot/interactions under the same lock. Verify any runnable snippet in Pyodide.
8. Full build only when `free -g` shows at least 5 GiB available; otherwise record memory and leave build to CI. Do not run heavy tasks concurrently.

Inspect the complete diff against the allowed file list. Commit in focused commits on this branch. Never push.

## Report from agy
