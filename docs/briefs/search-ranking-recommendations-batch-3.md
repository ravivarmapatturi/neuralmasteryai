# Batch 3 implementation brief — recommendation foundations, factorization, deep recommenders

## Objective

Implement plan pages 7–9 in the Search, Ranking & Recommendations Learn section with deep, mechanism-focused chapters. Preserve existing routes and link to the existing broad recommender chapter rather than copy it.

## Before writing

- Read AGENTS.md and the Learn, writing-voice, visual-learning, visualization, ui-design, ship-gate and tracker skills; read Attention & Transformers and the batch plan/review.
- Read `src/content/docs/machine-learning/recommender-systems.mdx` fully. It already covers content/collaborative filtering, biases, matrix factorization/ALS, implicit feedback/BPR, two-tower retrieval, sampled negatives, pipeline, CTR, sequential recommendation, and evaluation. These new chapters must add derivations/visual experiments and link to existing coverage rather than reproduce its existing overview/large experiment.
- Inspect and reuse `MatrixFactorizationDiagram`, embedding helpers/visuals and their tests where suitable. Keep old routes stable.
- For each chapter record its learner question, misconception and worked-example values in tracker notes.

## Chapters and sequence

Create three focused pages under `src/content/docs/search-ranking-recommendations/`:

1. `recommendation-foundations.mdx`, sidebar position 9: how user-item interactions, content signals and collaborative evidence produce candidates; explicit vs implicit feedback, exposure/missingness, cold start, nearest-neighbor intuition. A small hand-checkable user-item matrix and one visual should ground the chapter. Link to `/docs/machine-learning/recommender-systems` for baselines and full overview.
2. `matrix-factorization-embeddings.mdx`, position 10: derive low-rank user/item embeddings from observed interactions; explain identifiability, regularization, explicit squared loss versus implicit confidence/ranking objectives, and ALS vs SGD. Use one tiny matrix with identical numbers in prose, interactive visual and runnable Python. Link to existing ALS implementation/coverage instead of duplicating the long simulation.
3. `deep-recommenders.mdx`, position 11: mechanism-focused comparison of two-tower retrieval, Wide & Deep / feature interaction, DLRM-style embedding interaction, and sequential recommenders. Show why independent towers enable precomputed item vectors and ANN lookup but limit cross-feature interactions; then show ranking as the richer follow-up. Reuse one small example across prose/visual/code. Link to existing detailed sections in the recommender page and Attention & Transformers.

Keep all three chapters specific to recommendations; no repetition of batch-2 ranking or generic neural network surveys. Use supported primary sources: Koren et al. (2009), Hu et al. (2008), Rendle et al. (2009), Covington et al. (2016), Cheng et al. Wide & Deep (2016), Naumov et al. DLRM (2019), Kang & McAuley SASRec (2018), and relevant two-tower sources. Cite numbers at point of use; distinguish measured studies, computed toy examples and qualitative explanations.

## Learn-page acceptance

- 2,000–5,000 words each; 120–160 character description; ELI5 directly after H1; 1–3 useful PredictFirst prompts; max 4 NotebookCallouts.
- Worked example reused across prose, visual and runnable Python; at least 2 RunnableCode snippets where useful, stdlib/NumPy only, labelled output and Try it comment. Test actual snippets in browser Pyodide.
- At least one substantive interactive visual per major mechanism, useVizTokens and visualization container/header, accessible keyboard controls, reduced motion when relevant, readable at 375 px/light/dark. Add interaction tests. Use diagrams to explain actual candidate/embedding/score mechanisms, not decorative pipeline cards.
- Include failure modes, When Not to Use, Remember (10 rows max), Next, and 5+ primary/official sources. Respect writing-voice grep and absolute internal route links.

## Integration

- Current chapter sequence is overview 1, text index 2, TF-IDF 3, BM25 4, semantic/hybrid 5, ranking fundamentals 6, learning-to-rank 7, metrics 8. Set batch-3 pages to 9–11; do not edit out-of-scope old pages. If additional navigation integration is necessary, keep it to `overview.mdx`, generated metadata and `sectionMeta.ts`; otherwise record later incoming links for batch 4.
- Regenerate generated page metadata with `node scripts/generate-page-meta.mjs`; do not hand-edit generated metadata.
- Save screenshots for each visual at desktop 1200 and mobile 375, light/dark under `docs/evidence/search-ranking-recommendations/batch-3/`. Verify H1/visual readiness, no loading/overlay, no mobile overflow and inspect all images.

## Allowed files

- `AGENT_TRACKER.md`
- This brief and one `search-ranking-recommendations-batch-3-fix-N.md` if review requires fixes
- The three new MDX chapters in the named section
- New/reused visualizer source and tests under `src/viz/diagrams/` and calculation helper/tests under `src/viz/lib/`
- `src/data/pageMeta.generated.json`, `src/data/sectionMeta.ts` only if required
- `overview.mdx` only if required for outgoing links
- `docs/evidence/search-ranking-recommendations/batch-3/`

Do not edit `machine-learning/recommender-systems.mdx` or unrelated routes/source. If requirements need a file outside scope, report the proposed change in the brief and stop.

## Verification

Run `node scripts/generate-page-meta.mjs`, `npm run check:mdx`, `npm run check:links`, `npm run typecheck`, focused tests and full `npx vitest run`, writing-voice grep, tracker check and `git diff --check`. Use `flock /tmp/nm-heavy.lock` for each heavy command, one at a time. Browser interaction/Pyodide/screenshot work also through the lock. Build only when `free -g` reports at least 5 GiB available; otherwise record memory and defer to CI. Review every file against the allowed list; commit in small steps, never push. Record exact commands/results and commit hashes below.

## Report from agy
