# Batch 4 implementation brief — exploration, feedback loops, system design, integration

## Objective

Finish plan pages 10–11 and the promised final integration for Search, Ranking & Recommendations. Preserve existing routes and teach from existing bandit/system-design material by linking to it rather than duplicating whole chapters.

## Before writing

- Read the original plan and Codex review plus Learn/writing-voice/visual-learning/visualization/ui-design/ship-gate/tracker skills.
- Read `src/content/docs/reinforcement-learning/bandits.mdx`, `src/content/docs/ml-system-design/case-studies.mdx`, `src/content/docs/ml-system-design/overview.mdx`, and all existing search-ranking-recommendations chapters. Existing pages already cover UCB/Thompson/IPS, recommendation feedback loops, cold start, and recommendation system design. New chapters must synthesize the full search/recommendation context, add a distinct worked end-to-end design/experiment, and link to detailed existing derivations.

## Required pages

1. `exploration-feedback-loops.mdx`, sidebar position 12: recommender exposure feedback, popularity bias, exploration/exploitation and contextual-bandit policy, freshness, diversity/fairness tradeoffs, counterfactual logging/IPS and offline/online validation. Use one hand-checkable small contextual decision example across prose, visual and code. Link to `/docs/reinforcement-learning/bandits` for full algorithms and regret derivations.
2. `search-recommendation-system-design.mdx`, sidebar position 13: a worked end-to-end system-design interview scenario covering requirements, candidate generation, retrieval/ranking/reranking, data/feature freshness, offline/online evaluation, latency/availability budgets, monitoring, retraining and failure handling. Label all proposed numbers as explicit design assumptions or derived budgets, not measured benchmarks. Include one architecture/latency/failure visual with meaningful control/step interaction and a small runnable calculation where useful. Link to existing ML system design and earlier track mechanisms.

## Final section integration

- Update `overview.mdx` roadmap/next links for dedicated TF-IDF, BM25, semantic/hybrid, three recommender chapters, exploration and system design.
- Add direct incoming links from batch-1 evaluation metrics to semantic/hybrid search and from overview candidate generation to semantic/hybrid search (batch-2 report’s deferred suggestions).
- Review incoming existing pages cited by the original plan: add concise cross-links from `machine-learning/learning-to-rank.mdx`, `machine-learning/recommender-systems.mdx`, `llms-genai/rag.mdx`, and `reinforcement-learning/bandits.mdx` to the new focused track pages where pedagogically appropriate. Keep old routes fully working. Avoid mass edits; use only necessary links and record any omitted integration with reason.
- Ensure sidebar positions are sequential 1–13, section metadata page count matches, page metadata is regenerated. Check all track page descriptions (120–160 chars), all Next links, and no stale BM25 combined-page link text.

## Learn and visual standards

Apply `.agents/skills/learn-page.md`, visualization, visual-learning, writing-voice, ui-design and ship-gate. Use ELI5 first, PredictFirst, concrete worked example, runnable stdlib/NumPy snippets verified in Pyodide, source-backed claims, failures/fixes, When Not to Use, Remember, Next and 5+ primary/official sources. Keep visuals token-based, accessible, keyboard operable, responsive, and checked at 1200/375 in light/dark. Add focused interaction tests.

## Allowed files

- `AGENT_TRACKER.md`
- This brief and one `search-ranking-recommendations-batch-4-fix-N.md` if review requires it
- The two new chapter MDX files
- `src/content/docs/search-ranking-recommendations/{overview,ranking-evaluation-metrics,tf-idf,bm25,semantic-and-hybrid-search,ranking-fundamentals,learning-to-rank,text-search-bm25,recommendation-foundations,matrix-factorization-embeddings,deep-recommenders}.mdx` only for final section link/order integration
- `src/content/docs/{machine-learning/learning-to-rank,machine-learning/recommender-systems,llms-genai/rag,reinforcement-learning/bandits}.mdx` only for concise incoming cross-links
- new visualization/helper source/tests under `src/viz/diagrams/` and `src/viz/lib/`
- generated `src/data/pageMeta.generated.json`, `src/data/sectionMeta.ts` if needed
- `docs/evidence/search-ranking-recommendations/batch-4/`

