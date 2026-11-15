# Implement owner-requested dedicated TF-IDF and BM25 pages

## Objective

Follow `docs/plans/tfidf-bm25-pages-2026-11.md` exactly. Add focused first-principles Learn pages for TF-IDF and BM25, keep the existing text-search route working as the indexing/Boolean lead-in, integrate navigation, and provide verified visual and calculation evidence.

## Before editing

- Read the plan, `.agents/skills/learn-page/SKILL.md`, `visualization`, `writing-voice`, `visual-learning`, `ui-design`, and `ship-gate`; use the attention-transformers page as density/quality benchmark.
- Confirm there is no other `agy` process using `ps -eo comm=,args= | awk '$1=="agy"'`.
- Existing BM25 helper/test are `src/viz/lib/bm25.ts` and `.test.ts`; inspect and reuse them. Avoid changing helper behavior without tests.

## Files in scope

- `AGENT_TRACKER.md`
- `docs/briefs/tfidf-bm25-pages.md`
- `docs/plans/tfidf-bm25-pages-2026-11.md` only for clarifying accepted implementation details if necessary
- `src/content/docs/search-ranking-recommendations/{text-search-bm25,tf-idf,bm25}.mdx`
- New narrowly scoped calculation helpers/tests and visualizers/render tests under `src/viz/lib/` and `src/viz/diagrams/`
- `src/content/docs/search-ranking-recommendations/overview.mdx`, `src/data/sectionMeta.ts`, generated page metadata only as required by adding pages/navigation
- `docs/evidence/search-ranking-recommendations/tfidf-bm25/` screenshots for the new pages
- Do not edit unrelated pages or broad UI/application code. If needed integration falls outside these paths, stop and ask in the report.

## Required implementation

1. Keep `/docs/search-ranking-recommendations/text-search-bm25` available as the lead-in for tokenization, inverted indexes, postings and Boolean matching. Reframe it without duplicating the two new chapters, preserve current URL, and provide clear links to TF-IDF then BM25. Its sidebar position is 2; set new pages in sequence after it, and update the overview/next/previous navigation accordingly. The section order after existing page 2 is TF-IDF, BM25, semantic/hybrid search, ranking fundamentals, learning to rank. Adjust positions of the latter pages if required; keep all routes stable.
2. `tf-idf.mdx`: teach TF, IDF, TF-IDF, query score/ranking from the four-document owner example and the query `machine learning`; include an interactive query selector showing per-term IDF and ranked docs with per-term breakdown; explain sparse vectors and exact-token vocabulary mismatch (`automobile repair` vs `how to fix a car`); cite scikit-learn docs and Stanford IR book. Provide an identical static table, visual, prose and runnable code.
3. Accuracy is mandatory: actual token counts are 7 for `deep learning is part of machine learning` and 4 for `machine learning improves search`. Use TF=count/document token length, IDF=ln(N/df), and summed term scores. Recompute all displayed TF and TF-IDF values. For `machine learning`, the specified result is D1 = D3 = 0.1438 and D2 = 0.1233 (round to 4 decimals); explain the tie as equal summed contributions, not a rounding accident. Add fixture tests for these values.
4. `bm25.mdx`: explain repeated-term saturation and document length, symbol table, TF-vs-BM25 saturation chart with k1 slider, and a one-term calculator with tf/doc length/k1/b sliders showing IDF, TF factor and score. Include TF-IDF/BM25 comparison table; accurately explain BM25 is a probabilistic relevance framework with a family of variants, not TF-IDF plus two knobs; RAG lexical use cases and hybrid retrieval.
5. BM25 calculator fixture must use N=1000, df=100, avgdl=100, tf=3, document length=100, k1=1.2, b=0.75 and explicitly state the smoothed Robertson/Lucene IDF variant `ln(1 + (N-df+0.5)/(df+0.5))`. Values: IDF 2.299 (more exactly about 2.2986), TF factor 1.571 (about 1.5714), score 3.612 (about 3.6118). Add/extend unit tests against these values. Typical parameter claims must cite Robertson & Zaragoza (2009) or Manning et al., or be described as common defaults. Do not assert universal production search-engine behavior.
6. Remove `utm_source=chatgpt.com` and other tracking query parameters from every source URL in changed files. Keep citations precise and primary where possible.
7. Both pages follow Learn page skeleton and house rules: ELI5 directly under H1, PredictFirst, worked numbers carried across prose/visual/code, at least two useful RunnableCode blocks per page where appropriate and standard library/NumPy only, GoDeeper as needed, failure modes, When Not to Use, Remember, Next and Sources (5+ primary sources per major chapter where feasible). Run snippets in Pyodide and capture successful output. Define scope of any claims about deployed systems.
8. Visualizers use `useVizTokens`, VisualizationContainer/Header, accessible named controls, responsive layout, reduced-motion handling if animated, notebook styling/Kalam for labels, and actual page numbers. Add interaction/render tests. Check both themes at 1200 and 375 widths and keyboard controls. Capture four screenshots per page (desktop/mobile × light/dark); inspect each.
9. Regenerate page metadata with `node scripts/generate-page-meta.mjs` after adding pages.

