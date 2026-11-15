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

### 1. Summary of Work Completed
Executed Batch 2 in full according to `docs/briefs/search-ranking-recommendations-batch-2.md`:

1. **Authored Three Deep-Dive Learn Pages** under `src/content/docs/search-ranking-recommendations/`:
   - `semantic-and-hybrid-search.mdx` (sidebar_position: 4, 3,624 prose words, 141-character description):
     - Derives when lexical retrieval, dense bi-encoder retrieval, and late interaction differ.
     - Details HNSW skip-graphs, IVF Voronoi cells, and Product Quantization (PQ) memory trade-offs.
     - Formulates ColBERT late interaction token embeddings and the MaxSim alignment operator.
     - Derives Reciprocal Rank Fusion (RRF) with full worked example ($D_1$..$D_4$ with $k=60$ yielding $D_2 \succ D_1 \succ D_3 \succ D_4$ under equal weights, and $D_1 \succ D_2$ under lexical bias $w_{\text{lex}}=2.0$).
     - Features interactive visualizer `SemanticHybridSearchDiagram`, two `<RunnableCode>` blocks (pure RRF and ColBERT MaxSim in NumPy), 2 `<PredictFirst>` active recall challenges, `<GoDeeper>` PQ derivation, failure modes table, When Not to Use table, 7-row Remember table, and 6 primary sources with URLs.
   - `ranking-fundamentals.mdx` (sidebar_position: 5, 3,822 prose words, 143-character description):
     - Formulates the ranker scoring function $s = f(\mathbf{x}(q, d, u, c))$ and structures the five multi-modal feature families.
     - Analyzes logging-time feature correctness, point-in-time joins, and offline temporal leakage traps.
     - Derives the Examination Hypothesis and Inverse Propensity Scoring (IPS) for counterfactual unbiasing of implicit click logs; links to `/docs/reinforcement-learning/bandits` for exploration.
     - Derives PageRank on directed hyperlink graphs: random surfer model, damping factor $d=0.85$, teleportation base $(1-d)/N = 0.0375$, dangling node mass preservation, Perron-Frobenius convergence proof, and personalization.
     - Features a concrete 4-node directed graph ($\{A, B, C, D\}$ with identical numbers across prose, diagram, and NumPy code: Step 0 uniform $0.2500$, Step 1 $A=0.2500, B=0.1438, C=0.5688, D=0.0375$, converging to $A=0.3725, B=0.1958, C=0.3941, D=0.0375$).
     - Features interactive visualizer `PageRankVisualizer`, two `<RunnableCode>` blocks (NumPy PageRank solver and IPS click unbiasing simulation), 2 `<PredictFirst>` prompts, failure modes table, When Not to Use table, 6-row Remember table, and 7 primary sources with URLs.
   - `learning-to-rank.mdx` (sidebar_position: 6, 3,506 prose words, 137-character description):
     - Teaches pointwise (MSE/regression), pairwise (RankNet/LambdaRank), and listwise (LambdaMART/ListNet) ranking paradigms through a concrete 3-document worked example ($Q$: "neural ranking model", labels $\{3, 2, 0\}$, model scores $[1.2, 2.1, 0.4]$, exhibiting top-slot inversion $D_2 \succ D_1$).
     - Derives RankNet pairwise logistic cross-entropy loss, sigmoid probability $P_{12} = \sigma(-0.90) \approx 0.2891$, and gradient force $\lambda_{12} = -0.7109$.
     - Solves the non-differentiable ranking metric bottleneck via LambdaRank: scales RankNet gradient by metric shift $|\Delta\text{NDCG}_{12}| = |8.8928 - 7.4165|/8.8928 \approx 0.1660$, producing virtual gradient $\lambda_{12}^{\text{LambdaRank}} = -0.1180$.
     - Explains LambdaMART Multiple Additive Regression Trees: fitting pseudo-residuals $\lambda_i$, second-order Newton-Raphson leaf updates $\gamma_{km} = \sum \lambda_i / \sum w_i$, and why GBDT dominates tabular production ranking.
     - Cross-links to batch-1 `/docs/search-ranking-recommendations/ranking-evaluation-metrics` and acknowledges existing classical route `/docs/machine-learning/learning-to-rank` as a complementary foundational guide.
     - Features interactive visualizer `LearningToRankDiagram`, two `<RunnableCode>` blocks (exact LambdaRank gradient calculation and LambdaMART decision stump fit), 2 `<PredictFirst>` prompts, failure modes table, When Not to Use table, 7-row Remember table, and 7 primary sources with URLs.

2. **Created Calculation Libraries and Unit Tests** in `src/viz/lib/`:
   - `hybridSearch.ts` and `hybridSearch.test.ts` (3/3 passing unit tests).
   - `pageRank.ts` and `pageRank.test.ts` (4/4 passing unit tests).
   - `learningToRank.ts` and `learningToRank.test.ts` (4/4 passing unit tests).