Do not edit unrelated files or push. If integration needs broader scope, document it and stop.

## Verification

Run metadata generation, check:mdx, links, typecheck, full Vitest, banned phrase grep, tracker validation, diff check, browser/Pyodide interactions and screenshots (4 per visual, verify overflow/readiness). Prefix every heavy/browser command with `flock /tmp/nm-heavy.lock`; one at a time. Build only if `free -g` reports >=5 GiB available; otherwise defer and state exact available memory. Review every changed file against this list. Commit in small steps and complete `## Report from agy

### 1. What was done

- **Built Mathematical Calculation Libraries & Unit Tests**:
  - `src/viz/lib/explorationFeedback.ts`: LinUCB contextual decision calculations with confidence bounds, Inverse Propensity Scoring (IPS, Clipped IPS, SNIPS), and exposure feedback dynamics.
  - `src/viz/lib/explorationFeedback.test.ts`: 5 unit tests covering LinUCB, IPS estimators, and feedback simulation.
  - `src/viz/lib/searchSystemDesign.ts`: Multi-stage p99 latency budget evaluation against SLA, 4-tier resilience fallback ladder, and Little's Law QPS / hardware capacity sizing.
  - `src/viz/lib/searchSystemDesign.test.ts`: 4 unit tests covering SLA budget summation, degradation ladder monotonicity, and capacity planning.
- **Built Interactive Educational Visualizers**:
  - `src/viz/diagrams/ExplorationFeedbackLoopExplorer.tsx`: 3-tab interactive visualizer for LinUCB contextual decision boundaries with parameter sliders ($\alpha$, context $[x_1, x_2]$), Counterfactual IPS off-policy evaluator with clipping threshold slider, and 20-round exposure feedback popularity dynamics.
  - `src/viz/diagrams/ExplorationFeedbackLoopExplorer.test.tsx`: 3 unit tests verifying tab switching, arm cards, and estimator updates.
  - `src/viz/diagrams/SearchSystemDesignExplorer.tsx`: 3-tab interactive visualizer for Multi-Stage Latency Budget breakdown with SLA margin slider, 4-tier Resilience Fallback Ladder with active path inspection, and Scale & Capacity Planner with peak QPS / CPU utilization controls.
  - `src/viz/diagrams/SearchSystemDesignExplorer.test.tsx`: 3 unit tests verifying latency breakdown, fallback level selection, and capacity calculations.
- **Authored Chapter 12: `exploration-feedback-loops.mdx`** (sidebar position 12, description: 148 chars):
  - ELI5 plain-English analogy at top.
  - PredictFirst active recall challenge for arm uncertainty.
  - Detailed sections: Recommender exposure feedback & filter bubbles; Contextual LinUCB formulation; Single hand-checkable worked decision example with 3 arms and context $x = [0.8, 0.4]$ identical across prose, code, and visual; Freshness & temporal decay; Intra-slate diversity (MMR, DPP) & exposure fairness; GoDeeper proof of unbiased off-policy evaluation via Inverse Propensity Scoring (IPS, Clipped IPS, SNIPS); Common Problems & Fixes table; When Not to Use table; Remember table; Runnable Python snippet with NumPy running in Pyodide; 6 primary academic sources with URLs.
- **Authored Chapter 13: `search-recommendation-system-design.mdx`** (sidebar position 13, description: 156 chars):
  - ELI5 plain-English analogy at top.
  - PredictFirst active recall challenge for early candidate filtering.
  - Detailed sections: End-to-end interview scenario with explicit pedagogical design assumptions (50M catalog, 20M DAU, 5000 peak QPS); 100ms p99 SLA latency budget allocation across 6 funnel stages (Gateway 5ms, Retrieval 25ms, Filtering 10ms, Ranking 40ms, Reranking 10ms, Egress 10ms); Parallel multi-channel candidate generation (BM25, Two-Tower HNSW, Co-occurrence); Dual feature store architecture (Redis KV + Iceberg Lakehouse) enforcing point-in-time correctness to prevent training-serving skew; GoDeeper derivation of server capacity via Little's Law ($L = \lambda W$); 4-level resilience degradation ladder (Level 1 Normal, Level 2 Light Ranker, Level 3 Cached Slate, Level 4 Static Top-Sellers); Common Problems & Fixes table; When Not to Use table; Remember table; Runnable Python snippet in Pyodide; 6 primary industry and academic sources with URLs.
- **Completed Final Section Integration**:
  - `overview.mdx`: Added direct incoming links from stage descriptions to dedicated TF-IDF, BM25, semantic/hybrid search, recommenders, exploration, and system design; added 13-chapter Track Roadmap.
  - `ranking-evaluation-metrics.mdx`: Added incoming candidate generation link to semantic/hybrid search; updated Next link to `recommendation-foundations.mdx`.
  - `deep-recommenders.mdx`: Updated Next link to `exploration-feedback-loops.mdx`.
  - Added concise cross-track incoming links to the new track from:
    - `src/content/docs/machine-learning/learning-to-rank.mdx`
    - `src/content/docs/machine-learning/recommender-systems.mdx`
    - `src/content/docs/llms-genai/rag.mdx`
    - `src/content/docs/reinforcement-learning/bandits.mdx`
  - Verified sequential sidebar positions 1–13 across all track chapters.
  - Verified description lengths across all 13 track chapters (all strictly between 120 and 160 characters).
  - Verified zero stale BM25 combined-page links across codebase.
  - Updated `src/data/sectionMeta.ts` (`pageCount`: 91 -> 93).
  - Regenerated page metadata via `node scripts/generate-page-meta.mjs` (1991 pages, 44 categories).
- **Captured Complete 8-Screenshot Matrix & Pyodide Verification**:
  - Saved to `docs/evidence/search-ranking-recommendations/batch-4/`.
  - Desktop (1200x900) and mobile (375x812) across light and dark themes for both new chapters.
  - Verified visible H1, visible diagram, 0 loading placeholders, 0 sign-in overlays, and 0 mobile horizontal overflow (`scrollWidth === 375px <= 375px`).
  - Executed and verified both in-browser Pyodide RunnableCode snippets with 0 errors.
  - OCR verified all 8 screenshot images.
- **Pre-Flight & Task Tracking**:
  - Maintained `AGENT_TRACKER.md` row and validated with `npm run check:tracker`.

### 2. Exact commands and outputs

1. `npm run check:tracker`
   - Output: `check-agent-tracker: AGENT_TRACKER.md is valid, structured, and properly maintained.` (Exit code 0)
2. `node scripts/generate-page-meta.mjs`
   - Output: `generate-page-meta: wrote 28 blog posts to src/data/blogMeta.generated.json`, `generate-page-meta: wrote 1991 pages, 44 categories to src/data/pageMeta.generated.json` (Exit code 0)
3. `flock /tmp/nm-heavy.lock npm run check:mdx`
   - Output: `check-mdx-compile: 2019 files, 0 failed.` (Exit code 0)
4. `flock /tmp/nm-heavy.lock npm run check:links`
   - Output: `check-internal-links: scanned 1991 MDX file(s), found 2147 valid route(s). check-internal-links: no broken internal prose links found. check-anchor-links: no broken anchor links found.` (Exit code 0)
5. `flock /tmp/nm-heavy.lock npm run typecheck`
   - Output: `tsc -b` (Exit code 0)
6. Focused visual and calculation test suite:
   - Command: `npx vitest run src/viz/lib/explorationFeedback.test.ts src/viz/lib/searchSystemDesign.test.ts src/viz/diagrams/ExplorationFeedbackLoopExplorer.test.tsx src/viz/diagrams/SearchSystemDesignExplorer.test.tsx`
   - Output: `Test Files 4 passed (4), Tests 15 passed (15)` (Exit code 0)
7. Full Vitest test suite:
   - Command: `flock /tmp/nm-heavy.lock npx vitest run`
   - Output: `Test Files 225 passed (225), Tests 1136 passed (1136)` (Exit code 0)
8. Banned phrase grep across all touched files:
   - Output: 0 occurrences found (Exit code 1 on negative match)
9. Description length validation:
   - Output: All 13 chapters in `src/content/docs/search-ranking-recommendations/` have descriptions between 120 and 160 characters.
10. Screenshot & Pyodide audit:
   - 8 composite screenshots captured in `docs/evidence/search-ranking-recommendations/batch-4/`:
     - `exploration-feedback-loops-light-desktop.png` (1200x900)
     - `exploration-feedback-loops-dark-desktop.png` (1200x900)
     - `exploration-feedback-loops-light-mobile.png` (375x812, scrollWidth 375px, 0 overflow)
     - `exploration-feedback-loops-dark-mobile.png` (375x812, scrollWidth 375px, 0 overflow)
     - `search-recommendation-system-design-light-desktop.png` (1200x900)
     - `search-recommendation-system-design-dark-desktop.png` (1200x900)
     - `search-recommendation-system-design-light-mobile.png` (375x812, scrollWidth 375px, 0 overflow)
     - `search-recommendation-system-design-dark-mobile.png` (375x812, scrollWidth 375px, 0 overflow)
   - In-browser Pyodide snippets executed successfully without errors or tracebacks.
   - Pytesseract OCR verified visible headings and diagram elements with 0 loading placeholders.

### 3. Commits

- `ba4e8645`: `feat(viz): add calculation helpers and interactive explorers for batch-4 exploration and system design`
- `dd13b3c1`: `feat(docs): add exploration and system design chapters with cross-track integration`
- `b7355b6e`: `test(evidence): add 8-screenshot matrix for batch-4 exploration and system design`
- Follow-up tracker/brief commit to follow.

### 4. What could not be done

- Full static build (`NODE_OPTIONS="--max-old-space-size=6144" npm run build`) was deferred per the mandatory 8 GB RAM rule: `free -h` reported 4.0 GiB available (`free -g` integer: 3 GiB available), which is below the required $\ge 5\text{ GiB}$ threshold. Static build is deferred to CI.
- No push to remote was executed (per instructions: "Never push").` with exact outputs and commit hashes. Never push.

