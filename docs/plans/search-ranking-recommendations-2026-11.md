# Plan: new Learn section "Search, Ranking & Recommendations" (HIGH PRIORITY)

Owner: Claude (plan, final review, ship). Senior engineer: Codex (verify, briefs, run agy, review, report). Implementer: agy.
Worktree: `neuralmastery/platform-vite-srr`, branch `search-rank-rec`. Only Claude pushes.
**Priority:** owner asked for this immediately. It goes to the front of Codex's queue, ahead of the video clips.

## Why

Search, ranking and recommendations power every big product (Google, Amazon, YouTube, Spotify, LinkedIn) and are a staple of ML system-design interviews. We have scattered pieces (`machine-learning/learning-to-rank.mdx`, `machine-learning/recommender-systems.mdx`, `llms-genai/retrieval-and-reranking-architectures.mdx`, `reinforcement-learning/bandits.mdx`, the ml-system-design recommendations case study) but no single path that builds the whole field from first principles. The owner wants one section that teaches every major technique, algorithm and metric simply, with clear visuals.

## Owner's sources (read them; teach from first principles, never copy text)

- https://www.linkedin.com/pulse/search-ranking-evaluation-metrics-kailash-thiyagarajan/
- https://pyterrier-tutorial.github.io/
- https://medium.com/data-science-at-microsoft/search-and-ranking-for-information-retrieval-ir-5f9ca52dd056
- https://pub.towardsai.net/search-ranking-with-machine-learning-learning-to-rank-a-complete-introduction-517819b360f2
- https://www.systemdesignhandbook.com/guides/search-ranking-system-design/
- https://www.nvidia.com/en-in/glossary/recommendation-system/

Primary papers to cite where relevant: BM25 (Robertson), PageRank, RankNet/LambdaRank/LambdaMART (Burges), matrix factorization (Koren et al. 2009), Wide & Deep (2016), YouTube DNN (Covington 2016), two-tower retrieval, DPR, ColBERT, DLRM, NDCG (Järvelin & Kekäläinen 2002).

## Section structure (new folder `src/content/docs/search-ranking-recommendations/`)

1. **Overview and roadmap**: the shared pipeline: candidate generation → filtering → ranking → re-ranking/business rules → serving, with one interactive pipeline diagram; how search and recommendations differ (query vs no query) and where they meet.
2. **Text search from first principles**: tokenization, inverted index, boolean retrieval, TF-IDF, **BM25** (worked numbers, sliders for k1 and b), query expansion, spelling/fuzzy matching.
3. **Semantic and hybrid search**: embeddings, dense retrieval (bi-encoder/DPR), ANN indexes (HNSW, IVF, PQ) at an intuitive level, hybrid lexical+dense fusion (reciprocal rank fusion), late interaction (ColBERT), cross-encoder re-ranking.
4. **Ranking fundamentals**: relevance signals, features, click models and position bias; **link analysis (PageRank)** with an interactive graph.
5. **Learning to Rank**: pointwise, pairwise (RankNet), listwise (LambdaRank, LambdaMART, ListNet); what the gradient does to a ranked list (visual).
6. **Evaluation metrics** (interactive calculator: drag results, see every metric change): Precision@k, Recall@k, MRR, MAP, **DCG/NDCG** with graded relevance, hit rate, coverage, diversity, novelty, serendipity; offline vs online (A/B tests, interleaving, CTR, dwell time, conversion); metric pitfalls.
7. **Recommendation foundations**: content-based filtering, user–user and item–item collaborative filtering, cold start, implicit vs explicit feedback.
8. **Matrix factorization and embeddings**: SVD/ALS/BPR intuition with a small interactive factorization; implicit feedback.
9. **Deep recommenders**: two-tower retrieval, Wide & Deep, DLRM/DeepFM, sequence models (SASRec/BERT4Rec style), graph-based recs at an intuitive level.
10. **Exploration and feedback loops**: bandits for recommendations (link existing bandits page), popularity bias, filter bubbles, fairness, freshness.
11. **System design: building search and recommendation at scale**: latency budgets, multi-stage funnels with real-looking (labelled illustrative) numbers, feature stores, caching, retraining, monitoring; one worked end-to-end design.

Each page: follows `.agents/skills/learn-page/SKILL.md` and the attention-transformers bar (ELI5 at top, PredictFirst, at least one interactive visual built with `useVizTokens` and the visualization skill, worked example with real numbers, `RunnableCode` NumPy snippet where useful, GoDeeper for derivations, "When not to use"), narrative prose per `writing-voice`, white notebook + Kalam look. Reuse existing visuals where they fit; build proper ones where missing (BM25 sliders, ANN/HNSW intuition, metric calculator, MF visual, funnel).

## Integration

- Add the section to the sidebar and `src/data/sectionMeta.ts`; regenerate page meta.
- Link from and to the existing pages listed above; Codex decides whether those existing pages move into the new section or stay and cross-link (no broken links, keep old URLs working with redirects if moved).
- Interview questions for this section are a later plan.

## Batching

Codex splits this into agy briefs of about 3 pages each, in this order: (1) pages 1, 2, 6 (overview, BM25, metrics: the core), (2) 3, 4, 5, (3) 7, 8, 9, (4) 10, 11 + integration. Codex reports to Claude after **each batch** so pages can ship in waves instead of waiting for all 11.

## Done when (per batch)

`npm run check:mdx`, `npm run check:links`, typecheck, the touched vitest files and any visual tests pass; every interactive visual checked at 1200 px and 375 px in light and dark (contact sheets in the report, not videos); every number computed or cited; Codex reviewed every page against the learn-page skill; report in `docs/plans/search-ranking-recommendations-report-batch-N.md`.