3. **Created Interactive Visual Diagrams and RTL Tests** in `src/viz/diagrams/`:
   - `SemanticHybridSearchDiagram.tsx` and `SemanticHybridSearchDiagram.test.tsx` (3/3 passing tests).
   - `PageRankVisualizer.tsx` and `PageRankVisualizer.test.tsx` (3/3 passing tests).
   - `LearningToRankDiagram.tsx` and `LearningToRankDiagram.test.tsx` (5/5 passing tests).

4. **Captured 12 Evidence Screenshots & Verified Clean Browser Execution**:
   - Captured desktop (1200px) and mobile (375px) in light and dark modes in `docs/evidence/search-ranking-recommendations/batch-2/`.
   - Verified 0 horizontal overflow at 375px (`document.documentElement.scrollWidth === 375` across all pages).
   - Verified Pyodide runtime in browser: executed NumPy and AST evaluation cleanly with zero uncaught exceptions.

5. **Updated Metadata**:
   - Regenerated `src/data/pageMeta.generated.json` (1,984 pages).

---

### 2. Exact Commands and Verification Output

1. `flock /tmp/nm-heavy.lock node scripts/generate-page-meta.mjs`
   - Output: `generate-page-meta: wrote 28 blog posts to src/data/blogMeta.generated.json`, `generate-page-meta: wrote 1984 pages, 44 categories to src/data/pageMeta.generated.json`
   - Exit Code: `0` (Pass)

2. `flock /tmp/nm-heavy.lock npm run check:mdx`
   - Output: `check-mdx-compile: 2012 files, 0 failed.`
   - Exit Code: `0` (Pass)

3. `flock /tmp/nm-heavy.lock npm run check:links`
   - Output: `check-internal-links: scanned 1984 MDX file(s), found 2140 valid route(s). check-internal-links: no broken internal prose links found. check-anchor-links: no broken anchor links found.`
   - Exit Code: `0` (Pass)

4. `flock /tmp/nm-heavy.lock npm run typecheck`
   - Command: `tsc -b`
   - Output: Clean compilation with 0 errors.
   - Exit Code: `0` (Pass)

5. `flock /tmp/nm-heavy.lock npx vitest run src/viz/lib/hybridSearch.test.ts src/viz/lib/pageRank.test.ts src/viz/lib/learningToRank.test.ts src/viz/diagrams/SemanticHybridSearchDiagram.test.tsx src/viz/diagrams/PageRankVisualizer.test.tsx src/viz/diagrams/LearningToRankDiagram.test.tsx src/data/sectionMeta.test.ts`
   - Output: `Test Files  7 passed (7) | Tests  33 passed (33)`
   - Exit Code: `0` (Pass)

6. `npm run check:tracker`
   - Output: `check-agent-tracker: AGENT_TRACKER.md is valid, structured, and properly maintained.`
   - Exit Code: `0` (Pass)

7. `git diff --check`
   - Output: Clean (0 trailing whitespace / conflict marker errors).
   - Exit Code: `0` (Pass)

8. Banned-phrase grep (`writing-voice` standard):
   - Output: 0 matches found across all new batch-2 files.
   - Exit Code: `0` (Pass)

9. Browser Interaction, Overflow & Pyodide Verification:
   - Captured 12 responsive screenshots across 1200px and 375px viewports in light and dark modes.
   - Horizontal overflow test: `document.documentElement.scrollWidth` strictly equal to `375` (0 overflow).
   - Pyodide client-side execution verified: `<RunnableCode>` blocks executed in Chromium, loaded WebAssembly runtime and NumPy (`[browser] log Loaded numpy`), and ran with zero uncaught exceptions.

10. Memory Measurement & Build Guard:
    - Command: `flock /tmp/nm-heavy.lock free -h`
    - Output: `Mem total: 7.2Gi, used: 4.3Gi, free: 1.5Gi, available: 2.4Gi`
    - Result: Available memory (2.4 GiB) is below the 5 GiB threshold required for safe in-memory Rollup compilation. Full static build is left to CI per AGENTS.md 8GB RAM rule.

---

### 3. Screenshot Verification Evidence (2×2 Tables)