## Report from agy

### 1. What was done

- **Built Mathematical Calculation Libraries & Unit Tests**:
  - `src/viz/lib/explorationFeedback.ts`: LinUCB contextual decision calculations with confidence bounds, Inverse Propensity Scoring (IPS, Clipped IPS, SNIPS), and exposure feedback dynamics.
  - `src/viz/lib/explorationFeedback.test.ts`: 5 unit tests covering LinUCB, IPS estimators, and feedback simulation.
  - `src/viz/lib/searchSystemDesign.ts`: Multi-stage p99 latency budget evaluation against SLA, 4-tier resilience fallback ladder, and Little's Law QPS / hardware capacity sizing.
  - `src/viz/lib/searchSystemDesign.test.ts`: 4 unit tests covering SLA budget summation, degradation ladder monotonicity, and capacity planning.
- **Built Interactive Educational Visualizers**:
  - `src/viz/diagrams/ExplorationFeedbackLoopExplorer.tsx`: 3-tab interactive visualizer for LinUCB contextual decision boundaries with parameter sliders ($\alpha$, context $[x_1, x_2]$), Counterfactual IPS off-policy evaluator with clipping threshold slider, and 20-round exposure feedback popularity dynamics.
  - `src/viz/diagrams/ExplorationFeedbackLoopExplorer.test.tsx`: 3 unit tests verifying tab switching, arm cards, and estimator updates.
  - `src/viz/diagrams/SearchSystemDesignExplorer.tsx`: 3-tab interactive visualizer for Multi-Stage Latency Budget breakdown with SLA margin slider, 4-tier Resilience Fallback Ladder with active path inspection, and Scale & Capacity Planner with peak QPS / CPU utilization controls.
  - `src/viz/diagrams/SearchSystemDesignExplorer.test.tsx`: 3 unit tests verifying latency breakdown, fallback level selection, and capacity calculations.
