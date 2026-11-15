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