#### 1. Semantic & Hybrid Search (`/docs/search-ranking-recommendations/semantic-and-hybrid-search`)
| Theme | Desktop (1200px) | Mobile (375px) |
| :--- | :--- | :--- |
| **Light** | [semantic-and-hybrid-search-light-desktop.png](file:///home/ravivarma/Documents/DREAM_PROJECT/neuralmastery/platform-vite-srr/docs/evidence/search-ranking-recommendations/batch-2/semantic-and-hybrid-search-light-desktop.png) | [semantic-and-hybrid-search-light-mobile.png](file:///home/ravivarma/Documents/DREAM_PROJECT/neuralmastery/platform-vite-srr/docs/evidence/search-ranking-recommendations/batch-2/semantic-and-hybrid-search-light-mobile.png) |
| **Dark** | [semantic-and-hybrid-search-dark-desktop.png](file:///home/ravivarma/Documents/DREAM_PROJECT/neuralmastery/platform-vite-srr/docs/evidence/search-ranking-recommendations/batch-2/semantic-and-hybrid-search-dark-desktop.png) | [semantic-and-hybrid-search-dark-mobile.png](file:///home/ravivarma/Documents/DREAM_PROJECT/neuralmastery/platform-vite-srr/docs/evidence/search-ranking-recommendations/batch-2/semantic-and-hybrid-search-dark-mobile.png) |

#### 2. Ranking Fundamentals & Link Analysis (`/docs/search-ranking-recommendations/ranking-fundamentals`)
| Theme | Desktop (1200px) | Mobile (375px) |
| :--- | :--- | :--- |
| **Light** | [ranking-fundamentals-light-desktop.png](file:///home/ravivarma/Documents/DREAM_PROJECT/neuralmastery/platform-vite-srr/docs/evidence/search-ranking-recommendations/batch-2/ranking-fundamentals-light-desktop.png) | [ranking-fundamentals-light-mobile.png](file:///home/ravivarma/Documents/DREAM_PROJECT/neuralmastery/platform-vite-srr/docs/evidence/search-ranking-recommendations/batch-2/ranking-fundamentals-light-mobile.png) |
| **Dark** | [ranking-fundamentals-dark-desktop.png](file:///home/ravivarma/Documents/DREAM_PROJECT/neuralmastery/platform-vite-srr/docs/evidence/search-ranking-recommendations/batch-2/ranking-fundamentals-dark-desktop.png) | [ranking-fundamentals-dark-mobile.png](file:///home/ravivarma/Documents/DREAM_PROJECT/neuralmastery/platform-vite-srr/docs/evidence/search-ranking-recommendations/batch-2/ranking-fundamentals-dark-mobile.png) |

#### 3. Learning to Rank (`/docs/search-ranking-recommendations/learning-to-rank`)
| Theme | Desktop (1200px) | Mobile (375px) |
| :--- | :--- | :--- |
| **Light** | [learning-to-rank-light-desktop.png](file:///home/ravivarma/Documents/DREAM_PROJECT/neuralmastery/platform-vite-srr/docs/evidence/search-ranking-recommendations/batch-2/learning-to-rank-light-desktop.png) | [learning-to-rank-light-mobile.png](file:///home/ravivarma/Documents/DREAM_PROJECT/neuralmastery/platform-vite-srr/docs/evidence/search-ranking-recommendations/batch-2/learning-to-rank-light-mobile.png) |
| **Dark** | [learning-to-rank-dark-desktop.png](file:///home/ravivarma/Documents/DREAM_PROJECT/neuralmastery/platform-vite-srr/docs/evidence/search-ranking-recommendations/batch-2/learning-to-rank-dark-desktop.png) | [learning-to-rank-dark-mobile.png](file:///home/ravivarma/Documents/DREAM_PROJECT/neuralmastery/platform-vite-srr/docs/evidence/search-ranking-recommendations/batch-2/learning-to-rank-dark-mobile.png) |

---

### 4. Suggested Batch 4 Cross-Link Integration
Per brief instructions, out-of-scope files were not edited in Batch 2. Suggested updates for Batch 4 global section polish:
- In `src/content/docs/search-ranking-recommendations/ranking-evaluation-metrics.mdx`: update `Next: [Dense vs. Sparse Retrieval & Hybrid Search](/docs/llms-genai/rag#dense-vs-sparse-retrieval-and-bm25)` to point directly to `[Semantic & Hybrid Search](/docs/search-ranking-recommendations/semantic-and-hybrid-search)`.
- In `src/content/docs/search-ranking-recommendations/overview.mdx`: in candidate generation section, add direct link to `/docs/search-ranking-recommendations/semantic-and-hybrid-search`.

---

### 5. Commits on `search-rank-rec`
- `a57222ab` — `docs(tracker): register batch-2 semantic search and ranking implementation`
- `98a23a7a` — `feat(viz): add diagrams and calculations for batch-2 semantic search and ranking`
- `1e4caa10` — `feat(docs): add semantic-and-hybrid-search, ranking-fundamentals, and learning-to-rank chapters`
- `c1d1fe55` — `docs(evidence): capture 1200px and 375px light and dark screenshots for batch 2 diagrams`