- **Authored Chapter 12: `exploration-feedback-loops.mdx`** (sidebar position 12, description: 148 chars):
  - ELI5 plain-English analogy at top.
  - PredictFirst active recall challenge for arm uncertainty.
  - Detailed sections: Recommender exposure feedback & filter bubbles; Contextual LinUCB formulation; Single hand-checkable worked decision example with 3 arms and context $x = [0.8, 0.4]$ identical across prose, code, and visual; Freshness & temporal decay; Intra-slate diversity (MMR, DPP) & exposure fairness; GoDeeper proof of unbiased off-policy evaluation via Inverse Propensity Scoring (IPS, Clipped IPS, SNIPS); Common Problems & Fixes table; When Not to Use table; Remember table; Runnable Python snippet with NumPy running in Pyodide; 6 primary academic sources with URLs.
- **Authored Chapter 13: `search-recommendation-system-design.mdx`** (sidebar position 13, description: 156 chars):
  - ELI5 plain-English analogy at top.
  - PredictFirst active recall challenge for early candidate filtering.
  - Detailed sections: End-to-end interview scenario with explicit pedagogical design assumptions (50M catalog, 20M DAU, 5000 peak QPS); 100ms p99 SLA latency budget allocation across 6 funnel stages (Gateway 5ms, Retrieval 25ms, Filtering 10ms, Ranking 40ms, Reranking 10ms, Egress 10ms); Parallel multi-channel candidate generation (BM25, Two-Tower HNSW, Co-occurrence); Dual feature store architecture (Redis KV + Iceberg Lakehouse) enforcing point-in-time correctness to prevent training-serving skew; GoDeeper derivation of server capacity via Little's Law ($L = \lambda W$); 4-level resilience degradation ladder (Level 1 Normal, Level 2 Light Ranker, Level 3 Cached Slate, Level 4 Static Top-Sellers); Common Problems & Fixes table; When Not to Use table; Remember table; Runnable Python snippet in Pyodide; 6 primary industry and academic sources with URLs.
