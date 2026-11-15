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

### 1. Actions Executed
- Implemented three comprehensive, mechanism-focused chapters in `src/content/docs/search-ranking-recommendations/`:
  - `recommendation-foundations.mdx` (position 9, 3,450 words): explicit vs. implicit feedback, user/item collaborative filtering derivations, baseline predictors, unobserved interaction confidence weighting ($c_{ui} = 1 + \alpha r_{ui}$), cold start mitigation via content embeddings and bandits, links to `/docs/machine-learning/recommender-systems`.
  - `matrix-factorization-embeddings.mdx` (position 10, 3,740 words): low-rank factor decomposition, explicit ALS ridge closed-form solutions, exact mathematical derivation and proof of rotational non-identifiability ($(UQ)(VQ)^T = UV^T$), implicit iALS formulation with the $O(|R|k^2)$ sparse inversion shortcut, BPR ranking loss, comparison table of ALS vs. SGD, self-contained Pyodide runnable snippets.
  - `deep-recommenders.mdx` (position 11, 3,680 words): architectural mechanics comparing Two-Tower retrieval, Wide & Deep (cross-product transformations), DLRM (explicit all-pairs embedding dot products), and SASRec (causal self-attention user state modeling), contrasting ANN-indexable retrieval with downstream heavy ranking.
- Implemented 3 interactive diagrams obeying `useVizTokens()` tokens and container primitives in `src/viz/diagrams/`:
  - `RecommendationFoundationsExplorer.tsx` + `RecommendationFoundationsExplorer.test.tsx`
  - `MatrixFactorizationExplorer.tsx` + `MatrixFactorizationExplorer.test.tsx`
  - `DeepRecommendersArchitectureExplorer.tsx` + `DeepRecommendersArchitectureExplorer.test.tsx`
- Implemented companion calculation and simulation libraries with unit tests in `src/viz/lib/`:
  - `recommendationFoundations.ts` + `recommendationFoundations.test.ts`
  - `matrixFactorization.ts` + `matrixFactorization.test.ts`
  - `deepRecommenders.ts` + `deepRecommenders.test.ts`
- Removed untracked diagnostic scripts `scripts/verify-batch-3.mjs` and `scripts/debug-route.mjs` without committing any helper scripts to the repository.
- Made the second `<RunnableCode>` block in `matrix-factorization-embeddings.mdx` self-contained with explicit initial factor matrices so that all 6 Pyodide blocks across the 3 chapters execute in-browser with zero exceptions.
- Captured all 12 required evidence screenshots in `docs/evidence/search-ranking-recommendations/batch-3/` covering 3 routes × 2 viewports (1200x900 desktop, 375x812 mobile) × 2 themes (light, dark). Verified article H1 and interactive diagram visible, zero loading placeholders, zero sign-in modals, and zero mobile horizontal overflow (`scrollWidth: 375px <= 375px`).
- Inspected all 12 images via pytesseract OCR and PIL, verifying text presence, visual elements, dimensions, and lack of overlays.
- Executed all heavy verification commands under `flock /tmp/nm-heavy.lock`.
- Did not push to remote.

### 2. Verification Commands & Observed Results
- `npm run check:tracker`
  - Output: `check-agent-tracker: AGENT_TRACKER.md is valid, structured, and properly maintained.` (Exit code: 0)
- `node scripts/generate-page-meta.mjs`
  - Output: `generate-page-meta: wrote 28 blog posts to src/data/blogMeta.generated.json`, `wrote 1989 pages, 44 categories to src/data/pageMeta.generated.json` (Exit code: 0)
- `flock /tmp/nm-heavy.lock npm run check:mdx`
  - Output: `check-mdx-compile: 2017 files, 0 failed.` (Exit code: 0)
- `flock /tmp/nm-heavy.lock npm run check:links`
  - Output: `check-internal-links: scanned 1989 MDX file(s), found 2145 valid route(s). No broken internal prose links found.` `check-anchor-links: no broken anchor links found.` (Exit code: 0)
- `flock /tmp/nm-heavy.lock npm run typecheck` (`tsc -b`)
  - Output: Exit code 0 (0 type errors across all workspaces)
- `flock /tmp/nm-heavy.lock npx vitest run src/viz/lib/deepRecommenders.test.ts src/viz/lib/matrixFactorization.test.ts src/viz/lib/recommendationFoundations.test.ts src/viz/diagrams/DeepRecommendersArchitectureExplorer.test.tsx src/viz/diagrams/MatrixFactorizationExplorer.test.tsx src/viz/diagrams/RecommendationFoundationsExplorer.test.tsx`
  - Output: `Test Files 6 passed (6) | Tests 24 passed (24)` (Exit code: 0)
- `flock /tmp/nm-heavy.lock npx vitest run` (Full vitest suite)
  - Output: `Test Files 221 passed (221) | Tests 1121 passed (1121)` (Exit code: 0)
- Banned phrases grep:
  - `grep -inE "delve|deep dive|unleash|unlock|harness the power|game.?changer|revolutioniz|cutting.edge|seamless|in today's|it's (important|worth) not|in conclusion|tapestry|testament|elevate|empower|supercharg|effortless|premier|world.class|ultimate guide|let's dive"`
  - Output: 0 hits across all 3 chapters.
- Mobile horizontal overflow:
  - `scrollWidth: 375px` on all 6 mobile captures (`scrollWidth <= 375px`, 0 overflow).
- Pyodide in-browser execution:
  - Verified 6/6 snippets across the 3 chapters executed in Web Worker Pyodide runtime with 0 tracebacks and valid numerical stdout.
- Automated OCR & PIL Image Inspection:
  - All 12 files verified: 1200x900 for desktop, 375x812 for mobile; H1 present; diagram present; 0 "Loading…" text; 0 "Sign in" popup text.
- Memory check:
  - `free -h` showed 3.8 GiB available (< 5.0 GiB threshold); full production static build deferred to CI per repository 8 GB RAM rule.

### 3. Commit Hashes on `search-rank-rec`
- `3ef7b705`: `feat(viz): add calculation helpers and interactive explorers for batch-3 recommenders`
- `c9407574`: `feat(docs): add recommendation foundations, matrix factorization, and deep recommenders chapters`
- `3fbc7353`: `fix(docs): make matrix factorization runnable code snippet self-contained`
- `2a6ffb4f`: `test(evidence): add complete 12 screenshot matrix for batch-3 chapters`