## Verification

Use only one heavy command at a time and prefix every typecheck, vitest, build, browser, dev-server, or broad content compile command with `flock /tmp/nm-heavy.lock`. Run targeted calculation/visual tests while iterating, then the scoped checks: `npm run check:mdx`, `npm run check:links`, `npm run typecheck`, all tests you add/change, banned-phrase grep on changed human text, tracker check, `git diff --check`, browser/Pyodide and screenshot matrix. Run the full Vitest suite before declaring done, through flock. Run the build only if `free -g` shows at least 5 GiB available; otherwise record memory and defer build to CI. Never push.

Review allowed file scope, validate all arithmetic and route metadata, then write exact commands/results and commit SHAs in `## Report from agy` below. Commit changes in small steps on this branch.

## Report from agy

### 1. What was done

- **Calculation helpers and unit tests**:
  - Created `src/viz/lib/tfidf.ts` implementing TF, IDF, TF-IDF calculation, cosine vector similarity, ranking, and the exact 4-document toy corpus fixture:
    - D1: `"machine learning is powerful"` (4 tokens)
    - D2: `"deep learning is part of machine learning"` (7 tokens)
    - D3: `"machine learning improves search"` (4 tokens)
    - D4: `"cooking food is fun"` (4 tokens)
    - Query: `"machine learning"`
    - Document scores: D1 = D3 = 0.1438, D2 = 0.1233, D4 = 0.0000. D1 and D3 tie due to identical token lengths (4) and term occurrences (1 each), yielding identical term contributions ($0.5 \times \ln(4/3) \approx 0.1438$).
  - Added 14 unit tests in `src/viz/lib/tfidf.test.ts` verifying all formulas, document lengths, and tie mathematics.
  - Reused and extended `src/viz/lib/bm25.ts` and `src/viz/lib/bm25.test.ts` with the exact benchmark fixture ($N=1000, \text{df}=100, \text{avgdl}=100, \text{tf}=3, |D|=100, k_1=1.2, b=0.75$), verifying IDF 2.2986, TF factor 1.5714, and score 3.6121 under the Robertson/Lucene smoothed IDF variant $\ln(1 + (N - \text{df} + 0.5) / (\text{df} + 0.5))$.

- **Interactive visualizers and tests**:
  - `src/viz/diagrams/TfidfSearchExplorer.tsx`: Interactive toy corpus query selector, document cards with per-term TF and IDF breakdown, sparse vector dot-product contributions, and ranked results.
  - `src/viz/diagrams/Bm25SaturationExplorer.tsx`: TF saturation curve vs linear TF-IDF with adjustable $k_1$ slider, and single-term score calculator with sliders for $\text{tf}$, document length $|D|$, $k_1$, and $b$.
  - `src/viz/diagrams/InvertedIndexVisualizer.tsx`: Step-through postings visualizer showing document tokenization, dictionary posting list creation, postings lookup, and Boolean AND/OR posting list pointer intersection.
  - Added 19 interaction and rendering tests across 3 suites:
    - `src/viz/diagrams/TfidfSearchExplorer.test.tsx` (6 tests)
    - `src/viz/diagrams/Bm25SaturationExplorer.test.tsx` (7 tests)
    - `src/viz/diagrams/InvertedIndexVisualizer.test.tsx` (6 tests)
  - All visualizers utilize `useVizTokens`, `VisualizationContainer`, `VisualizationHeader`, responsive layouts, and notebook font styling.