- **Completed Final Section Integration**:
  - `overview.mdx`: Added direct incoming links from stage descriptions to dedicated TF-IDF, BM25, semantic/hybrid search, recommenders, exploration, and system design; added 13-chapter Track Roadmap.
  - `ranking-evaluation-metrics.mdx`: Added incoming candidate generation link to semantic/hybrid search; updated Next link to `recommendation-foundations.mdx`.
  - `deep-recommenders.mdx`: Updated Next link to `exploration-feedback-loops.mdx`.
  - Added concise cross-track incoming links to the new track from:
    - `src/content/docs/machine-learning/learning-to-rank.mdx`
    - `src/content/docs/machine-learning/recommender-systems.mdx`
    - `src/content/docs/llms-genai/rag.mdx`
    - `src/content/docs/reinforcement-learning/bandits.mdx`
  - Verified sequential sidebar positions 1–13 across all track chapters.
  - Verified description lengths across all 13 track chapters (all strictly between 120 and 160 characters).
  - Verified zero stale BM25 combined-page links across codebase.
  - Updated `src/data/sectionMeta.ts` (`pageCount`: 91 -> 93).
  - Regenerated page metadata via `node scripts/generate-page-meta.mjs` (1991 pages, 44 categories).
- **Captured Complete 8-Screenshot Matrix & Pyodide Verification**:
  - Saved to `docs/evidence/search-ranking-recommendations/batch-4/`.
  - Desktop (1200x900) and mobile (375x812) across light and dark themes for both new chapters.
  - Verified visible H1, visible diagram, 0 loading placeholders, 0 sign-in overlays, and 0 mobile horizontal overflow (`scrollWidth === 375px <= 375px`).
  - Executed and verified both in-browser Pyodide RunnableCode snippets with 0 errors.
  - OCR verified all 8 screenshot images.
