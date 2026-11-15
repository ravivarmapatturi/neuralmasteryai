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

Run metadata generation, check:mdx, links, typecheck, full Vitest, banned phrase grep, tracker validation, diff check, browser/Pyodide interactions and screenshots (4 per visual, verify overflow/readiness). Prefix every heavy/browser command with `flock /tmp/nm-heavy.lock`; one at a time. Build only if `free -g` reports >=5 GiB available; otherwise defer and state exact available memory. Review every changed file against this list. Commit in small steps and complete `## Report from agy` with exact outputs and commit hashes. Never push.

## Report from agy