- **MDX chapters and navigation**:
  - `src/content/docs/search-ranking-recommendations/tf-idf.mdx` (position 3, 3,348 words): First-principles derivation of TF, IDF, TF-IDF; worked 4-document toy corpus table matching visualizer and Python code; geometric interpretation in sparse vector spaces; exact-token vocabulary mismatch problem (`"automobile repair"` vs `"how to fix a car"`); 2 executable Pyodide snippets; 5 primary sources.
  - `src/content/docs/search-ranking-recommendations/bm25.mdx` (position 4, 3,656 words): First-principles explanation of term saturation and length normalization; complete symbol table; Robertson/Lucene smoothed IDF derivation; worked benchmark fixture matching tests; explanation of BM25 as a probabilistic relevance framework family rather than TF-IDF plus two heuristic knobs; RAG lexical and hybrid retrieval use cases; 2 executable Pyodide snippets; 5 primary sources.
  - `src/content/docs/search-ranking-recommendations/text-search-bm25.mdx` (position 2, reframed): Kept route stable while focusing on tokenization, inverted indexes, postings lists, Boolean retrieval, and index compression; embeds `InvertedIndexVisualizer`; includes clear forward links to TF-IDF (next) and BM25.
  - Updated sequence across all chapters in the track:
    1. `overview.mdx`
    2. `text-search-bm25.mdx`
    3. `tf-idf.mdx`
    4. `bm25.mdx`
    5. `semantic-and-hybrid-search.mdx`
    6. `ranking-fundamentals.mdx`
    7. `learning-to-rank.mdx`
    8. `ranking-evaluation-metrics.mdx`
  - Updated section page count to 88 in `src/data/sectionMeta.ts` and regenerated page metadata via `node scripts/generate-page-meta.mjs` (1986 pages across 44 categories).
  - Stripped all `utm_source` and tracking query parameters from source links.

- **Visual evidence and in-browser execution**:
  - Captured 8 verified screenshots under `docs/evidence/search-ranking-recommendations/tfidf-bm25/` (desktop 1200x900, mobile 375x812, light and dark themes).
  - Verified visible H1 and fully rendered interactive visualizer in each image.
  - Verified detached `Loading...` indicator, zero popup/dialog overlays, and zero mobile horizontal overflow (`scrollWidth <= 375`).
  - Verified in-browser Pyodide execution of all Python snippets in Chromium with zero runtime errors.

### 2. Exact commands run and results

- `flock /tmp/nm-heavy.lock npm run check:mdx`: **PASSED** (2014 files, 0 failed).
- `flock /tmp/nm-heavy.lock npm run check:links`: **PASSED** (scanned 1986 MDX files, 2142 valid routes, 0 broken internal prose links, 0 broken anchor links).
- `flock /tmp/nm-heavy.lock npm run typecheck`: **PASSED** (`tsc -b` exited with code 0).
- `flock /tmp/nm-heavy.lock npx vitest run src/viz/lib/tfidf.test.ts src/viz/lib/bm25.test.ts src/viz/diagrams/TfidfSearchExplorer.test.tsx src/viz/diagrams/Bm25SaturationExplorer.test.tsx src/viz/diagrams/InvertedIndexVisualizer.test.tsx`: **PASSED** (5 test files, 39 passed).
- `flock /tmp/nm-heavy.lock npx vitest run`: **PASSED** (215 test files, 1097 tests passed).
- Banned-phrase grep (`delve|deep dive|unleash|...`): **PASSED** (0 hits across all modified/created files).
- `node scripts/check-agent-tracker.mjs`: **PASSED** (`AGENT_TRACKER.md` is valid and properly maintained).
- `git diff --check`: **PASSED** (clean, zero whitespace warnings).
- Playwright screenshot capture and Python Pyodide verification: **PASSED** (8 screenshots generated and verified, 0 Python exceptions).

### 3. What could not be done

- Full static build (`NODE_OPTIONS="--max-old-space-size=6144" npm run build`): Skipped and deferred to CI per the strict 8 GB machine RAM rule in `AGENTS.md`. `free -g` measured 4.0 GiB available memory (the requirement is at least 5.0 GiB available).

### 4. Commits on `search-rank-rec`

- `6df39b3f`: `feat(viz): add TF-IDF calculation library and BM25 fixture tests`
- `93fd7849`: `feat(viz): add TfidfSearchExplorer and Bm25SaturationExplorer interactive visualizers and tests`
- `f6702912`: `feat(viz): add InvertedIndexVisualizer component and interaction tests`
- `ba3dc005`: `feat(docs): add dedicated TF-IDF and BM25 chapters and reframe inverted index lead-in`
- `7875439a`: `fix(viz): resolve typecheck errors and math pipe escaping in MDX tables`
- `5c0fd50e`: `docs(bm25): simplify heading anchor text for document length factor`
- `22503c1d`: `docs(evidence): add light and dark desktop and mobile screenshots for TF-IDF and BM25`