- **Pre-Flight & Task Tracking**:
  - Maintained `AGENT_TRACKER.md` row and validated with `npm run check:tracker`.

### 2. Exact commands and outputs

1. `npm run check:tracker`
   - Output: `check-agent-tracker: AGENT_TRACKER.md is valid, structured, and properly maintained.` (Exit code 0)
2. `node scripts/generate-page-meta.mjs`
   - Output: `generate-page-meta: wrote 28 blog posts to src/data/blogMeta.generated.json`, `generate-page-meta: wrote 1991 pages, 44 categories to src/data/pageMeta.generated.json` (Exit code 0)
3. `flock /tmp/nm-heavy.lock npm run check:mdx`
   - Output: `check-mdx-compile: 2019 files, 0 failed.` (Exit code 0)
4. `flock /tmp/nm-heavy.lock npm run check:links`
   - Output: `check-internal-links: scanned 1991 MDX file(s), found 2147 valid route(s). check-internal-links: no broken internal prose links found. check-anchor-links: no broken anchor links found.` (Exit code 0)
5. `flock /tmp/nm-heavy.lock npm run typecheck`
   - Output: `tsc -b` (Exit code 0)
6. Focused visual and calculation test suite:
   - Command: `npx vitest run src/viz/lib/explorationFeedback.test.ts src/viz/lib/searchSystemDesign.test.ts src/viz/diagrams/ExplorationFeedbackLoopExplorer.test.tsx src/viz/diagrams/SearchSystemDesignExplorer.test.tsx`
   - Output: `Test Files 4 passed (4), Tests 15 passed (15)` (Exit code 0)
7. Full Vitest test suite:
   - Command: `flock /tmp/nm-heavy.lock npx vitest run`
   - Output: `Test Files 225 passed (225), Tests 1136 passed (1136)` (Exit code 0)
8. Banned phrase grep across all touched files:
   - Output: 0 occurrences found (Exit code 1 on negative match)
9. Description length validation:
   - Output: All 13 chapters in `src/content/docs/search-ranking-recommendations/` have descriptions between 120 and 160 characters.
10. Screenshot & Pyodide audit:
   - 8 composite screenshots captured in `docs/evidence/search-ranking-recommendations/batch-4/`:
     - `exploration-feedback-loops-light-desktop.png` (1200x900)
     - `exploration-feedback-loops-dark-desktop.png` (1200x900)
     - `exploration-feedback-loops-light-mobile.png` (375x812, scrollWidth 375px, 0 overflow)
     - `exploration-feedback-loops-dark-mobile.png` (375x812, scrollWidth 375px, 0 overflow)
     - `search-recommendation-system-design-light-desktop.png` (1200x900)
     - `search-recommendation-system-design-dark-desktop.png` (1200x900)
     - `search-recommendation-system-design-light-mobile.png` (375x812, scrollWidth 375px, 0 overflow)
     - `search-recommendation-system-design-dark-mobile.png` (375x812, scrollWidth 375px, 0 overflow)
   - In-browser Pyodide snippets executed successfully without errors or tracebacks.
   - Pytesseract OCR verified visible headings and diagram elements with 0 loading placeholders.

### 3. Commits

- `ba4e8645`: `feat(viz): add calculation helpers and interactive explorers for batch-4 exploration and system design`
- `dd13b3c1`: `feat(docs): add exploration and system design chapters with cross-track integration`
- `b7355b6e`: `test(evidence): add 8-screenshot matrix for batch-4 exploration and system design`
- Follow-up tracker/brief commit to follow.

### 4. What could not be done

- Full static build (`NODE_OPTIONS="--max-old-space-size=6144" npm run build`) was deferred per the mandatory 8 GB RAM rule: `free -h` reported 4.0 GiB available (`free -g` integer: 3 GiB available), which is below the required $\ge 5\text{ GiB}$ threshold. Static build is deferred to CI.
- No push to remote was executed (per instructions: "Never push").
